// api/_rankGrant.js
// 会員ランク制度(毎月リセット式)の共通ロジック。src/App.jsx の同名定義と合わせて変更すること。
// 今のランクの閾値に届かないと翌月1ランク降格。ランクアップは購入額加算と同時に即時判定。
// 初めて到達したランクだけ一時ボーナスを付与する。

export const RANK_TIERS = [
  { name: "スタンダード会員", threshold: 0, bonusRate: 0, rankUpBonus: 0 },
  { name: "ブロンズ", threshold: 100000, bonusRate: 1, rankUpBonus: 3000 },
  { name: "シルバー", threshold: 200000, bonusRate: 2, rankUpBonus: 5000 },
  { name: "ゴールド", threshold: 800000, bonusRate: 3, rankUpBonus: 20000 },
  { name: "プラチナ", threshold: 1600000, bonusRate: 4, rankUpBonus: 40000 },
  { name: "ダイヤモンド", threshold: 3000000, bonusRate: 5, rankUpBonus: 100000 },
];
export const PREMIUM_BONUS_RATE = 10;

export function thisMonthJstStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).format(new Date());
}

export function nextMonthStr(m) {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mm, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// 保存されている(rankIdx, spendMonth, monthlySpend)を「今月」まで進め、未購入期間の降格を反映する
export function rollForwardRank(rankIdx, spendMonth, monthlySpend, nowMonth) {
  if (!spendMonth) return { idx: 0, spend: 0 };
  let idx = rankIdx || 0;
  let spend = monthlySpend || 0;
  let month = spendMonth;
  while (month < nowMonth) {
    if (spend < RANK_TIERS[idx].threshold) idx = Math.max(0, idx - 1);
    spend = 0;
    month = nextMonthStr(month);
  }
  return { idx, spend };
}

// buyer(ユーザーのFirestoreデータ)と今回の購入コイン数から、ランクボーナス・ランクアップ一時ボーナス・
// 更新後のランク状態を計算する純粋関数。Firestoreへの書き込みは呼び出し側が行う。
export function computeRankGrant(buyer, coins) {
  const nowMonth = thisMonthJstStr();
  const isPremium = !!buyer.premiumRank;
  const { idx: effIdx, spend: effSpend } = rollForwardRank(
    buyer.rankIdx, buyer.rankSpendMonth, buyer.rankMonthlySpend, nowMonth
  );
  const bonusRate = isPremium ? PREMIUM_BONUS_RATE : RANK_TIERS[effIdx].bonusRate;
  const bonusCoins = Math.floor(coins * bonusRate / 100);

  let newIdx = effIdx;
  const newSpend = effSpend + coins;
  if (!isPremium) {
    while (newIdx < RANK_TIERS.length - 1 && newSpend >= RANK_TIERS[newIdx + 1].threshold) newIdx++;
  }

  const storedMaxRankIdx = buyer.maxRankIdx || 0;
  let rankUpBonusCoins = 0;
  let newMaxRankIdx = storedMaxRankIdx;
  if (!isPremium && newIdx > storedMaxRankIdx) {
    for (let i = storedMaxRankIdx + 1; i <= newIdx; i++) rankUpBonusCoins += RANK_TIERS[i].rankUpBonus;
    newMaxRankIdx = newIdx;
  }

  const rankUpdates = isPremium ? {} : {
    rankIdx: newIdx,
    rankSpendMonth: nowMonth,
    rankMonthlySpend: newSpend,
    maxRankIdx: newMaxRankIdx,
  };

  return { bonusRate, bonusCoins, rankUpBonusCoins, rankUpdates };
}
