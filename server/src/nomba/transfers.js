import { nombaRequest } from "./auth.js";
import db from "../db/prisma.js";

const SUB_ACCOUNT_ID = () => process.env.NOMBA_SUB_ACCOUNT_ID || process.env.NOMBA_ACCOUNT_ID;

export async function lookupBank(bankCode, accountNumber) {
  const res = await nombaRequest("POST", "/transfers/bank/lookup", {
    bankCode,
    accountNumber,
  });
  return res.data.accountName;
}

// List all supported Nigerian banks
let _banksCache = null;
let _banksCachedAt = 0;

export async function listBanks() {
  // Cache for 24 hours — bank list rarely changes
  if (_banksCache && Date.now() - _banksCachedAt < 24 * 60 * 60 * 1000) {
    return _banksCache;
  }
  const res = await nombaRequest("GET", "/transfers/banks");
  _banksCache = res.data ?? [];
  _banksCachedAt = Date.now();
  return _banksCache;
}

export async function disburseLoan(advance, merchant) {
  const resolvedName = await lookupBank(merchant.bankCode, merchant.accountNumber);

  const merchantTxRef = `payout_${advance.id}_${Date.now()}`;

  await nombaRequest("POST", `/transfers/bank/${SUB_ACCOUNT_ID()}`, {
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

export async function withdrawToBank(subAccountId, amount, bankCode, accountNumber, accountName) {
  const merchantTxRef = `wd_${subAccountId}_${Date.now()}`;

  const payload = {
    amount: Math.round(Number(amount)), // Must be in kobo/integer
    bankCode,
    accountNumber,
    accountName,
    senderName: "TradeLedger Merchant",
    narration: "Withdrawal from TradeLedger",
    merchantTxRef,
  };

  const res = await nombaRequest("POST", `/transfers/bank/${subAccountId}`, payload);
  return { data: res.data, merchantTxRef };
}

