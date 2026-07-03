import { Router } from "express";
import db from "../db/prisma.js";
import { createVirtualAccount, updateVirtualAccount, expireVirtualAccount } from "../nomba/virtualAccounts.js";

const router = Router();

// POST /buyers/accounts — create a Dedicated Virtual Account for a buyer
// Optional: defaultAmountExpected (kobo) — auto-reconciles every payment against this amount
router.post("/accounts", async (req, res) => {
  const { merchantId, buyerName, defaultAmountExpected } = req.body;

  if (!merchantId || !buyerName) {
    return res.status(400).json({ error: "merchantId and buyerName are required" });
  }

  const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return res.status(404).json({ error: "Merchant not found" });

  const accountRef = `tl_buyer_${merchantId}_${Date.now()}`;

  let vaData;
  try {
    vaData = await createVirtualAccount({ accountRef, accountName: buyerName });
  } catch (e) {
    console.error(JSON.stringify({ type: "dva_create_error", merchantId, buyerName, error: e.message }));
    return res.status(502).json({ error: "Failed to create virtual account with Nomba" });
  }

  // Nomba's VA response identifies the account by our accountRef and the
  // issued NUBAN (bankAccountNumber) — there is no separate accountId field.
  const nombaVirtualAccountId = vaData.accountRef ?? vaData.accountId ?? vaData.id ?? accountRef;
  const nubanNumber = vaData.bankAccountNumber ?? vaData.accountNumber;
  if (!nubanNumber) {
    return res.status(502).json({ error: "Nomba did not return an account number" });
  }

  const buyerAccount = await db.buyerAccount.create({
    data: {
      merchantId,
      nombaVirtualAccountId,
      customerReference: buyerName,
      accountNumber: nubanNumber,
      bankCode: vaData.bankCode ?? "",
      defaultAmountExpected: defaultAmountExpected ?? null,
    },
  });

  res.status(201).json({
    buyerAccountId: buyerAccount.id,
    buyerName,
    accountNumber: buyerAccount.accountNumber,
    bankName: vaData.bankName ?? null,
    bankCode: buyerAccount.bankCode,
    nombaVirtualAccountId,
    defaultAmountExpected: buyerAccount.defaultAmountExpected ?? null,
    message: "Share this account number with your buyer to start capturing payments",
  });
});

