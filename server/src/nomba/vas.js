import { nombaRequest } from "./auth.js";

// Lookup available airtime providers
export async function getAirtimeProviders() {
  const res = await nombaRequest("GET", "/bill/lookup/airtime");
  return res.data;
}

// Purchase airtime
export async function purchaseAirtime(subAccountId, amount, phoneNumber, network) {
  const merchantTxRef = `at_${subAccountId}_${Date.now()}`;
  
  const payload = {
    amount: Math.round(Number(amount)), // in kobo
    phoneNumber,
    network,
    merchantTxRef,
  };

  const res = await nombaRequest("POST", `/bill/topup/${subAccountId}`, payload);
  return { data: res.data, merchantTxRef };
}

// -------------------------------------------------------------
// DATA BUNDLES
// -------------------------------------------------------------
export async function getDataPlans(network) {
  const res = await nombaRequest("GET", `/bill/data/lookup?network=${network}`);
  return res.data;
}

export async function purchaseData(subAccountId, amount, phoneNumber, network, planId) {
  const merchantTxRef = `dt_${subAccountId}_${Date.now()}`;
  const payload = {
    amount: Math.round(Number(amount)),
    phoneNumber,
    network,
    planId,
    merchantTxRef,
  };
  const res = await nombaRequest("POST", `/bill/data/${subAccountId}`, payload);
  return { data: res.data, merchantTxRef };
}

// -------------------------------------------------------------
// ELECTRICITY
// -------------------------------------------------------------
export async function getElectricityProviders() {
  const res = await nombaRequest("GET", "/bill/electricity/discos");
  return res.data;
}

export async function validateElectricityMeter(disco, meterNumber) {
  const res = await nombaRequest("GET", `/bill/electricity/lookup?disco=${disco}&customerId=${meterNumber}`);
  return res.data;
}

export async function purchaseElectricity(subAccountId, amount, disco, meterNumber, meterType = "PREPAID") {
  const merchantTxRef = `el_${subAccountId}_${Date.now()}`;
  const payload = {
    amount: Math.round(Number(amount)),
    disco,
    meterNumber,
    meterType,
    merchantTxRef,
  };
  const res = await nombaRequest("POST", `/bill/electricity/${subAccountId}`, payload);
  return { data: res.data, merchantTxRef };
}

// -------------------------------------------------------------
// CABLE TV
// -------------------------------------------------------------
export async function getCableTvProviders() {
  const res = await nombaRequest("GET", "/bill/cabletv/providers");
  return res.data;
}

export async function validateCableSmartcard(provider, smartcardNumber) {
  const res = await nombaRequest("GET", `/bill/cabletv/lookup?provider=${provider}&customerId=${smartcardNumber}`);
  return res.data;
}

export async function purchaseCableTv(subAccountId, amount, provider, smartcardNumber, planId) {
  const merchantTxRef = `cb_${subAccountId}_${Date.now()}`;
  const payload = {
    amount: Math.round(Number(amount)),
    provider,
    smartcardNumber,
    planId,
    merchantTxRef,
  };
  const res = await nombaRequest("POST", `/bill/cabletv/${subAccountId}`, payload);
  return { data: res.data, merchantTxRef };
}
