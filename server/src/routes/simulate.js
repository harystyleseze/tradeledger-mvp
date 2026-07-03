import { Router } from "express";
import { virtualAccountFunded } from "../webhooks/events/virtualAccountFunded.js";
import { paymentSuccess } from "../webhooks/events/paymentSuccess.js";
import { mandateDebitSuccess } from "../webhooks/events/mandateDebitSuccess.js";
import { paymentFailed } from "../webhooks/events/paymentFailed.js";
import { recurringChargeFailed } from "../webhooks/events/recurringChargeFailed.js";
import { transferSuccess } from "../webhooks/events/transferSuccess.js";

const router = Router();

// These routes are only active outside production — used for demo and sandbox testing
if (process.env.NODE_ENV !== "production") {

  // POST /simulate/va-funded — fire a synthetic virtual_account.funded event
  // Optional: amountExpected (kobo) to trigger reconciliation; senderAccountNumber for cross-merchant demo
  router.post("/va-funded", async (req, res) => {
    const { virtualAccountId, amount, amountExpected, payer, senderAccountNumber } = req.body;
    if (!virtualAccountId || !amount) {
      return res.status(400).json({ error: "virtualAccountId and amount are required" });
    }
    const event = {
      requestId: `sim_vaf_${Date.now()}`,
      event: "virtual_account.funded",
      data: {
        accountId: virtualAccountId,
        amountReceived: amount,
        amountExpected: amountExpected ?? null,
        senderName: payer ?? "Simulated Payer",
        senderAccountNumber: senderAccountNumber ?? "0000000000",
        timeCreated: new Date().toISOString(),
      },
    };
    await virtualAccountFunded(event);
    res.json({ ok: true, simulated: "virtual_account.funded", event });
  });

  // POST /simulate/payment-success — fire a synthetic checkout payment_success event
  router.post("/payment-success", async (req, res) => {
    const { merchantId, orderId, amount } = req.body;
    if (!merchantId || !orderId || !amount) {
      return res.status(400).json({ error: "merchantId, orderId, and amount are required" });
    }
    const event = {
      requestId: `sim_ps_${Date.now()}`,
      event: "payment_success",
      data: { merchantId, orderId, amount },
    };
    await paymentSuccess(event);
    res.json({ ok: true, simulated: "payment_success", event });
  });

  // POST /simulate/debit-success — fire a synthetic mandate.debit_success event
  router.post("/debit-success", async (req, res) => {
    const { mandateId, advanceId, amount, weekRevenue } = req.body;
    if (!mandateId || !advanceId || !amount) {
      return res.status(400).json({ error: "mandateId, advanceId, and amount are required" });
    }
    const event = {
      requestId: `sim_ds_${Date.now()}`,
      event: "mandate.debit_success",
      data: {
        mandateId,
        advanceId,
        amount,
        weekRevenue: weekRevenue ?? amount,
        debitRef: `sim_debit_${Date.now()}`,
      },
    };
    await mandateDebitSuccess(event);
    res.json({ ok: true, simulated: "mandate.debit_success", event });
  });

  // POST /simulate/transfer-success — fire a synthetic transfer.success event
  // Confirms a pending disbursement (locally, where real Nomba webhooks can't reach)
  router.post("/transfer-success", async (req, res) => {
    const { merchantTxRef } = req.body;
    if (!merchantTxRef) {
      return res.status(400).json({ error: "merchantTxRef is required" });
    }
    const event = {
      requestId: `sim_ts_${Date.now()}`,
      event: "transfer.success",
      data: { merchantTxRef },
    };
    await transferSuccess(event);
    res.json({ ok: true, simulated: "transfer.success", event });
  });

  // POST /simulate/payment-failed — fire a synthetic payment_failure event
  router.post("/payment-failed", async (req, res) => {
    const { merchantId, orderId, amount, failureReason } = req.body;
    if (!merchantId) {
      return res.status(400).json({ error: "merchantId is required" });
    }
    const event = {
      requestId: `sim_pf_${Date.now()}`,
      event: "payment_failure",
      data: {
        merchantId,
        orderId: orderId ?? `sim_order_${Date.now()}`,
        amount: amount ?? null,
        failureReason: failureReason ?? "card_declined",
      },
    };
    await paymentFailed(event);
    res.json({ ok: true, simulated: "payment_failure", event });
  });

  // POST /simulate/charge-failed — fire a synthetic tokenized_card.charge_failed event
  router.post("/charge-failed", async (req, res) => {
    const { merchantId, tokenId, amount, failureReason } = req.body;
    if (!merchantId || !tokenId) {
      return res.status(400).json({ error: "merchantId and tokenId are required" });
    }
    const event = {
      requestId: `sim_cf_${Date.now()}`,
      event: "tokenized_card.charge_failed",
      data: {
        merchantId,
        tokenId,
        amount: amount ?? null,
        failureReason: failureReason ?? "insufficient_funds",
      },
    };
    await recurringChargeFailed(event);
    res.json({ ok: true, simulated: "tokenized_card.charge_failed", event });
  });

}

export default router;
