// api/redeem.js
// カード還元をサーバー側で行う。フロントはカードIDの一覧を送るだけ。
// サーバーが所有とstatusを検証し、還元額もサーバーが決める。
import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";

const db = adminDb;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }
  try {
    const { idToken, cardIds } = req.body || {};
    if (!idToken) return res.status(401).json({ error: "ログインが必要です" });
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: "認証に失敗しました" });
    }
    const uid = decoded.uid;

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: "還元するカードが指定されていません" });
    }
    if (cardIds.length > 200) {
      return res.status(400).json({ error: "一度に還元できるのは200枚までです" });
    }
    const ids = [...new Set(cardIds.map(String))];

    const userRef = db.collection("users").doc(uid);
    const cardsCol = userRef.collection("cards");
    let gained = 0;
    let redeemedCount = 0;

    await db.runTransaction(async (tx) => {
      const refs = ids.map((id) => cardsCol.doc(id));
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      let sum = 0;
      const toRedeem = [];
      for (let i = 0; i < snaps.length; i++) {
        const snap = snaps[i];
        if (!snap.exists) continue;
        const data = snap.data();
        if (data.status !== "unopened") continue;
        const v = typeof data.redeemValue === "number" ? data.redeemValue : 1;
        sum += v;
        toRedeem.push(refs[i]);
      }
      if (toRedeem.length === 0) {
        throw { code: "nothing", message: "還元できるカードがありませんでした" };
      }
      const now = FieldValue.serverTimestamp();
      for (const r of toRedeem) {
        tx.update(r, { status: "redeemed", redeemedAt: now });
      }
      tx.update(userRef, { coins: FieldValue.increment(sum) });
      gained = sum;
      redeemedCount = toRedeem.length;
    });

    const after = await userRef.get();
    return res.status(200).json({ ok: true, redeemedCount, gained, coins: after.data().coins });
  } catch (err) {
    if (err && err.code === "nothing") {
      return res.status(400).json({ error: err.message });
    }
    console.error("redeem error:", err);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}