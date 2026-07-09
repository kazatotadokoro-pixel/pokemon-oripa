// api/check-benefit-code.js
// 特典コードの有効性を確認するだけの読み取り専用API（消費はしない）。
// 実際の消費（使用済みにする処理）は購入完了時にstripe-webhook.jsで行う。

import { adminDb } from "./_firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }
  const { code } = req.body || {};
  const t = String(code || "").trim().toUpperCase();
  if (!t) return res.status(400).json({ error: "コードを入力してください" });

  try {
    const snap = await adminDb.collection("benefitCodes").doc(t).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "このコードは無効または期限切れです" });
    }
    const d = snap.data();
    if (!d.active) {
      return res.status(400).json({ error: "このコードは無効または期限切れです" });
    }
    if (d.expiresAt && d.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: "このコードは期限切れです" });
    }
    if (d.maxUses && (d.usedCount || 0) >= d.maxUses) {
      return res.status(400).json({ error: "このコードは利用上限に達しました" });
    }
    return res.status(200).json({ ok: true, discount: d.discount });
  } catch (err) {
    console.error("check-benefit-code error:", err);
    return res.status(500).json({ error: "確認に失敗しました" });
  }
}
