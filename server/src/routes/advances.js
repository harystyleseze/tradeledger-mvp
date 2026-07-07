import { Router } from "express";
import db from "../db/prisma.js";
import { createMandate } from "../nomba/mandates.js";
import { createSubAccount, getSubAccountBalance } from "../nomba/subaccounts.js";
import { disburseLoan } from "../nomba/transfers.js";
import { calculateAdvance } from "../scoring/engine.js";
import { toNombaDate } from "../nomba/transactions.js";
import { authenticateToken } from "../utils/auth.js";

const router = Router();

// POST /advances/apply — apply for an advance after scoring
router.post("/apply", authenticateToken, async (req, res) => {
  const { merchantId, scoreId } = req.body;

  if (req.merchantId !== merchantId) return res.status(403).json({ error: "Forbidden" });

  if (!merchantId || !scoreId) {
    return res.status(400).json({ error: "merchantId and scoreId are required" });
  }

  const score = await db.creditScore.findUnique({
    where: { id: scoreId },
    include: { advance: true },
  });
  if (!score || score.merchantId !== merchantId) {
    return res.status(404).json({ error: "Score not found" });
  }
  if (!score.eligible) {
    return res.status(422).json({ error: "Merchant not eligible for advance" });
  }
  if (score.advance) {
    return res.status(409).json({ error: "Advance already exists for this score" });
  }

  const merchant = await db.merchant.findUnique({ where: { id: merchantId } });

  const advanceOffer = calculateAdvance(score.score, score.weeklyRevenue);

  // The hackathon sandbox does not implement sub-account creation (500) or the
  // mandates API (404). On sandbox only, degrade to the platform sub-account
  // issued with the credentials and a pending mandate reference so the rest of
  // the lifecycle (real disbursement transfer, webhook-driven repayment) stays
  // fully testable. Production behavior is unchanged: failures return 502.
  const isSandbox = (process.env.NOMBA_BASE_URL ?? "").includes("sandbox");

  // 1. Create escrow sub-account for this loan
  let subAccount;
  try {
    subAccount = await createSubAccount(
      `TradeLedger-${merchant.name}-${Date.now()}`,
      `tl_${merchantId}_${Date.now()}`
    );
  } catch (e) {
    if (!isSandbox) {
      console.error(JSON.stringify({ type: "advance_apply_error", merchantId, error: e.message }));
      return res.status(502).json({ error: "Could not set up the advance with Nomba. Try again shortly." });
    }
    console.warn(JSON.stringify({ type: "subaccount_sandbox_fallback", merchantId, error: e.message }));
    subAccount = { accountId: process.env.NOMBA_SUB_ACCOUNT_ID ?? "platform_subaccount" };
  }

  // 2. Create mandate (maxAmount = 25% of weekly revenue, ceiling above 15% debit rate)
  const maxAmount = Math.ceil(score.weeklyRevenue * 0.25);
  const startDate = toNombaDate(new Date());
  const endDate = toNombaDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

  let mandate;
  try {
    mandate = await createMandate({
      customerId: merchant.customerId,
      maxAmount,
      startDate,
      endDate,
    });
  } catch (e) {
    if (!isSandbox) {
      console.error(JSON.stringify({ type: "advance_apply_error", merchantId, error: e.message }));
      return res.status(502).json({ error: "Could not set up the advance with Nomba. Try again shortly." });
    }
    console.warn(JSON.stringify({ type: "mandate_sandbox_fallback", merchantId, error: e.message }));
    mandate = {
      mandateId: `mnd_sandbox_${Date.now()}`,
      consentUrl: null,
    };
  }

  // 3. Create advance record
  const advance = await db.advance.create({
    data: {
      merchantId,
      scoreId,
      mandateId: mandate.mandateId,
      subAccountId: subAccount.id ?? subAccount.accountId ?? "pending",
      amount: advanceOffer.amount,
      balance: advanceOffer.amount,
      repaymentRate: 0.15,
      status: "pending_consent",
    },
  });

  res.json({
    advanceId: advance.id,
    amount: advance.amount,
    amountNaira: advance.amount / 100,
    mandateId: advance.mandateId,
    consentUrl: mandate.consentUrl,
    status: advance.status,
  });
});

// POST /advances/:id/activate — called after merchant completes mandate consent
// In sandbox: call this manually after OTP bypass to advance state
router.post("/:id/activate", authenticateToken, async (req, res) => {
  const advance = await db.advance.findUnique({
    where: { id: req.params.id },
    include: { merchant: true },
  });

  if (!advance) return res.status(404).json({ error: "Advance not found" });
  if (advance.merchantId !== req.merchantId) return res.status(403).json({ error: "Forbidden" });
  if (advance.status !== "pending_consent") {
    return res.status(409).json({ error: `Advance is already ${advance.status}` });
  }

  // Trigger disbursement
  let merchantTxRef;
  try {
    merchantTxRef = await disburseLoan(advance, advance.merchant);
  } catch (e) {
    console.error(JSON.stringify({ type: "disbursement_error", advanceId: advance.id, error: e.message }));
    return res.status(502).json({ error: "Disbursement failed. The advance remains pending — try again shortly." });
  }

  // Log sub-account balance after disbursement initiation for observability
  getSubAccountBalance(advance.subAccountId)
    .then((bal) => console.log(JSON.stringify({
      type: "subaccount_balance",
      advanceId: advance.id,
      subAccountId: advance.subAccountId,
      availableBalance: bal?.availableBalance,
    })))
    .catch(() => {}); // non-critical — don't block the response

  res.json({
    advanceId: advance.id,
    merchantTxRef,
    message: "Disbursement initiated — transfer.success webhook will confirm",
  });
});

// GET /advances/:id — get advance with repayment history
router.get("/:id", authenticateToken, async (req, res) => {
  const advance = await db.advance.findUnique({
    where: { id: req.params.id },
    include: {
      repayments: { orderBy: { createdAt: "desc" } },
      transfers: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!advance) return res.status(404).json({ error: "Advance not found" });
  if (advance.merchantId !== req.merchantId) return res.status(403).json({ error: "Forbidden" });

  const totalRepaid = advance.repayments
    .filter((r) => r.status === "success")
    .reduce((sum, r) => sum + r.amount, 0);

  res.json({
    ...advance,
    totalRepaid,
    totalRepaidNaira: totalRepaid / 100,
    amountNaira: advance.amount / 100,
    balanceNaira: advance.balance / 100,
    progressPercent: Math.round((totalRepaid / advance.amount) * 100),
  });
});

export default router;
