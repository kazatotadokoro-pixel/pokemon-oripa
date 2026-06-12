// scripts/initDeck.js
// 共有デッキを Firestore に初期化する「一回限り」の管理スクリプト。
// パック1・5 の deck(160枚) と cursor(0) と remaining(160) を作って保存する。
//
// 【実行方法】Codespacesのターミナルで、リポジトリ外に鍵を置いて実行:
//   1. 新しい鍵JSONの中身を ~/key.json に保存（リポジトリ外＝gitに上がらない）
//   2. 次を実行:
//        FIREBASE_SERVICE_ACCOUNT="$(cat ~/key.json)" node scripts/initDeck.js --yes
//   3. 終わったら鍵を消す:  rm ~/key.json
//
// 【超重要】実行すると cursor が 0 に戻る = デッキ引き直し。
//   本番稼働後の再実行は厳禁（引かれたはずの当たりが復活する）。
//   本番公開前の最初の1回だけ実行すること。

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// 鍵の読み込み：_firebaseAdmin.js と同じ作法（生JSONを JSON.parse）
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// ===== デッキの中身（App.jsx の initDeck と同じ構成）=====
// 1等×1, 2等×6, 3等×13, ハズレ×140 = 合計160枚

const SAR_CARD = { name: "メガルカリオ ex", rarity: "SAR", isReal: true, prizeRank: "1等" };

const SR_CARDS = [
  { name: "メガズルズキン ex", rarity: "SAR" },
  { name: "ルリナ", rarity: "SR" },
  { name: "サイトウ", rarity: "HR" },
  { name: "ビクティニ", rarity: "AR" },
  { name: "メガカイリュー ex", rarity: "MA" },
  { name: "ナンジャモのハラバリー ex", rarity: "UR" },
];

function buildDeck() {
  const deck = [];
  deck.push({ ...SAR_CARD });                                   // 1等 ×1
  for (const c of SR_CARDS) deck.push({ ...c, isReal: true, prizeRank: "2等" }); // 2等 ×6
  // 3等 ×13（名前=なにかのカード、説明=1000円相当、レアリティ表示なし）
  // rarity は演出/タブ判定の都合で内部的に残す。hideRarity:true でフロントはバッジを出さない。
  for (let i = 0; i < 13; i++) deck.push({ name: "なにかのカード", desc: "1000円相当", rarity: "RR", prizeRank: "3等", hideRarity: true });
  // ハズレ ×140（名前=なにかのカード、説明=ノーマル、レアリティ表示なし）
  for (let i = 0; i < 140; i++) deck.push({ name: "なにかのカード", desc: "ノーマル", rarity: "C", prizeRank: "ハズレ", hideRarity: true });
  // Fisher-Yates シャッフル（偏りのない正しいシャッフル）
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

async function initPack(packId) {
  const deck = buildDeck();
  await db.collection("packs").doc("pack" + packId).set(
    { deck, cursor: 0, remaining: deck.length },
    { merge: true } // 既存の他フィールドは消さない
  );
  console.log(`pack${packId} を初期化しました（${deck.length}枚）`);
}

async function main() {
  if (process.argv[2] !== "--yes") {
    console.log("これを実行するとデッキが作り直され cursor が 0 に戻ります。");
    console.log("本番稼働後の再実行は厳禁（引かれた当たりが復活します）。");
    console.log('実行するには:  FIREBASE_SERVICE_ACCOUNT="$(cat ~/key.json)" node scripts/initDeck.js --yes');
    process.exit(0);
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("エラー: 環境変数 FIREBASE_SERVICE_ACCOUNT がありません。鍵を渡して実行してください。");
    process.exit(1);
  }
  await initPack(1);
  await initPack(5);
  console.log("完了。置いた鍵(~/key.json)は rm ~/key.json で必ず削除してください。");
  process.exit(0);
}

main().catch((e) => { console.error("初期化エラー:", e); process.exit(1); });