// GET /buyers/accounts/:merchantId — list all buyer accounts with reconciliation summary
router.get("/accounts/:merchantId", async (req, res) => {
  const { merchantId } = req.params;

  const accounts = await db.buyerAccount.findMany({
    where: { merchantId },
    include: {
      payments: { orderBy: { receivedAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const summary = accounts.map((ba) => {
    const totalReceived = ba.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpected = ba.payments.reduce((sum, p) => sum + (p.amountExpected ?? p.amount), 0);
    const totalShortfall = ba.payments.reduce((sum, p) => sum + (p.shortfall ?? 0), 0);
    const totalSurplus = ba.payments.reduce((sum, p) => sum + (p.surplus ?? 0), 0);

    return {
      id: ba.id,
      buyerName: ba.customerReference,
      accountNumber: ba.accountNumber,
      bankCode: ba.bankCode,
      status: ba.status,
      closedAt: ba.closedAt ?? null,
      defaultAmountExpected: ba.defaultAmountExpected ?? null,
      totalReceivedKobo: totalReceived,
      totalReceivedNaira: totalReceived / 100,
      paymentCount: ba.payments.length,
      lastPayment: ba.payments[0]?.receivedAt ?? null,
      reconciliation: {
        totalExpectedKobo: totalExpected,
        totalReceivedKobo: totalReceived,
        totalShortfallKobo: totalShortfall,
        totalSurplusKobo: totalSurplus,
        exactPayments: ba.payments.filter((p) => p.reconciliationStatus === "exact").length,
        underpayments: ba.payments.filter((p) => p.reconciliationStatus === "under").length,
        overpayments: ba.payments.filter((p) => p.reconciliationStatus === "over").length,
      },
      payments: ba.payments.slice(0, 10).map((p) => ({
        amount: p.amount,
        amountNaira: p.amount / 100,
        payer: p.payer,
        receivedAt: p.receivedAt,
        reconciliationStatus: p.reconciliationStatus,
        shortfall: p.shortfall ?? null,
        surplus: p.surplus ?? null,
      })),
    };
  });

  res.json({ count: accounts.length, buyers: summary });
});

// GET /buyers/accounts/:merchantId/:buyerAccountId — single buyer statement with full reconciliation
router.get("/accounts/:merchantId/:buyerAccountId", async (req, res) => {
  const { merchantId, buyerAccountId } = req.params;
  const { from, to } = req.query;

  const buyerAccount = await db.buyerAccount.findFirst({
    where: { id: buyerAccountId, merchantId },
  });
  if (!buyerAccount) return res.status(404).json({ error: "Buyer account not found" });

  const paymentFilter = { buyerAccountId };
  if (from || to) {
    paymentFilter.receivedAt = {};
    if (from) paymentFilter.receivedAt.gte = new Date(from);
    if (to) paymentFilter.receivedAt.lte = new Date(to);
  }

  const payments = await db.buyerPayment.findMany({
    where: paymentFilter,
    orderBy: { receivedAt: "desc" },
  });

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = payments.reduce((sum, p) => sum + (p.amountExpected ?? p.amount), 0);
  const totalShortfall = payments.reduce((sum, p) => sum + (p.shortfall ?? 0), 0);
  const totalSurplus = payments.reduce((sum, p) => sum + (p.surplus ?? 0), 0);

  res.json({
    id: buyerAccount.id,
    buyerName: buyerAccount.customerReference,
    accountNumber: buyerAccount.accountNumber,
    bankCode: buyerAccount.bankCode,
    status: buyerAccount.status,
    closedAt: buyerAccount.closedAt ?? null,
    defaultAmountExpected: buyerAccount.defaultAmountExpected ?? null,
    createdAt: buyerAccount.createdAt,
    reconciliation: {
      totalExpectedKobo: totalExpected,
      totalReceivedKobo: totalReceived,
      totalShortfallKobo: totalShortfall,
      totalSurplusKobo: totalSurplus,
      exactPayments: payments.filter((p) => p.reconciliationStatus === "exact").length,
      underpayments: payments.filter((p) => p.reconciliationStatus === "under").length,
      overpayments: payments.filter((p) => p.reconciliationStatus === "over").length,
    },
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      amountNaira: p.amount / 100,
      amountExpected: p.amountExpected ?? null,
      payer: p.payer,
      senderAccountNumber: p.senderAccountNumber ?? null,
      receivedAt: p.receivedAt,
      reconciliationStatus: p.reconciliationStatus,
      shortfall: p.shortfall ?? null,
      surplus: p.surplus ?? null,
    })),
  });
});

// PUT /buyers/accounts/:id — rename buyer and/or update defaultAmountExpected
router.put("/accounts/:id", async (req, res) => {
  const { id } = req.params;
  const { merchantId, buyerName, defaultAmountExpected } = req.body;

  if (!merchantId) {
    return res.status(400).json({ error: "merchantId is required" });
  }

  const buyerAccount = await db.buyerAccount.findFirst({
    where: { id, merchantId },
  });
  if (!buyerAccount) return res.status(404).json({ error: "Buyer account not found" });
  if (buyerAccount.status === "closed") {
    return res.status(409).json({ error: "Cannot update a closed buyer account" });
  }

  if (buyerName && buyerName !== buyerAccount.customerReference) {
    try {
      await updateVirtualAccount(buyerAccount.nombaVirtualAccountId, { accountName: buyerName });
    } catch (e) {
      console.error(JSON.stringify({ type: "dva_rename_error", id, buyerName, error: e.message }));
      return res.status(502).json({ error: "Failed to update virtual account name with Nomba" });
    }
  }

  const updateData = {};
  if (buyerName) updateData.customerReference = buyerName;
  if (defaultAmountExpected !== undefined) updateData.defaultAmountExpected = defaultAmountExpected ?? null;

  const updated = await db.buyerAccount.update({
    where: { id },
    data: updateData,
  });

  res.json({
    id: updated.id,
    buyerName: updated.customerReference,
    accountNumber: updated.accountNumber,
    defaultAmountExpected: updated.defaultAmountExpected ?? null,
    message: "Buyer account updated successfully",
  });
});

// DELETE /buyers/accounts/:id — close buyer account (expires NUBAN on Nomba + marks closed in DB)
router.delete("/accounts/:id", async (req, res) => {
  const { id } = req.params;
  const { merchantId } = req.body;

  if (!merchantId) {
    return res.status(400).json({ error: "merchantId is required" });
  }

  const buyerAccount = await db.buyerAccount.findFirst({
    where: { id, merchantId },
  });
  if (!buyerAccount) return res.status(404).json({ error: "Buyer account not found" });

  if (buyerAccount.status !== "closed") {
    try {
      await expireVirtualAccount(buyerAccount.nombaVirtualAccountId);
    } catch (e) {
      // Treat "already expired" as idempotent; re-throw unexpected errors
      if (!e.message?.toLowerCase().includes("already")) {
        console.error(JSON.stringify({ type: "dva_expire_error", id, error: e.message }));
        return res.status(502).json({ error: "Failed to expire virtual account with Nomba" });
      }
    }

    await db.buyerAccount.update({
      where: { id },
      data: { status: "closed", closedAt: new Date() },
    });
  }

  res.status(204).end();
});

export default router;
