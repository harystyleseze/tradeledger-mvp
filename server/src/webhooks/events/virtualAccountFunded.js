import db from "../../db/prisma.js";

export async function virtualAccountFunded(event) {
  const { accountId, amountReceived, amountExpected, senderName, senderAccountNumber, timeCreated } = event.data;

  // Nomba identifies the VA by the accountRef we set at creation; fall back to
  // the NUBAN itself if the payload carries only the account number.
  const nombaVirtualAccountId = accountId ?? event.data.accountRef ?? event.data.id;
  const nubanNumber = event.data.accountNumber ?? event.data.bankAccountNumber;

  if (!nombaVirtualAccountId && !nubanNumber) return;

  let buyerAccount = nombaVirtualAccountId
    ? await db.buyerAccount.findUnique({ where: { nombaVirtualAccountId } })
    : null;
  if (!buyerAccount && nubanNumber) {
    buyerAccount = await db.buyerAccount.findFirst({ where: { accountNumber: nubanNumber } });
  }

  if (!buyerAccount) {
    // Payment arrived at a NUBAN not managed by TradeLedger — record for audit
    try {
      await db.unmatchedPayment.create({
        data: {
          nombaAccountId: nombaVirtualAccountId ?? nubanNumber,
          amount: amountReceived,
          senderName: senderName ?? null,
          senderAccount: senderAccountNumber ?? null,
          webhookRequestId: event.requestId,
        },
      });
      console.log(JSON.stringify({
        type: "unmatched_payment_recorded",
        nombaAccountId: nombaVirtualAccountId,
        amount: amountReceived,
      }));
    } catch (e) {
      if (e.code !== "P2002") throw e;
    }
    return;
  }

  if (buyerAccount.status === "closed") {
    console.warn(JSON.stringify({
      type: "payment_to_closed_account",
      buyerAccountId: buyerAccount.id,
      nombaAccountId: nombaVirtualAccountId,
      amount: amountReceived,
    }));
    return;
  }

  // Resolve effective expected amount:
  // 1. Webhook payload amountExpected (most specific — Nomba-locked amount)
  // 2. Account-level default (invoice locking — set when NUBAN was created)
  // 3. null — no expectation, records as "exact"
  const effectiveExpected = (amountExpected && amountExpected > 0)
    ? amountExpected
    : (buyerAccount.defaultAmountExpected ?? null);

  let reconciliationStatus = "exact";
  let surplus = null;
  let shortfall = null;

  if (effectiveExpected && effectiveExpected > 0) {
    if (amountReceived < effectiveExpected) {
      reconciliationStatus = "under";
      shortfall = effectiveExpected - amountReceived;
    } else if (amountReceived > effectiveExpected) {
      reconciliationStatus = "over";
      surplus = amountReceived - effectiveExpected;
    }
  }

  console.log(JSON.stringify({
    type: "virtual_account_funded",
    nombaVirtualAccountId,
    amountReceived,
    amountExpected: amountExpected ?? null,
    reconciliationStatus,
    senderName,
    senderAccountNumber,
  }));

  try {
    await db.buyerPayment.create({
      data: {
        buyerAccountId: buyerAccount.id,
        amount: amountReceived,
        payer: senderName ?? buyerAccount.customerReference,
        receivedAt: timeCreated ? new Date(timeCreated) : new Date(),
        webhookRequestId: event.requestId,
        reconciliationStatus,
        amountExpected: amountExpected ?? null,
        surplus,
        shortfall,
        senderAccountNumber: senderAccountNumber ?? null,
      },
    });
    console.log(JSON.stringify({
      type: "buyer_payment_recorded",
      buyerAccountId: buyerAccount.id,
      merchantId: buyerAccount.merchantId,
      amount: amountReceived,
      reconciliationStatus,
    }));
  } catch (e) {
    if (e.code === "P2002") return;
    throw e;
  }
}
