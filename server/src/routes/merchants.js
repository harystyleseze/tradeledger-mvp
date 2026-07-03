import { Router } from "express";
import db from "../db/prisma.js";
import { getMerchantHistory } from "../nomba/transactions.js";
import { lookupBank } from "../nomba/transfers.js";
import { scoreMerchantFull, calculateAdvance } from "../scoring/engine.js";

const router = Router();

// POST /merchants — onboard a merchant, pull transaction history, score, return offer
router.post("/", async (req, res) => {
  const { customerId, name, email, phone, bankCode, accountNumber } = req.body;

  if (!customerId || !name || !email || !phone || !bankCode || !accountNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 1. Verify bank account before storing
  let accountName;
  try {
    accountName = await lookupBank(bankCode, accountNumber);
  } catch (e) {
    console.error(JSON.stringify({ type: "bank_lookup_error", bankCode, error: e.message }));
    return res.status(422).json({ error: "Bank account could not be verified" });
  }

  // 2. Upsert merchant (idempotent onboarding)
  const merchant = await db.merchant.upsert({
    where: { customerId },
    update: { name, email, phone, bankCode, accountNumber, accountName },
    create: { customerId, name, email, phone, bankCode, accountNumber, accountName },
  });

  // 3. Pull 90-day transaction history from Nomba
  let transactions;
  try {
    transactions = await getMerchantHistory();
  } catch (e) {
    console.error(JSON.stringify({ type: "history_fetch_error", merchantId: merchant.id, error: e.message }));
    return res.status(502).json({ error: "Could not fetch transaction history from Nomba. Try again shortly." });
  }

  // 4. Score with DVA enrichment if buyer payment data exists
  const scoreResult = await scoreMerchantFull(merchant.id, transactions);

  // 5. Compute last 7 days revenue for advance sizing
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekRevenue = Math.round(
    transactions
      .filter((t) => t.status === "success" && new Date(t.timeCreated) >= cutoff)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const hasCheckout = await db.checkoutPayment.count({ where: { merchantId: merchant.id } }).then((n) => n > 0);
  const advanceOffer = calculateAdvance(scoreResult.score, weekRevenue, scoreResult.activeBuyerCount ?? 0, hasCheckout);

  // 6. Persist score
  const score = await db.creditScore.create({
    data: {
      merchantId: merchant.id,
      score: scoreResult.score,
      eligible: scoreResult.eligible,
      breakdown: scoreResult.breakdown ?? {},
      weeklyRevenue: weekRevenue,
      reason: scoreResult.reason ?? null,
    },
  });

  res.json({
    merchantId: merchant.id,
    scoreId: score.id,
    score: scoreResult.score,
    eligible: scoreResult.eligible,
    breakdown: scoreResult.breakdown,
    advanceOffer: advanceOffer.eligible
      ? {
          amountKobo: advanceOffer.amount,
          amountNaira: advanceOffer.amount / 100,
          repaymentRate: advanceOffer.repaymentRate,
        }
      : null,
    reason: scoreResult.reason,
  });
});

// GET /merchants/:id — get merchant with latest score and active advance
router.get("/:id", async (req, res) => {
  const merchant = await db.merchant.findUnique({
    where: { id: req.params.id },
    include: {
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      advances: {
        where: { status: { notIn: ["settled"] } },
        include: { repayments: { orderBy: { createdAt: "desc" }, take: 10 } },
        take: 1,
      },
      buyerAccounts: {
        include: {
          payments: { orderBy: { receivedAt: "desc" }, take: 5 },
        },
      },
    },
  });

  if (!merchant) return res.status(404).json({ error: "Merchant not found" });

  res.json(merchant);
});

export default router;
