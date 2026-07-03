import db from "../../db/prisma.js";

export async function recurringChargeFailed(event) {
  const { merchantId, tokenId, amount, failureReason } = event.data;

  const merchant = merchantId
    ? await db.merchant.findUnique({ where: { id: merchantId } })
    : null;

  if (!merchant) {
    console.warn(JSON.stringify({ type: "charge_failed_unknown_merchant", merchantId, tokenId }));
    return;
  }

  const reason = normalizeFailureReason(failureReason);

  // Count consecutive failures for (merchantId, tokenId) in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentFailures = await db.recurringFailure.count({
    where: {
      merchantId: merchant.id,
      tokenId,
      createdAt: { gte: thirtyDaysAgo },
    },
  });
  const consecutiveFailures = recentFailures + 1;

  try {
    await db.recurringFailure.create({
      data: {
        merchantId: merchant.id,
        tokenId,
        amount: amount ?? null,
        failureReason: reason,
        consecutiveFailures,
        webhookRequestId: event.requestId,
      },
    });
  } catch (e) {
    if (e.code === "P2002") return;
    throw e;
  }

  if (consecutiveFailures >= 3) {
    console.log(JSON.stringify({
      type: "dunning_threshold_reached",
      merchantId: merchant.id,
      tokenId,
      consecutiveFailures,
      action: "merchant_notification_required",
    }));
  }

  console.log(JSON.stringify({
    type: "recurring_charge_failed",
    merchantId: merchant.id,
    tokenId,
    failureReason: reason,
    consecutiveFailures,
  }));
}

function normalizeFailureReason(raw) {
  if (!raw) return "unknown";
  const r = raw.toLowerCase();
  if (r.includes("declin")) return "card_declined";
  if (r.includes("insufficient") || r.includes("funds")) return "insufficient_funds";
  if (r.includes("expir")) return "expired_card";
  return "unknown";
}
