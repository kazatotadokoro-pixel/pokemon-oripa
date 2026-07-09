// api/claim-login-bonus.js
// 1日1回のログインボーナス受け取り。JST基準で「今日」を判定し、
// users/{uid}/loginBonusClaims/{YYYY-MM-DD} の存在で受け取り済みかを判定する。

import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";

const REWARD = 100;

function todayJstStr() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }
  const { idToken } = req.body || {};
  if (!idToken) return res.status(401).json({ error: "ログインが必要です" });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (e) {
    return res.status(401).json({ error: "認証に失敗しました" });
  }
  const uid = decoded.uid;
  const todayStr = todayJstStr();
  const userRef = adminDb.collection("users").doc(uid);
  const claimRef = userRef.collection("loginBonusClaims").doc(todayStr);

  try {
    await adminDb.runTransaction(async (tx) => {
      const claimSnap = await tx.get(claimRef);
      if (claimSnap.exists) throw { code: "already-claimed" };
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw { code: "no-user" };
      tx.set(claimRef, { claimedAt: FieldValue.serverTimestamp(), amount: REWARD });
      tx.update(userRef, {
        points: FieldValue.increment(REWARD),
      });
    });
    return res.status(200).json({ ok: true, points: REWARD });
  } catch (err) {
    if (err && err.code === "already-claimed") {
      return res.status(400).json({ error: "本日分は受け取り済みです" });
    }
    if (err && err.code === "no-user") {
      return res.status(404).json({ error: "ユーザーが見つかりません" });
    }
    console.error("claim-login-bonus error:", err);
    return res.status(500).json({ error: "受け取りに失敗しました" });
  }
}
