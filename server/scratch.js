import 'dotenv/config';
import { nombaRequest } from './src/nomba/auth.js';

async function run() {
  try {
    const payload = {
      order: {
        orderReference: "test_" + Date.now(),
        customerId: "heze008@gmail.com",
        customerEmail: "heze008@gmail.com",
        customerName: "Jonah Promise",
        amount: 20000,
        currency: "NGN",
        description: "Test checkout"
      }
    };
    const res = await nombaRequest("POST", "/checkout/order", payload);
    console.log("Success:", res.data);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

run();
