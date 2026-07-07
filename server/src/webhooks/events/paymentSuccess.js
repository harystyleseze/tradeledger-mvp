import db from "../../db/prisma.js";

export async function paymentSuccess(event) {
  const { orderId, amount, merchantId } = event.data;

  if (!merchantId || !orderId || !amount) {
    console.log(JSON.stringify({ type: "payment_success_skip", reason: "missing_fields", data: event.data }));
    return;
  }

  try {
    await db.checkoutPayment.create({
      data: {
        merchantId,
        amount: Math.round(Number(amount) * 100), // Webhook sends NGN, store as kobo
        orderId,
        webhookRequestId: event.requestId,
      },
    });
    console.log(JSON.stringify({ type: "checkout_payment_recorded", merchantId, orderId, amount }));
  } catch (e) {
    if (e.code === "P2002") return; // duplicate orderId or requestId — already processed
    throw e;
  }
}
