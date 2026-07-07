import 'dotenv/config';
import { getMerchantHistory } from './src/nomba/transactions.js';

async function run() {
  console.log("Starting history fetch...");
  try {
    const tx = await getMerchantHistory();
    console.log("Found transactions:", tx.length);
  } catch(e) {
    console.error("Error history:", e);
  }
}
run();
