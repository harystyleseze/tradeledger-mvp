import cron from "node-cron";
import db from "../db/prisma.js";
import { nombaRequest } from "../nomba/auth.js";
import { fetchTransactions, toNombaDate, subDays } from "../nomba/transactions.js";

export async function runRevenueReview() {
  console.log(JSON.stringify({ type: "revenue_review_start" }));

  const activeAdvances = await db.advance.findMany({
    where: { status: "active" },
    include: { merchant: true },
  });

  for (const advance of activeAdvances) {
    try {
      const dateTo = toNombaDate(new Date());
      const dateFrom = toNombaDate(subDays(new Date(), 7));
      const txns = await fetchTransactions(dateFrom, dateTo);

      const weekRevenue = txns
        .filter((t) => t.status === "success")
        .reduce((sum, t) => sum + t.amount, 0);

      if (weekRevenue === 0) {
        await db.repayment.create({
          data: {
            advanceId: advance.id,
            amount: 0,
            weekRevenue: 0,
            mandateDebitRef: `skip_${advance.id}_${Date.now()}`,
            status: "skipped",
          },
        });

        // Auto-delinquency: check consecutive skips (most recent first)
        const DELINQUENCY_THRESHOLD = 8;
        const recentRepayments = await db.repayment.findMany({
          where: { advanceId: advance.id },
          orderBy: { createdAt: "desc" },
          take: DELINQUENCY_THRESHOLD,
        });
        let consecutiveSkips = 0;
        for (const r of recentRepayments) {
          if (r.status === "skipped") consecutiveSkips++;
          else break;
        }
        if (consecutiveSkips >= DELINQUENCY_THRESHOLD) {
          await db.advance.update({
            where: { id: advance.id },
            data: { status: "delinquent" },
          });
          console.log(JSON.stringify({
            type: "advance_delinquent",
            advanceId: advance.id,
            merchantId: advance.merchantId,
            consecutiveSkips,
            action: "manual_review_required",
          }));
        } else {
          console.log(JSON.stringify({ type: "revenue_review_skip", advanceId: advance.id, consecutiveSkips }));
        }
        continue;
      }

      const repayAmount = Math.min(
        Math.floor(weekRevenue * advance.repaymentRate),
        advance.balance
      );

      const merchantTxRef = `debit_${advance.id}_${Date.now()}`;

      await nombaRequest("POST", `/mandates/${advance.mandateId}/debit`, {
        amount: repayAmount,
        merchantTxRef,
      });

      console.log(JSON.stringify({
        type: "mandate_debit_triggered",
        advanceId: advance.id,
        weekRevenue,
        repayAmount,
        merchantTxRef,
      }));
    } catch (err) {
      console.error(JSON.stringify({
        type: "revenue_review_error",
        advanceId: advance.id,
        error: err.message,
      }));
    }
  }

  console.log(JSON.stringify({ type: "revenue_review_complete", count: activeAdvances.length }));
}

// Monday at 6 AM WAT (5 AM UTC)
export function startRevenueReviewJob() {
  cron.schedule("0 5 * * 1", runRevenueReview, { timezone: "UTC" });
}
