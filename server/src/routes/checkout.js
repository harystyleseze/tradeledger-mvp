import { Router } from "express";
import db from "../db/prisma.js";
import { createCheckoutOrder, refundCheckoutOrder } from "../nomba/checkout.js";
import crypto from "crypto";

const router = Router();

// POST /checkout/link — create a new one-time payment link
router.post("/link", async (req, res) => {
  const { merchantId, amount, customerEmail, customerName } = req.body;

  if (!merchantId || !amount) {
    return res.status(400).json({ error: "merchantId and amount are required" });
  }

  const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return res.status(404).json({ error: "Merchant not found" });

  // Generate a unique order reference
  const orderReference = `tl_chk_${merchantId}_${crypto.randomBytes(4).toString("hex")}`;

  try {
    const data = await createCheckoutOrder({
      orderReference,
      amount: Math.round(Number(amount) * 100), // Convert NGN to kobo
      customerEmail: customerEmail || "anonymous@example.com",
      customerName: customerName || "Anonymous Buyer",
    });

    if (!data || !data.checkoutLink) {
      throw new Error("Nomba did not return a checkout link");
    }

    res.status(201).json({
      orderReference,
      checkoutLink: data.checkoutLink,
      amount,
      customerEmail,
      customerName,
    });
  } catch (e) {
    console.error(JSON.stringify({ type: "checkout_create_error", merchantId, error: e.message }));
    res.status(502).json({ error: "Failed to create checkout link with Nomba" });
  }
});

// GET /checkout/history/:merchantId — retrieve paid checkout links
router.get("/history/:merchantId", async (req, res) => {
  const { merchantId } = req.params;

  const payments = await db.checkoutPayment.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    count: payments.length,
    payments: payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      amountNaira: p.amount / 100, // Stored in kobo
      receivedAt: p.createdAt,
      status: p.status,
    })),
  });
});

// POST /checkout/refund/:merchantId — refund a paid checkout link
router.post("/refund/:merchantId", async (req, res) => {
  const { merchantId } = req.params;
  const { orderId, amount, reason } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ error: "orderId and amount are required" });
  }

  const payment = await db.checkoutPayment.findUnique({
    where: { orderId },
  });

  if (!payment || payment.merchantId !== merchantId) {
    return res.status(404).json({ error: "Payment not found" });
  }
  
  if (payment.status === "refunded") {
    return res.status(400).json({ error: "Payment already refunded" });
  }

  try {
    const data = await refundCheckoutOrder({
      orderReference: orderId,
      amount: Math.round(Number(amount) * 100), // Convert NGN to kobo
      reason,
    });

    await db.checkoutPayment.update({
      where: { orderId },
      data: { status: "refunded" },
    });

    res.json({ message: "Refund successful", data });
  } catch (e) {
    console.error(JSON.stringify({ type: "checkout_refund_error", merchantId, orderId, error: e.message }));
    res.status(502).json({ error: e.message || "Failed to process refund with Nomba" });
  }
});

export default router;
