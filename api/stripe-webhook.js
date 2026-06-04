import Stripe from 'stripe';
import { adminDb } from './_firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe Webhookは生のリクエストボディ（raw body）で署名検証する必要があるため、
// Vercelの自動JSONパースを無効化する
export const config = {
  api: {
    bodyParser: false,
  },
};

// raw bodyを読み取るヘルパー
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    // 署名を検証して、本当にStripeからの正規の通知かを確認する
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook署名検証エラー:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // 決済が完了したイベントだけ処理する
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const coins = parseInt(session.metadata?.coins, 10);

    if (!userId || !coins || isNaN(coins)) {
      console.error('metadataが不正:', session.metadata);
      return res.status(400).json({ error: 'metadataが不正です' });
    }

    try {
      // 二重付与を防ぐ: このセッションをまだ処理していない場合のみ付与する
      const eventRef = adminDb.collection('processedSessions').doc(session.id);
      const userRef = adminDb.collection('users').doc(userId);

      await adminDb.runTransaction(async (tx) => {
        const eventSnap = await tx.get(eventRef);
        if (eventSnap.exists) {
          // すでに処理済み。何もしない
          return;
        }
        // コインを加算（incrementで競合に強い形にする）
        tx.set(userRef, {
          coins: FieldValue.increment(coins),
          totalIssued: FieldValue.increment(coins),
        }, { merge: true });
        // 処理済みとして記録
        tx.set(eventRef, {
          userId,
          coins,
          processedAt: FieldValue.serverTimestamp(),
        });
      });

      console.log(`コイン付与成功: user=${userId}, coins=${coins}`);
    } catch (err) {
      console.error('コイン付与エラー:', err.message);
      return res.status(500).json({ error: 'コイン付与に失敗しました' });
    }
  }

  // Stripeには必ず200を返す（受領確認）
  res.status(200).json({ received: true });
}
