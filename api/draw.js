// api/draw.js
// サーバー側でガチャを引く。コインの確認・抽選・在庫減算・カード記録を全部ここで行う。
//
// 【きっちり版】引いたカードを users/{uid}/cards サブコレクションに記録する。
//   各カード: {name,rarity,prizeRank,packId,status:"unopened",drawnAt,redeemValue}
//   status: unopened(未処理) → redeemed(還元済) / shipped(発送済)
//   これにより redeem.js が「本当に持っているカードか」を検証できる。

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

const PACK_PRICES = { 1: 300, 2: 300, 3: 300, 4: 300, 5: 300 };

// 還元額（等級ごと。フロントと一致させること）
const REDEEM_VALUE = { "1等": 10000, "2等": 2000, "3等": 1000, "ハズレ": 1 };
function redeemValueOf(card) {
  if (card.prizeRank && REDEEM_VALUE[card.prizeRank] != null) return REDEEM_VALUE[card.prizeRank];
  return 1;
}

const DECK_PACKS = new Set([1, 5]);

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

// 引いたカードを users/{uid}/cards に記録する（トランザクション内で呼ぶ）
function recordCards(tx, userRef, cards, pid) {
  const cardsCol = userRef.collection("cards");
  const now = FieldValue.serverTimestamp();
  const ids = [];
  for (const c of cards) {
    const cardRef = cardsCol.doc();
    tx.set(cardRef, {
      name: c.name || "",
      rarity: c.rarity || "",
      prizeRank: c.prizeRank || "",
      desc: c.desc || "",
      packId: pid,
      status: "unopened",
      redeemValue: redeemValueOf(c),
      drawnAt: now,
    });
    ids.push(cardRef.id);
  }
  return ids;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }

  try {
    const { idToken, packId, count } = req.body || {};

    if (!idToken) return res.status(401).json({ error: "ログインが必要です" });
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: "認証に失敗しました" });
    }
    const uid = decodedToken.uid;

    const pid = Number(packId);
    const drawCount = Math.max(1, Math.min(100, Number(count) || 1));
    const price = PACK_PRICES[pid];
    const isDeck = DECK_PACKS.has(pid);
    if (!price || (!isDeck && !POOLS[pid])) {
      return res.status(400).json({ error: "不正なパックです" });
    }
    const totalCost = price * drawCount;

    const userRef = db.collection("users").doc(uid);
    let cards = [];
    let remaining = null;
    let cardIds = [];

    if (isDeck) {
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

        const left = deck.length - cursor;
        if (left <= 0) throw { code: "soldout" };
        if (drawCount > left) throw { code: "not-enough-stock", left };
        if (coins < totalCost) throw { code: "insufficient", need: totalCost };

        cards = deck.slice(cursor, cursor + drawCount);

        const newCursor = cursor + drawCount;
        remaining = deck.length - newCursor;
        tx.update(packRef, { cursor: newCursor, remaining });
        tx.update(userRef, {
          coins: FieldValue.increment(-totalCost),
          totalIssued: FieldValue.increment(-totalCost),
        });
        cardIds = recordCards(tx, userRef, cards, pid);
      });
    } else {
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
        cardIds = recordCards(tx, userRef, cards, pid);
      });
    }

    const after = await userRef.get();
    return res.status(200).json({
      ok: true,
      cards,
      coins: after.data().coins,
      remaining,
      cardIds,
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
