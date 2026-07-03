import { nombaRequest } from "./auth.js";

export async function createMandate({ customerId, maxAmount, startDate, endDate }) {
  const res = await nombaRequest("POST", "/mandates/create", {
    customerId,
    maxAmount,
    frequency: "monthly",
    startDate,
    endDate,
  });
  return res.data;
}

export async function debitMandate(mandateId, amount, merchantTxRef) {
  const res = await nombaRequest("POST", `/mandates/${mandateId}/debit`, {
    amount,
    merchantTxRef,
  });
  return res.data;
}

export async function cancelMandate(mandateId) {
  await nombaRequest("DELETE", `/mandates/${mandateId}`);
}
