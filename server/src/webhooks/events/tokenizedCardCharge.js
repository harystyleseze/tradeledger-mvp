import db from "../../db/prisma.js";

export async function tokenizedCardCharge(event) {
  const { merchantId, tokenId, amount } = event.data;

  if (!merchantId || !tokenId || !amount) {
    console.log(JSON.stringify({ type: "tokenized_charge_skip", reason: "missing_fields", data: event.data }));
    return;
  }

  try {
    await db.recurringCharge.create({
      data: {
        merchantId,
        amount,
        tokenId,
        webhookRequestId: event.requestId,
      },
    });
    console.log(JSON.stringify({ type: "recurring_charge_recorded", merchantId, tokenId, amount }));
  } catch (e) {
    if (e.code === "P2002") return; // duplicate webhookRequestId — already processed
    throw e;
  }
}
