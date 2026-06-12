// api/draw.js
// サーバー側でガチャを引く。コインの確認・抽選・在庫減算を全部ここで行う。
// フロントは「このパックを引きたい」とリクエストするだけ。
// コインと在庫の数字はサーバー(Admin SDK)だけが変更できる。
//
// パック1・5：案A = サーバー共有デッキ方式
//   Firestore の packs/pack{id} に deck(カード配列) と cursor を持ち、
//   全ユーザーがこの1個のデッキを共有して順番に引く。
//   → 「全○口・SAR1枚確定」が本当に成立する。次の当たり位置も漏れない。
// パック2〜4：確率方式(POOLS)。今は未使用だが将来用に残す。

import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";

const db = adminDb;

// ===== 確率方式パック（2〜4。今は未使用） =====
const POOLS = {
  2: [
    { name: "ピカチュウ ex", rarity: "SAR", chance: 1 },
    { name: "ライチュウ ex", rarity: "SR", chance: 4 },
    { name: "マスカーニャ ex", rarity: "RR", chance: 10 },
    { name: "コライドン", rarity: "R", chance: 13 },
    { name: "ニャオハ", rarity: "U", chance: 25 },
    { name: "クワッス", rarity: "C", chance: 47 },
  ],
  3: [
    { name: "リザードン ex", rarity: "SAR", chance: 2 },
    { name: "ミュウ ex", rarity: "SR", chance: 6 },
    { name: "リザードン", rarity: "RR", chance: 16 },
    { name: "ブーバー", rarity: "R", chance: 38 },
    { name: "ヤキニク", rarity: "R", chance: 38 },
  ],
  4: [
    { name: "リーリエ SAR", rarity: "SAR", chance: 0.1 },
    { name: "アセロラ SAR", rarity: "SAR", chance: 0.1 },
    { name: "クワガノン V SAR", rarity: "SAR", chance: 0.1 },
    { name: "ミュウ V SAR", rarity: "SR", chance: 1 },
    { name: "フリーザー V SR", rarity: "SR", chance: 1 },
    { name: "ルナアーラ V SR", rarity: "SR", chance: 1 },
    { name: "ピクシー V SR", rarity: "SR", chance: 1 },
    { name: "トゲキッス V RR", rarity: "RR", chance: 5 },
    { name: "クレセリア RR", rarity: "RR", chance: 5 },
    { name: "サーナイト RR", rarity: "RR", chance: 5 },
    { name: "ハピナス R", rarity: "R", chance: 30 },
    { name: "ピクシー R", rarity: "R", chance: 30 },
    { name: "マリルリ C", rarity: "C", chance: 80 },
    { name: "ハネッコ C", rarity: "C", chance: 80 },
  ],
};

// パックの価格（サーバー側でも持つ。フロントの数字は信用しない）
const PACK_PRICES = { 1: 300, 2: 300, 3: 300, 4: 300, 5: 300 };

// 共有デッキを使うパック
const DECK_PACKS = new Set([1, 5]);

// ===== 確率方式の抽選（パック2〜4用） =====
function drawByChance(packId) {
  const pool = POOLS[packId];
  const total = pool.reduce((s, c) => s + c.chance, 0);
  let rv = Math.random() * total;
  for (const c of pool) {
    rv -= c.chance;
    if (rv <= 0) return { name: c.name, rarity: c.rarity };
  }
  const last = pool[pool.length - 1];
  return { name: last.name, rarity: last.rarity };
}

// ===== ハンドラ本体 =====
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }

  try {
    const { idToken, packId, count } = req.body || {};

    // 1) 本人確認
    if (!idToken) return res.status(401).json({ error: "ログインが必要です" });
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: "認証に失敗しました" });
    }
    const uid = decodedToken.uid;

    // 2) 入力チェック
    const pid = Number(packId);
    const drawCount = Math.max(1, Math.min(100, Number(count) || 1)); // 1〜100連
    const price = PACK_PRICES[pid];
    const isDeck = DECK_PACKS.has(pid);
    if (!price || (!isDeck && !POOLS[pid])) {
      return res.status(400).json({ error: "不正なパックです" });
    }
    const totalCost = price * drawCount;

    const userRef = db.collection("users").doc(uid);
    let cards = [];
    let remaining = null;

    if (isDeck) {
      // ===== 案A：共有デッキ方式（パック1・5）=====
      const packRef = db.collection("packs").doc("pack" + pid);

      await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw { code: "no-user" };
        const coins = userSnap.data().coins || 0;

        const packSnap = await tx.get(packRef);
        if (!packSnap.exists) throw { code: "no-pack" };
        const pdata = packSnap.data();
        const deck = pdata.deck;
        const cursor = pdata.cursor || 0;

        if (!Array.isArray(deck)) throw { code: "no-deck" };

        // 在庫(=デッキの引ける残り)
        const left = deck.length - cursor;
        if (left <= 0) throw { code: "soldout" };

        // 残り口数より多くは引けない（10連で残り3ならエラー）
        if (drawCount > left) throw { code: "not-enough-stock", left };

        // コイン確認
        if (coins < totalCost) throw { code: "insufficient", need: totalCost };

        // デッキの cursor から drawCount 枚を取る
        cards = deck.slice(cursor, cursor + drawCount);

        // cursor を進める / コインを減らす / remaining を更新
        const newCursor = cursor + drawCount;
        remaining = deck.length - newCursor;
        tx.update(packRef, { cursor: newCursor, remaining });
        tx.update(userRef, {
          coins: FieldValue.increment(-totalCost),
          totalIssued: FieldValue.increment(-totalCost),
        });
      });
    } else {
      // ===== 確率方式（パック2〜4。今は未使用）=====
      await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw { code: "no-user" };
        const coins = userSnap.data().coins || 0;
        if (coins < totalCost) throw { code: "insufficient", need: totalCost };

        cards = [];
        for (let i = 0; i < drawCount; i++) cards.push(drawByChance(pid));

        tx.update(userRef, {
          coins: FieldValue.increment(-totalCost),
          totalIssued: FieldValue.increment(-totalCost),
        });
      });
    }

    // 最新の残高を返す（フロントは表示するだけ）
    const after = await userRef.get();
    return res.status(200).json({
      ok: true,
      cards,
      coins: after.data().coins,
      remaining, // デッキパックのみ数値、それ以外は null
    });
  } catch (err) {
    const map = {
      "insufficient": [400, `コインが足りません（必要: ${err.need || ""}）`],
      "soldout": [400, "完売しました"],
      "not-enough-stock": [400, `残り口数が足りません（残り: ${err.left || 0}）`],
      "no-user": [404, "ユーザーが見つかりません"],
      "no-pack": [404, "パックが見つかりません"],
      "no-deck": [500, "デッキが初期化されていません"],
    };
    if (err && map[err.code]) {
      const [status, msg] = map[err.code];
      return res.status(status).json({ error: msg });
    }
    console.error("draw error:", err);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}
