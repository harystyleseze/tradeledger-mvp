import cron from "node-cron";
import db from "../db/prisma.js";
import { nombaRequest } from "../nomba/auth.js";
import { toNombaDate, subDays } from "../nomba/transactions.js";

export async function runReconciliation() {
  const yesterday = toNombaDate(subDays(new Date(), 1));
  console.log(JSON.stringify({ type: "reconciliation_start", date: yesterday }));

  const nombaData = await nombaRequest(
    "GET",
    `/transactions?dateFrom=${yesterday}&dateTo=${yesterday}`
  );
  const nTxns = nombaData.data?.transactions ?? [];

  const localRepayments = await db.repayment.findMany({
    where: {
      createdAt: {
        gte: new Date(`${yesterday}T00:00:00.000Z`),
        lt: new Date(`${yesterday}T23:59:59.999Z`),
      },
      status: "success",
    },
  });

  const localRefs = new Set(localRepayments.map((r) => r.mandateDebitRef));

  let orphans = 0;
  for (const t of nTxns) {
    if (!localRefs.has(t.merchantTxRef)) {
      orphans++;
      console.error(JSON.stringify({
        type: "reconciliation_orphan",
        merchantTxRef: t.merchantTxRef,
        amount: t.amount,
      }));
    }
  }

  console.log(JSON.stringify({
    type: "reconciliation_complete",
    date: yesterday,
    nombaCount: nTxns.length,
    localCount: localRepayments.length,
    orphans,
  }));
}

// Nightly at 2 AM WAT (1 AM UTC)
export function startReconciliationJob() {
  cron.schedule("0 1 * * *", runReconciliation, { timezone: "UTC" });
}
