import Stripe from 'stripe';
import { adminAuth, adminDb } from './_firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { computeRankGrant } from './_rankGrant.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// サーバー側で管理する正規のコインプラン（フロントのPLANSと一致させる）
const VALID_PLANS = {
  100: 100,
  500: 500,
  1000: 1000,
  2000: 2000,
  3000: 3000,
  5000: 5000,
  10000: 10000,
  30000: 30000,
  50000: 50000,
  100000: 100000,
  300000: 300000,
  500000: 500000,
  1000000: 1000000,
};

const SITE_URL = 'https://oripaluck.jp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coins, code, idToken } = req.body;

  // 1. IDトークンの検証（本人確認 + メール認証チェック）
  if (!idToken) {
    return res.status(401).json({ error: 'ログインが必要です' });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: '認証に失敗しました。再度ログインしてください' });
  }

  if (!decoded.email_verified) {
    return res.status(403).json({ error: 'メール認証が完了していません' });
  }

  const userId = decoded.uid;

  // 2. コイン数が正規プランに存在するか
  const basePrice = VALID_PLANS[coins];
  if (!basePrice) {
    return res.status(400).json({ error: '不正なコインプランです' });
  }

  // 3. 特典コードの検証とサーバー側での金額計算
  //    クライアントの言い分（割引率）はそのまま信用せず、Firestoreに登録された
  //    本物のコードを都度引き直して割引率を決める。
  let finalPrice = basePrice;
  let appliedDiscount = 0;
  let appliedCode = null;
  if (code) {
    const t = String(code).trim().toUpperCase();
    const codeSnap = await adminDb.collection('benefitCodes').doc(t).get();
    if (!codeSnap.exists) {
      return res.status(400).json({ error: 'このコードは無効または期限切れです' });
    }
    const cd = codeSnap.data();
    if (!cd.active) {
      return res.status(400).json({ error: 'このコードは無効または期限切れです' });
    }
    if (cd.expiresAt && cd.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: 'このコードは期限切れです' });
    }
    if (cd.maxUses && (cd.usedCount || 0) >= cd.maxUses) {
      return res.status(400).json({ error: 'このコードは利用上限に達しました' });
    }
    if (cd.perUserOnce && Array.isArray(cd.usedByUsers) && cd.usedByUsers.includes(userId)) {
      return res.status(400).json({ error: 'このコードはすでに使用済みです' });
    }
    if (Array.isArray(cd.allowedUserIds) && !cd.allowedUserIds.includes(userId)) {
      return res.status(403).json({ error: 'このコードは使用できません' });
    }
    finalPrice = Math.floor(basePrice * (1 - cd.discount / 100));
    appliedDiscount = cd.discount;
    appliedCode = t;
  }

  // 3.5 100%OFF(¥0)の場合、Stripeは¥0の決済セッションを作れないため、
  //     決済をスキップして直接コインを付与する(オーナー専用コードなどを想定)
  if (finalPrice === 0) {
    try {
      const userRef = adminDb.collection('users').doc(userId);
      const codeRef = adminDb.collection('benefitCodes').doc(appliedCode);
      let granted = 0;
      await adminDb.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const buyer = userSnap.exists ? userSnap.data() : {};
        const { bonusCoins, rankUpBonusCoins, rankUpdates } = computeRankGrant(buyer, coins);
        granted = coins + bonusCoins + rankUpBonusCoins;
        tx.set(userRef, {
          coins: FieldValue.increment(granted),
          totalIssued: FieldValue.increment(coins),
          ...rankUpdates,
        }, { merge: true });
        tx.set(codeRef, {
          usedCount: FieldValue.increment(1),
          usedByUsers: FieldValue.arrayUnion(userId),
        }, { merge: true });
      });
      return res.status(200).json({ url: null, freeGrant: true, coins: granted });
    } catch (err) {
      console.error('無料付与エラー:', err);
      return res.status(500).json({ error: 'コインの付与に失敗しました' });
    }
  }

  // 4. サーバーが決めた金額でStripeセッションを作成
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `${coins}コイン`,
            description: 'ポケモンオリパ コイン',
          },
          unit_amount: finalPrice,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${SITE_URL}/?purchase=success`,
      cancel_url: `${SITE_URL}/`,
      // コイン付与はWebhookで行うため、付与に必要な情報をmetadataに記録
      metadata: {
        userId,
        coins: String(coins),
        discount: String(appliedDiscount),
        code: appliedCode || '',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
