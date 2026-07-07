import 'dotenv/config';
import { createCheckoutOrder, getOrder } from './src/nomba/checkout.js';
async function run() {
  try {
    const ref = "test_amount_" + Date.now();
    const data = await createCheckoutOrder({
      orderReference: ref,
      amount: 200.55,
      customerEmail: "heze@example.com",
      customerName: "Jonah Promise"
    });
    console.log("Order Data:", JSON.stringify(data, null, 2));
    
    const order = await getOrder(data.orderReference);
    console.log("Order status:", JSON.stringify(order, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
