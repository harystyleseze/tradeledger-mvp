import { nombaRequest } from "./auth.js";

const SUB_ACCOUNT_ID = () => process.env.NOMBA_SUB_ACCOUNT_ID || process.env.NOMBA_ACCOUNT_ID;

export async function createVirtualAccount({ accountRef, accountName, amount }) {
  const body = { accountRef, accountName };
  if (amount) body.amount = amount;

  const res = await nombaRequest("POST", `/accounts/virtual/${SUB_ACCOUNT_ID()}`, body);
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

// List/filter VAs under the sub-account
export async function listVirtualAccounts(page = 0, pageSize = 50) {
  const res = await nombaRequest("POST", "/accounts/virtual/list", { page, pageSize });
  return res.data;
}

// Fetch a single VA by identifier (accountRef or NUBAN)
export async function getVirtualAccount(identifier) {
  const res = await nombaRequest("GET", `/accounts/virtual/${identifier}`);
  return res.data;
}

// Get the balance of the sub-account
export async function getAccountBalance() {
  const res = await nombaRequest("GET", `/accounts/${SUB_ACCOUNT_ID()}/balance`);
  return res.data;
}
