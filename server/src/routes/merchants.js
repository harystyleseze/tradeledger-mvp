import { Router } from "express";
import db from "../db/prisma.js";
import { getMerchantHistory } from "../nomba/transactions.js";
import { lookupBank, listBanks } from "../nomba/transfers.js";
import { scoreMerchantFull, calculateAdvance } from "../scoring/engine.js";
import { getAccountBalance } from "../nomba/virtualAccounts.js";
import { getMandateStatus } from "../nomba/mandates.js";

import crypto from "crypto";
import bcrypt from "bcrypt";
import { generateToken, authenticateToken } from "../utils/auth.js";

const router = Router();

// Hardcoded fallback in case the Nomba API is unreachable (sandbox quirks)
const FALLBACK_BANKS = [
  { code: "057", name: "Zenith Bank" },
  { code: "058", name: "GTBank" },
  { code: "044", name: "Access Bank" },
  { code: "011", name: "First Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "United Bank for Africa" },
  { code: "050", name: "EcoBank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "068", name: "Standard Chartered" },
  { code: "214", name: "FCMB" },
  { code: "023", name: "Citibank" },
  { code: "215", name: "Unity Bank" },
  { code: "100033", name: "Palmpay" },
  { code: "100004", name: "OPay" },
  { code: "100040", name: "Moniepoint" },
  { code: "090267", name: "Kuda Bank" },
];

// GET /merchants/banks — dynamic bank list from Nomba with hardcoded fallback
// Must be defined BEFORE /:id to avoid route collision
router.get("/banks", async (_req, res) => {
  try {
    const banks = await listBanks();
    // Nomba returns objects with bankCode and bankName
    const formatted = banks.map((b) => ({
      code: b.bankCode ?? b.code,
      name: b.bankName ?? b.name,
    }));

    // Deduplicate banks by code to prevent React duplicate key warnings
    const uniqueBanks = Array.from(new Map(formatted.map(item => [item.code, item])).values());
    res.json({ source: "nomba", banks: uniqueBanks });
  } catch (e) {
    console.error(JSON.stringify({ type: "bank_list_error", error: e.message }));
    res.json({ source: "fallback", banks: FALLBACK_BANKS });
  }
});

// POST /merchants/login — simple login for the demo
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing email or password" });
    
    const merchant = await db.merchant.findFirst({ where: { email } });
    if (!merchant) return res.status(401).json({ error: "Invalid credentials" });
    
    // existing users might not have a password set up if they didn't run the migration correctly
    if (!merchant.passwordHash) return res.status(401).json({ error: "Please reset your password" });

    const isMatch = await bcrypt.compare(password, merchant.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    
    const token = generateToken(merchant.id);
    res.json({ merchantId: merchant.id, token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /merchants — onboard a merchant, pull transaction history, score, return offer
router.post("/", async (req, res) => {
  try {
    const { customerId: providedCustomerId, name, email, phone, bankCode, accountNumber, password } = req.body;

    if (!name || !email || !phone || !bankCode || !accountNumber || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

  let customerId = providedCustomerId;

  // 1. If no customerId provided, generate a local customer ID for the merchant
  if (!customerId) {
    customerId = `tl_merchant_${crypto.randomBytes(4).toString("hex")}`;
  }

  // 2. Verify bank account before storing
  let accountName;
  try {
    accountName = await lookupBank(bankCode, accountNumber);
  } catch (e) {
    console.error(JSON.stringify({ type: "bank_lookup_error", bankCode, error: e.message }));
    return res.status(422).json({ error: "Bank account could not be verified" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // 3. Upsert merchant (idempotent onboarding)
  let merchant;
  try {
    merchant = await db.merchant.upsert({
      where: { customerId },
      update: { name, email, phone, bankCode, accountNumber, accountName, passwordHash },
      create: { customerId, name, email, phone, bankCode, accountNumber, accountName, passwordHash },
    });
  } catch (e) {
    if (e.code === "P2002") {
       return res.status(409).json({ error: "An account with this email or ID already exists." });
    }
    throw e;
  }

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
    token: generateToken(merchant.id),
  });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Internal server error during signup" });
  }
});

// GET /merchants/:id/balance — get sub-account balance from Nomba
router.get("/:id/balance", authenticateToken, async (req, res) => {
  if (req.merchantId !== req.params.id) return res.status(403).json({ error: "Forbidden" });

  const merchant = await db.merchant.findUnique({ where: { id: req.params.id } });
  if (!merchant) return res.status(404).json({ error: "Merchant not found" });

  try {
    const balance = await getAccountBalance();
    res.json({
      merchantId: merchant.id,
      balance: {
        availableBalance: balance?.availableBalance ?? null,
        ledgerBalance: balance?.ledgerBalance ?? null,
      },
    });
  } catch (e) {
    console.error(JSON.stringify({ type: "balance_fetch_error", merchantId: merchant.id, error: e.message }));
    res.status(502).json({ error: "Could not fetch balance from Nomba" });
  }
});

// GET /merchants/:id/mandate-status — check mandate status for active advance
router.get("/:id/mandate-status", authenticateToken, async (req, res) => {
  if (req.merchantId !== req.params.id) return res.status(403).json({ error: "Forbidden" });

  const advance = await db.advance.findFirst({
    where: { merchantId: req.params.id, status: { notIn: ["settled"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!advance) return res.json({ hasMandateId: false });

  try {
    const status = await getMandateStatus(advance.mandateId);
    res.json({
      mandateId: advance.mandateId,
      hasMandateId: true,
      mandateStatus: status?.status ?? "unknown",
      mandateDetails: status,
    });
  } catch (e) {
    // Sandbox doesn't support mandates — degrade gracefully
    res.json({ mandateId: advance.mandateId, hasMandateId: true, mandateStatus: "unavailable" });
  }
});

// GET /merchants/:id — get merchant with latest score and active advance
router.get("/:id", authenticateToken, async (req, res) => {
  if (req.merchantId !== req.params.id) return res.status(403).json({ error: "Forbidden" });

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

// PUT /merchants/:id — update merchant profile and bank details
router.put("/:id", authenticateToken, async (req, res) => {
  const merchantId = req.params.id;
  if (req.merchantId !== merchantId) return res.status(403).json({ error: "Forbidden" });

  const { name, email, phone, bankCode, accountNumber } = req.body;

  if (!name || !email || !phone || !bankCode || !accountNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = await db.merchant.findUnique({ where: { id: merchantId } });
  if (!existing) return res.status(404).json({ error: "Merchant not found" });

  let accountName = existing.accountName;

  // If bank details changed, we must re-verify them with Nomba
  if (existing.bankCode !== bankCode || existing.accountNumber !== accountNumber) {
    try {
      accountName = await lookupBank(bankCode, accountNumber);
    } catch (e) {
      console.error(JSON.stringify({ type: "bank_lookup_error", bankCode, error: e.message }));
      return res.status(422).json({ error: "New bank account could not be verified" });
    }
  }

  const updated = await db.merchant.update({
    where: { id: merchantId },
    data: { name, email, phone, bankCode, accountNumber, accountName },
  });

  res.json(updated);
});

export default router;
