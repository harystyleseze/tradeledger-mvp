import { nombaRequest } from "./auth.js";

export async function createVirtualAccount({ accountRef, accountName, amount }) {
  const body = { accountRef, accountName };
  if (amount) body.amount = amount;

  const res = await nombaRequest("POST", "/accounts/virtual", body);
  return res.data;
}

export async function updateVirtualAccount(virtualAccountId, { accountName }) {
  const res = await nombaRequest("PUT", `/accounts/virtual/${virtualAccountId}`, { accountName });
  return res.data;
}

export async function expireVirtualAccount(virtualAccountId) {
  const res = await nombaRequest("DELETE", `/accounts/virtual/${virtualAccountId}`);
  return res.data;
}
