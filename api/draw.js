// api/draw.js
// サーバー側でガチャを引く。コインの確認・抽選・減算を全部ここで行う。
// フロントは「このパックを引きたい」とリクエストするだけ。
// コインの数字はサーバー(Admin SDK)だけが変更できる。

import admin from "firebase-admin";

// ===== Firebase Admin 初期化（二重初期化を防ぐ） =====
if (!admin.apps.length) {
  const decoded = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString()
  );
  admin.initializeApp({
    credential: admin.credential.cert(decoded),
  });
}
const db = admin.firestore();

// ===== カードデータ（App.jsx と同じ内容をサーバーにも持たせる） =====
// ※ App.jsx の POOLS / REAL_CARDS を変更したら、ここも合わせて更新すること。

const POOLS = {
  1: [
    { name: "メガルカリオ ex", rarity: "SAR", chance: 1 },
    { name: "ルナーラ ex", rarity: "SR", chance: 6 },
    { name: "ビクティニ", rarity: "RR", chance: 5 },
    { name: "カイリュー", rarity: "RR", chance: 4 },
    { name: "ゲッコウガ", rarity: "RR", chance: 4 },
    { name: "フシギバナ", rarity: "RR", chance: 30 },
    { name: "ゼニガメ", rarity: "RR", chance: 30 },
    { name: "ピカチュウ", rarity: "RR", chance: 40 },
    { name: "コダック", rarity: "RR", chance: 40 },
  ],
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

// パック1専用：実在カード（名前・レアリティだけサーバーに持たせる。画像はフロントが持つ）
// App.jsx の REAL_CARDS と一致させてある（2026-06 時点）。
// App.jsx 側でカードを増減したら、ここも合わせて更新すること。
const REAL_CARDS = {
  sar: [{ name: "メガルカリオ ex", rarity: "SAR" }],
  sr: [
    { name: "メガズルズキン ex", rarity: "SAR" },
    { name: "ルリナ", rarity: "SR" },
    { name: "サイトウ", rarity: "HR" },
    { name: "ビクティニ", rarity: "AR" },
    { name: "メガカイリュー ex", rarity: "MA" },
    { name: "ナンジャモのハラバリー ex", rarity: "UR" },
  ],
};

// パックの価格（サーバー側でも持つ。フロントの数字は信用しない）
// 現状すべて 300円。価格を変えたらここも更新すること。
const PACK_PRICES = {
  1: 300,
  2: 300,
  3: 300,
  4: 300,
  5: 300,
};

// ===== 抽選ロジック（App.jsx の drawCard をサーバーに移植） =====
function drawCard(packId) {
  if (packId === 1) {
    const availableSar = REAL_CARDS.sar;
    const availableSr = REAL_CARDS.sr;

    const sarW = availableSar.length > 0 ? 1 : 0;
    const srW = availableSr.length > 0 ? 6 : 0;
    const rrW = 13;
    const hazW = 140;
    const total = sarW + srW + rrW + hazW;

    const r = Math.random() * total;
    if (r < sarW) {
      const card = availableSar[Math.floor(Math.random() * availableSar.length)];
      return { ...card, isReal: true, prizeRank: "1等" };
    } else if (r < sarW + srW) {
      const card = availableSr[Math.floor(Math.random() * availableSr.length)];
      return { ...card, isReal: true, prizeRank: "2等" };
    } else if (r < sarW + srW + rrW) {
      return { name: "なにかのRRカード", rarity: "RR", prizeRank: "3等" };
    } else {
      return { name: "なにかのRRカード", rarity: "RR", prizeRank: "ハズレ" };
    }
  }

  const pool = POOLS[packId];
  const total2 = pool.reduce((s, c) => s + c.chance, 0);
  let rv = Math.random() * total2;
  for (const c of pool) {
    rv -= c.chance;
    if (rv <= 0) return c;
  }
  return pool[pool.length - 1];
}

// ===== ハンドラ本体 =====
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }

  try {
    const { idToken, packId, count } = req.body || {};

    // 1) 本人確認：フロントから送られた idToken を検証して uid を得る
    if (!idToken) {
      return res.status(401).json({ error: "ログインが必要です" });
    }
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: "認証に失敗しました" });
    }
    const uid = decodedToken.uid;

    // 2) 入力チェック
    const pid = Number(packId);
    const drawCount = Math.max(1, Math.min(10, Number(count) || 1)); // 1〜10連まで
    const price = PACK_PRICES[pid];
    if (!price || !(POOLS[pid] || pid === 1)) {
      return res.status(400).json({ error: "不正なパックです" });
    }
    const totalCost = price * drawCount;

    // 3) トランザクションで「残高確認 → 抽選 → 減算」を不可分に行う
    const userRef = db.collection("users").doc(uid);
    let cards = [];

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        throw { code: "no-user", message: "ユーザーが見つかりません" };
      }
      const data = snap.data();
      const currentCoins = data.coins || 0;

      if (currentCoins < totalCost) {
        throw {
          code: "insufficient",
          message: `コインが足りません（必要: ${totalCost}）`,
        };
      }

      // 抽選（サーバー側で実行）
      cards = [];
      for (let i = 0; i < drawCount; i++) {
        cards.push(drawCard(pid));
      }

      // コイン減算（サーバーだけが書き込む）
      tx.update(userRef, {
        coins: admin.firestore.FieldValue.increment(-totalCost),
      });
    });

    // 4) 結果を返す。新しい残高も返す（フロントは表示するだけ）
    const after = await userRef.get();
    return res.status(200).json({
      ok: true,
      cards,
      coins: after.data().coins,
    });
  } catch (err) {
    if (err && err.code === "insufficient") {
      return res.status(400).json({ error: err.message });
    }
    if (err && err.code === "no-user") {
      return res.status(404).json({ error: err.message });
    }
    console.error("draw error:", err);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}
