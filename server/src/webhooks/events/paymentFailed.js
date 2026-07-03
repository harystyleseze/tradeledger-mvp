import db from "../../db/prisma.js";

export async function paymentFailed(event) {
  const { merchantId, orderId, amount, failureReason } = event.data;

  const merchant = merchantId
    ? await db.merchant.findUnique({ where: { id: merchantId } })
    : null;

  if (!merchant) {
    console.warn(JSON.stringify({ type: "payment_failed_unknown_merchant", merchantId, orderId }));
    return;
  }

  const reason = normalizeFailureReason(failureReason);

  try {
    await db.checkoutFailure.create({
      data: {
        merchantId: merchant.id,
        orderId: orderId ?? null,
        amount: amount ?? null,
        failureReason: reason,
        webhookRequestId: event.requestId,
      },
    });
    console.log(JSON.stringify({
      type: "checkout_payment_failed",
      merchantId: merchant.id,
      orderId,
      failureReason: reason,
    }));
  } catch (e) {
    if (e.code === "P2002") return;
    throw e;
  }
}

function normalizeFailureReason(raw) {
  if (!raw) return "unknown";
  const r = raw.toLowerCase();
  if (r.includes("declin")) return "card_declined";
  if (r.includes("insufficient") || r.includes("funds")) return "insufficient_funds";
  if (r.includes("expir")) return "expired_card";
  return "unknown";
}
