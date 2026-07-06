import { nombaRequest } from "./auth.js";

// Create a new one-time checkout order (returns a checkoutLink)
export async function createCheckoutOrder({ orderReference, amount, customerEmail, customerName }) {
  const payload = {
    orderReference,
    customerId: customerEmail || "anonymous",
    customerEmail,
    customerName,
    amount,
    currency: "NGN",
  };

  const res = await nombaRequest("POST", "/checkout/order", payload);
  return res.data;
}

// Fetch status of an order
export async function getOrder(orderReference) {
  const res = await nombaRequest("GET", `/checkout/order/${orderReference}`);
  return res.data;
}

// Refund a checkout transaction
export async function refundCheckoutOrder({ orderReference, amount, reason }) {
  const payload = {
    orderReference,
    amount, // In kobo
    customerNote: reason || "Refund requested by merchant"
  };

  const res = await nombaRequest("POST", "/checkout/refund", payload);
  return res.data;
}
