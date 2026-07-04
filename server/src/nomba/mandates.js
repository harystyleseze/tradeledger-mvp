import { nombaRequest } from "./auth.js";

export async function createMandate({ customerId, maxAmount, startDate, endDate }) {
  const res = await nombaRequest("POST", "/direct-debits", {
    customerId,
    maxAmount,
    frequency: "monthly",
    startDate,
    endDate,
  });
  return res.data;
}

export async function debitMandate(mandateId, amount, merchantTxRef) {
  const res = await nombaRequest("POST", "/direct-debits/debit-mandate", {
    mandateId,
    amount,
    merchantTxRef,
  });
  return res.data;
}

export async function cancelMandate(mandateId) {
  await nombaRequest("DELETE", `/direct-debits/${mandateId}`);
}

// Check mandate status — active, expired, revoked, etc.
export async function getMandateStatus(mandateId) {
  const res = await nombaRequest("GET", `/direct-debits/${mandateId}`);
  return res.data;
}

