// api/send-message.js
// 管理者からのお知らせ（全体・個別）を送信する。管理者判定はサーバー側(Admin SDK)で行う。

import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }

  const { idToken, title, body, target, targetUserId, type } = req.body || {};

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

  const t = String(title || "").trim();
  const b = String(body || "").trim();
  if (!t || !b) return res.status(400).json({ error: "タイトルと本文を入力してください" });
  if (target !== "all" && target !== "user") {
    return res.status(400).json({ error: "宛先が不正です" });
  }
  let targetUid = null;
  if (target === "user") {
    targetUid = String(targetUserId || "").trim();
    if (!targetUid) return res.status(400).json({ error: "宛先ユーザーIDを入力してください" });
    const userSnap = await adminDb.collection("users").doc(targetUid).get();
    if (!userSnap.exists) return res.status(404).json({ error: "指定されたユーザーIDが見つかりません" });
  }
  const msgType = type === "bonus" ? "bonus" : "normal";

  try {
    const ref = await adminDb.collection("messages").add({
      title: t,
      body: b,
      target,
      targetUserId: targetUid,
      type: msgType,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: uid,
    });
    return res.status(200).json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("send-message error:", err);
    return res.status(500).json({ error: "送信に失敗しました" });
  }
}
