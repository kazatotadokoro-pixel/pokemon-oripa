import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// 環境変数からサービスアカウント情報を読み込み、一度だけ初期化する
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
