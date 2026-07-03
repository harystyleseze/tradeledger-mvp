import { nombaRequest } from "./auth.js";

export async function createSubAccount(accountName, accountRef) {
  const res = await nombaRequest("POST", "/accounts/sub-accounts", {
    accountName,
    accountRef,
  });
  return res.data;
}

export async function getSubAccountBalance(subAccountId) {
  const res = await nombaRequest("GET", `/accounts/sub-accounts/${subAccountId}/balance`);
  return res.data;
}
