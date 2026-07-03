import db from "../db/prisma.js";
import { groupByDay, average, standardDeviation, longestActiveStreak } from "./helpers.js";

export function scoreMerchant(transactions) {
  if (!transactions || transactions.length === 0) {
    return { score: 0, eligible: false, reason: "insufficient_history" };
  }

  const successful = transactions.filter((t) => t.status === "success");
  if (successful.length < 10) {
    return { score: 0, eligible: false, reason: "insufficient_history" };
  }

  const dailyRevenues = groupByDay(successful);
  const days = Object.values(dailyRevenues);
  if (days.length < 7) {
    return { score: 0, eligible: false, reason: "insufficient_days" };
  }

  // 1. Revenue Mean (30pts): ₦20,000/day (2,000,000 kobo) = full 30pts
  const mean = average(days);
  const revenueScore = Math.min(30, (mean / 2000000) * 30);

  // 2. Consistency (20pts): lower coefficient of variation = more reliable
  const cv = mean > 0 ? standardDeviation(days) / mean : 1;
  const consistencyScore = Math.max(0, 20 * (1 - Math.min(cv, 1)));

  // 3. Operational Streak (20pts): longest consecutive active days in last 30
  const last30 = days.slice(-30);
  const streak = longestActiveStreak(last30);
  const streakScore = (streak / Math.max(last30.length, 1)) * 20;

  // 4. Growth (15pts): last half avg vs first half avg
  const mid = Math.floor(days.length / 2);
  const firstHalf = days.slice(0, mid);
  const lastHalf = days.slice(-mid);
  const avgFirst = average(firstHalf) || 1;
  const growthRate = (average(lastHalf) - avgFirst) / avgFirst;
  const growthScore = Math.min(15, Math.max(0, 15 * (1 + growthRate)));

  // 5. Channel Diversity (15pts): distinct source values — confirmed training field
  const activeChannels = new Set(
    successful.map((t) => t.source).filter(Boolean)
  );
  const diversityScore = Math.min(15, activeChannels.size * 5);

  const total = Math.round(
    revenueScore + consistencyScore + streakScore + growthScore + diversityScore
  );

  return {
    score: total,
    eligible: total >= 40,
    breakdown: {
      revenueScore: Math.round(revenueScore * 10) / 10,
      consistencyScore: Math.round(consistencyScore * 10) / 10,
      streakScore: Math.round(streakScore * 10) / 10,
      growthScore: Math.round(growthScore * 10) / 10,
      diversityScore,
    },
  };
}

// Async wrapper that enriches the base score with DVA buyer payment data.
// scoreMerchant() stays synchronous so existing tests continue to pass.
export async function scoreMerchantFull(merchantId, transactions) {
  const base = scoreMerchant(transactions);

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const buyerAccounts = await db.buyerAccount.findMany({
    where: { merchantId },
    include: {
      payments: {
        where: { receivedAt: { gte: ninetyDaysAgo } },
        orderBy: { receivedAt: "asc" },
      },
    },
  });

  if (buyerAccounts.length === 0) {
    return { ...base, dvaEnriched: false, activeBuyerCount: 0 };
  }

  // Dimension 6: Buyer Diversity — 5 pts per buyer with ≥2 payments, max 15
  const activeBuyers = buyerAccounts.filter((ba) => ba.payments.length >= 2);
  const buyerDiversityScore = Math.min(15, activeBuyers.length * 5);

  // Dimension 7: Receivables Regularity — low CV of payment intervals = high score, max 10
  const allPayments = buyerAccounts.flatMap((ba) => ba.payments);
  let receivablesRegularityScore = 0;
  if (allPayments.length >= 2) {
    const sorted = [...allPayments].sort(
      (a, b) => new Date(a.receivedAt) - new Date(b.receivedAt)
    );
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(new Date(sorted[i].receivedAt) - new Date(sorted[i - 1].receivedAt));
    }
    const avgInterval = average(intervals);
    const intervalCv = avgInterval > 0 ? standardDeviation(intervals) / avgInterval : 1;
    receivablesRegularityScore = Math.round(10 * (1 - Math.min(intervalCv, 1)));
  }

  // Dimension 8: Concentration Risk Penalty — -10 if top buyer > 70% of DVA revenue
  let concentrationPenalty = 0;
  const totalDVARevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
  if (totalDVARevenue > 0) {
    const revenueByBuyer = buyerAccounts.map((ba) =>
      ba.payments.reduce((sum, p) => sum + p.amount, 0)
    );
    const topBuyerRevenue = Math.max(...revenueByBuyer);
    if (topBuyerRevenue / totalDVARevenue > 0.7) concentrationPenalty = -10;
  }

  const baseScore = base.score ?? 0;
  const dvaDelta = buyerDiversityScore + receivablesRegularityScore + concentrationPenalty;
  const combinedScore = Math.min(100, Math.max(0, baseScore + dvaDelta));

  return {
    ...base,
    score: combinedScore,
    eligible: combinedScore >= 40,
    dvaEnriched: true,
    activeBuyerCount: activeBuyers.length,
    breakdown: {
      ...(base.breakdown ?? {}),
      buyerDiversityScore,
      receivablesRegularityScore,
      concentrationPenalty,
    },
  };
}

// dvaBuyerCount and hasCheckout unlock higher advance caps without changing base multiplier.
// Existing callers pass only 2 args — defaults preserve current behaviour for all tests.
export function calculateAdvance(score, weeklyRevenueKobo, dvaBuyerCount = 0, hasCheckout = false) {
  if (score < 40) return { eligible: false };

  // Score 40 → 1.2× weekly; Score 100 → 3× weekly
  const multiplier = 1.2 + ((score - 40) / 60) * 1.8;

  // Advance cap tiers
  let cap = 50000000; // ₦500K base
  if (dvaBuyerCount >= 2) cap = 100000000; // ₦1M — DVA with ≥2 confirmed buyers
  if (dvaBuyerCount >= 2 && hasCheckout) cap = 150000000; // ₦1.5M — DVA + checkout active

  const amount = Math.min(Math.floor(multiplier * weeklyRevenueKobo), cap);

  return {
    eligible: true,
    amount,
    amountNaira: amount / 100,
    repaymentRate: 0.15,
    repaymentCadence: "weekly_on_demand",
  };
}
