import 'dotenv/config';
import { nombaRequest } from './src/nomba/auth.js';

async function run() {
  try {
    const res = await nombaRequest('GET', '/transfers/banks');
    console.log("Success! Fetched", res.data?.length, "banks.");
    // Check if Palmpay is in the list
    const palmpay = res.data.find(b => b.bankName.toLowerCase().includes('palm'));
    console.log("Palmpay found:", palmpay);
  } catch (err) {
    console.error("Failed:", err.message);
  }
}
run();
