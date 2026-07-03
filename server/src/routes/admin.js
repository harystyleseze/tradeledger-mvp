import { Router } from "express";
import db from "../db/prisma.js";
import { runReconciliation } from "../jobs/reconciliation.js";
import { runRevenueReview } from "../jobs/revenueReview.js";

const router = Router();

// GET /admin/advances — portfolio overview
router.get("/advances", async (req, res) => {
  const advances = await db.advance.findMany({
    include: {
      merchant: { select: { name: true, email: true } },
      repayments: { where: { status: "success" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const portfolio = advances.map((a) => {
    const totalRepaid = a.repayments.reduce((sum, r) => sum + r.amount, 0);
    return {
      id: a.id,
      merchant: a.merchant.name,
      email: a.merchant.email,
      amountNaira: a.amount / 100,
      balanceNaira: a.balance / 100,
      totalRepaidNaira: totalRepaid / 100,
      progressPercent: Math.round((totalRepaid / a.amount) * 100),
      status: a.status,
      createdAt: a.createdAt,
    };
  });

  res.json({ count: portfolio.length, advances: portfolio });
});

// POST /admin/reconcile — manual trigger for demo
router.post("/reconcile", async (req, res) => {
  res.json({ message: "Reconciliation started" });
  runReconciliation().catch((e) =>
    console.error(JSON.stringify({ type: "reconciliation_error", error: e.message }))
  );
});

// POST /admin/revenue-review — manual trigger for demo
router.post("/revenue-review", async (req, res) => {
  res.json({ message: "Revenue review started" });
  runRevenueReview().catch((e) =>
    console.error(JSON.stringify({ type: "revenue_review_error", error: e.message }))
  );
});

// GET /admin/webhooks — recent webhook event stream for integration debugging and demo
router.get("/webhooks", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? "50", 10), 200);
  const eventFilter = req.query.event;

  const events = await db.webhookEvent.findMany({
    where: eventFilter ? { event: eventFilter } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({
    count: events.length,
    events: events.map((e) => ({
      id: e.id,
      event: e.event,
      requestId: e.requestId,
      processed: e.processed,
      createdAt: e.createdAt,
      summary: extractEventSummary(e),
    })),
  });
});

// GET /admin/unmatched-payments — payments that arrived at unknown NUBANs
router.get("/unmatched-payments", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? "50", 10), 200);

  const payments = await db.unmatchedPayment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({
    count: payments.length,
    payments: payments.map((p) => ({
      id: p.id,
      nombaAccountId: p.nombaAccountId,
      amountKobo: p.amount,
      amountNaira: p.amount / 100,
      senderName: p.senderName ?? null,
      senderAccount: p.senderAccount ?? null,
      createdAt: p.createdAt,
    })),
  });
});

// GET /admin/checkout-failures — failed checkout payment events
router.get("/checkout-failures", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? "50", 10), 200);

  const failures = await db.checkoutFailure.findMany({
    include: { merchant: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const byReason = failures.reduce((acc, f) => {
    const r = f.failureReason ?? "unknown";
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    count: failures.length,
    byReason,
    failures: failures.map((f) => ({
      id: f.id,
      merchant: f.merchant.name,
      merchantId: f.merchantId,
      orderId: f.orderId ?? null,
      amountKobo: f.amount ?? null,
      amountNaira: f.amount ? f.amount / 100 : null,
      failureReason: f.failureReason ?? "unknown",
      createdAt: f.createdAt,
    })),
  });
});

// GET /admin/buyer-reputation/:senderAccount — cross-merchant payment behavior for a given bank account
// This is the network-effect query: same buyer paying multiple TradeLedger merchants
router.get("/buyer-reputation/:senderAccount", async (req, res) => {
  const { senderAccount } = req.params;

  const payments = await db.buyerPayment.findMany({
    where: { senderAccountNumber: senderAccount },
    include: {
      buyerAccount: {
        include: { merchant: { select: { id: true, name: true } } },
      },
    },
    orderBy: { receivedAt: "desc" },
  });

  if (payments.length === 0) {
    return res.status(404).json({ error: "No payment history found for this account number" });
  }

  const merchantMap = new Map();
  let totalPaid = 0;
  const breakdown = { exact: 0, under: 0, over: 0 };

  for (const p of payments) {
    totalPaid += p.amount;
    breakdown[p.reconciliationStatus] = (breakdown[p.reconciliationStatus] ?? 0) + 1;

    const mid = p.buyerAccount.merchant.id;
    if (!merchantMap.has(mid)) {
      merchantMap.set(mid, {
        merchantId: mid,
        merchantName: p.buyerAccount.merchant.name,
        paymentCount: 0,
        totalPaidKobo: 0,
      });
    }
    const m = merchantMap.get(mid);
    m.paymentCount++;
    m.totalPaidKobo += p.amount;
  }

  const shortfallRate = payments.length > 0
    ? Math.round((breakdown.under / payments.length) * 100)
    : 0;

  res.json({
    senderAccount,
    totalPayments: payments.length,
    merchantCount: merchantMap.size,
    totalPaidKobo: totalPaid,
    totalPaidNaira: totalPaid / 100,
    shortfallRate: `${shortfallRate}%`,
    reconciliation: breakdown,
    merchants: Array.from(merchantMap.values()).map((m) => ({
      ...m,
      totalPaidNaira: m.totalPaidKobo / 100,
    })),
    recentPayments: payments.slice(0, 5).map((p) => ({
      merchantName: p.buyerAccount.merchant.name,
      amountKobo: p.amount,
      amountNaira: p.amount / 100,
      reconciliationStatus: p.reconciliationStatus,
      shortfall: p.shortfall ?? null,
      receivedAt: p.receivedAt,
    })),
  });
});

// GET /admin/recurring-failures — failed tokenized card charge events
router.get("/recurring-failures", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? "50", 10), 200);

  const failures = await db.recurringFailure.findMany({
    include: { merchant: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const dunningCases = failures.filter((f) => f.consecutiveFailures >= 3);

  res.json({
    count: failures.length,
    dunningCaseCount: dunningCases.length,
    failures: failures.map((f) => ({
      id: f.id,
      merchant: f.merchant.name,
      merchantId: f.merchantId,
      tokenId: f.tokenId,
      amountKobo: f.amount ?? null,
      amountNaira: f.amount ? f.amount / 100 : null,
      failureReason: f.failureReason ?? "unknown",
      consecutiveFailures: f.consecutiveFailures,
      dunningTriggered: f.consecutiveFailures >= 3,
      createdAt: f.createdAt,
    })),
  });
});

function extractEventSummary(event) {
  const d = event.payload?.data ?? {};
  switch (event.event) {
    case "virtual_account.funded":
      return { amount: d.amountReceived, sender: d.senderName, accountId: d.accountId };
    case "mandate.debit_success":
      return { amount: d.amount, mandateId: d.mandateId };
    case "transfer.success":
    case "transfer.failed":
      return { amount: d.amount, ref: d.merchantTxRef ?? d.reference };
    case "payment_success":
      return { amount: d.amount, orderId: d.orderId, merchantId: d.merchantId };
    case "tokenized_card.charge_success":
      return { amount: d.amount, tokenId: d.tokenId, merchantId: d.merchantId };
    case "payment_failure":
      return { orderId: d.orderId, merchantId: d.merchantId, reason: d.failureReason };
    case "tokenized_card.charge_failed":
      return { tokenId: d.tokenId, merchantId: d.merchantId, reason: d.failureReason };
    default:
      return {};
  }
}

export default router;
