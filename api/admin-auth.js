// api/admin-auth.js
// 管理画面の第2認証。Firebaseログインに加えて管理者パスワードを検証する。
// パスワードはVercelの環境変数 ADMIN_PASSWORD にのみ存在し、フロントには置かない。
import { adminAuth, adminDb } from "./_firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ受け付けます" });
  }
  try {
    const { idToken, password } = req.body || {};
    if (!idToken) return res.status(401).json({ error: "ログインが必要です" });

    // 1) 本人確認
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: "認証に失敗しました" });
    }

    // 2) 管理者かどうか(adminsコレクション)をサーバー側でも確認
    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ error: "管理者ではありません" });
    }

    // 3) 管理者パスワードの照合
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: "サーバー設定エラー(ADMIN_PASSWORD未設定)" });
    }
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: "パスワードが違います" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("admin-auth error:", err);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}