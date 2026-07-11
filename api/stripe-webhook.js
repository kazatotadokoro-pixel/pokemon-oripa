import Stripe from 'stripe';
import { adminDb } from './_firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// 会員ランク制度。src/App.jsx の同名定義(RANK_TIERS/PREMIUM_RANK)と合わせて変更すること。
// ランクは購入前(このイベントを処理する前)の累計課金額(totalIssued)で判定し、
// 今回の購入分やボーナス分はそのランク判定には影響させない。
const RANK_TIERS = [
  { name: "スタンダード会員", threshold: 0, bonusRate: 0 },
  { name: "ブロンズ", threshold: 100000, bonusRate: 1 },
  { name: "シルバー", threshold: 200000, bonusRate: 2 },
  { name: "ゴールド", threshold: 800000, bonusRate: 3 },
  { name: "プラチナ", threshold: 1600000, bonusRate: 4 },
  { name: "ダイヤモンド", threshold: 3000000, bonusRate: 5 },
];
const PREMIUM_BONUS_RATE = 10;
function getBonusRate(totalIssued, premiumRank) {
  if (premiumRank) return PREMIUM_BONUS_RATE;
  let rate = 0;
  for (const t of RANK_TIERS) {
    if (totalIssued >= t.threshold) rate = t.bonusRate;
  }
  return rate;
}

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
    const benefitCode = session.metadata?.code || null;

    if (!userId || !coins || isNaN(coins)) {
      console.error('metadataが不正:', session.metadata);
      return res.status(400).json({ error: 'metadataが不正です' });
    }

    try {
      // 二重付与を防ぐ: このセッションをまだ処理していない場合のみ付与する
      const eventRef = adminDb.collection('processedSessions').doc(session.id);
      const userRef = adminDb.collection('users').doc(userId);
      const codeRef = benefitCode ? adminDb.collection('benefitCodes').doc(benefitCode) : null;

      await adminDb.runTransaction(async (tx) => {
        const eventSnap = await tx.get(eventRef);
        if (eventSnap.exists) {
          // すでに処理済み。何もしない
          return;
        }
        // 購入者のデータを読む(招待報酬の判定に使う)
        const buyerSnap = await tx.get(userRef);
        const buyer = buyerSnap.exists ? buyerSnap.data() : {};

        // 特典コードを使った購入なら、その存在を確認しておく(書き込みはこの後まとめて行う)
        const codeSnap = codeRef ? await tx.get(codeRef) : null;

        // --- 招待報酬の判定 ---
        // 条件: この人が「招待されて登録」しており(invitedBy)、かつ
        //       まだ一度も招待報酬を発生させていない(inviteRewardGranted が未設定) 場合のみ。
        //       = 「招待された人の初回課金」のときだけ両者に付与する
        let inviterRef = null;
        let grantInvite = false;
        if (buyer.invitedBy && !buyer.inviteRewardGranted) {
          const candidate = adminDb.collection('users').doc(buyer.invitedBy);
          const inviterSnap = await tx.get(candidate);
          if (inviterSnap.exists) {
            const inviter = inviterSnap.data();
            // 招待した人の招待成立数が上限(10)未満のときだけ報酬を出す
            const cnt = inviter.inviteCount || 0;
            if (cnt < 10) {
              inviterRef = candidate;
              grantInvite = true;
            }
          }
        }

        // 会員ランクのボーナスコインを計算(購入前の累計課金額で判定。ボーナス分はtotalIssuedに加算しない)
        const bonusRate = getBonusRate(buyer.totalIssued || 0, !!buyer.premiumRank);
        const bonusCoins = Math.floor(coins * bonusRate / 100);

        // 購入コイン+ランクボーナスを加算
        const updates = {
          coins: FieldValue.increment(coins + bonusCoins),
          totalIssued: FieldValue.increment(coins),
        };
        if (grantInvite) {
          // 招待された人(購入者)に招待限定コイン1 + 報酬済みフラグ
          updates.inviteCoins = FieldValue.increment(1);
          updates.inviteRewardGranted = true;
        }
        tx.set(userRef, updates, { merge: true });

        if (grantInvite && inviterRef) {
          // 招待した人にも招待限定コイン1 + 招待成立数+1
          tx.set(inviterRef, {
            inviteCoins: FieldValue.increment(1),
            inviteCount: FieldValue.increment(1),
          }, { merge: true });
        }

        // 特典コードを実際に使用済みにする(決済完了が確定した、この時点で初めて消費する)
        if (codeRef && codeSnap && codeSnap.exists) {
          tx.set(codeRef, {
            usedCount: FieldValue.increment(1),
            usedByUsers: FieldValue.arrayUnion(userId),
          }, { merge: true });
        }

        // 処理済みとして記録
        tx.set(eventRef, {
          userId,
          coins,
          bonusCoins,
          inviteGranted: grantInvite,
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
