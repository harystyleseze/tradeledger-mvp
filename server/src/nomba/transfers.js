import { nombaRequest } from "./auth.js";
import db from "../db/prisma.js";

export async function lookupBank(bankCode, accountNumber) {
  const res = await nombaRequest("POST", "/transfers/bank/lookup", {
    bankCode,
    accountNumber,
  });
  return res.data.accountName;
}

export async function disburseLoan(advance, merchant) {
  const resolvedName = await lookupBank(merchant.bankCode, merchant.accountNumber);

  const merchantTxRef = `payout_${advance.id}_${Date.now()}`;

  await nombaRequest("POST", "/transfers/bank", {
    amount: advance.amount,
    bankCode: merchant.bankCode,
    accountNumber: merchant.accountNumber,
    accountName: resolvedName,
    senderName: "TradeLedger",
    narration: `TradeLedger Advance #${advance.id.slice(-8)}`,
    merchantTxRef,
  });

  await db.transfer.create({
    data: {
      advanceId: advance.id,
      merchantTxRef,
      amount: advance.amount,
      bankCode: merchant.bankCode,
      accountNumber: merchant.accountNumber,
      accountName: resolvedName,
      status: "pending",
    },
  });

  return merchantTxRef;
}
