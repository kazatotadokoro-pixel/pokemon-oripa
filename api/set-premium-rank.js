// api/set-premium-rank.js
// 管理者が特定ユーザーに「プレミア」ランク(招待制、コイン購入+10%)を個別付与/解除する。
// 管理者判定はサーバー側(Admin SDK)で行う。

import { adminAuth, adminDb } from "./_firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }

  const { idToken, targetUserId, grant } = req.body || {};

  if (!idToken) return res.status(401).json({ error: "ログインが必要です" });
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (e) {
    return res.status(401).json({ error: "認証に失敗しました" });
  }

  const uid = decoded.uid;
  const adminSnap = await adminDb.collection("admins").doc(uid).get();
  if (!adminSnap.exists) {
    return res.status(403).json({ error: "管理者のみ実行できます" });
  }

  const targetUid = String(targetUserId || "").trim();
  if (!targetUid) return res.status(400).json({ error: "対象ユーザーIDを入力してください" });
  const userRef = adminDb.collection("users").doc(targetUid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ error: "指定されたユーザーIDが見つかりません" });

  try {
    await userRef.set({ premiumRank: !!grant }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("set-premium-rank error:", err);
    return res.status(500).json({ error: "更新に失敗しました" });
  }
}
