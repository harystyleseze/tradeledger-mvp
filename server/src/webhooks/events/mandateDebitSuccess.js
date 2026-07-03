import db from "../../db/prisma.js";

export async function mandateDebitSuccess(event) {
  const { mandateId, amount, merchantTxRef } = event.data;

  const advance = await db.advance.findUnique({ where: { mandateId } });
  if (!advance) {
    console.error(JSON.stringify({ type: "webhook_no_advance", mandateId, merchantTxRef }));
    return;
  }

  await db.repayment.upsert({
    where: { mandateDebitRef: merchantTxRef },
    update: { status: "success" },
    create: {
      advanceId: advance.id,
      amount,
      weekRevenue: 0,
      mandateDebitRef: merchantTxRef,
      status: "success",
    },
  });

  const newBalance = Math.max(0, advance.balance - amount);
  const settled = newBalance === 0;

  await db.advance.update({
    where: { id: advance.id },
    data: {
      balance: newBalance,
      status: settled ? "settled" : advance.status,
      settledAt: settled ? new Date() : undefined,
    },
  });

  console.log(JSON.stringify({
    type: "repayment_recorded",
    advanceId: advance.id,
    amount,
    newBalance,
    merchantTxRef,
  }));
}
