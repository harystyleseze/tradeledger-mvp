import db from "../../db/prisma.js";

export async function transferFailed(event) {
  const { merchantTxRef } = event.data;

  const transfer = await db.transfer.findUnique({ where: { merchantTxRef } });
  if (!transfer) {
    console.error(JSON.stringify({ type: "webhook_no_transfer", merchantTxRef }));
    return;
  }

  await db.transfer.update({
    where: { merchantTxRef },
    data: { status: "failed" },
  });

  console.error(JSON.stringify({
    type: "disbursement_failed",
    advanceId: transfer.advanceId,
    merchantTxRef,
  }));
}
