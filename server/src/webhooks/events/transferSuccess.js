import db from "../../db/prisma.js";

export async function transferSuccess(event) {
  const { merchantTxRef } = event.data;

  const transfer = await db.transfer.findUnique({ where: { merchantTxRef } });
  if (!transfer) {
    console.error(JSON.stringify({ type: "webhook_no_transfer", merchantTxRef }));
    return;
  }

  await db.transfer.update({
    where: { merchantTxRef },
    data: { status: "success" },
  });

  await db.advance.update({
    where: { id: transfer.advanceId },
    data: { status: "active" },
  });

  console.log(JSON.stringify({
    type: "disbursement_confirmed",
    advanceId: transfer.advanceId,
    merchantTxRef,
  }));
}
