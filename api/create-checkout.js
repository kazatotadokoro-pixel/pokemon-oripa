import Stripe from 'stripe';
import { adminAuth } from './_firebaseAdmin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// サーバー側で管理する正規のコインプラン（フロントのPLANSと一致させる）
const VALID_PLANS = {
  500: 500,
  1000: 1000,
  2000: 2000,
  3000: 3000,
  5000: 5000,
  10000: 10000,
};

// サーバー側で許可する正規の割引率（フロントのBENEFIT_CODESの値と一致させる）
const VALID_DISCOUNTS = [10, 20, 30];

const SITE_URL = 'https://oripaluck.jp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coins, discount, idToken } = req.body;

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

  // 3. 割引率の検証とサーバー側での金額計算
  let finalPrice = basePrice;
  let appliedDiscount = 0;
  if (discount && discount > 0) {
    if (!VALID_DISCOUNTS.includes(discount)) {
      return res.status(400).json({ error: '不正な割引です' });
    }
    finalPrice = Math.floor(basePrice * (1 - discount / 100));
    appliedDiscount = discount;
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
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
