import 'dotenv/config';
import { getDataPlans } from './src/nomba/vas.js';
async function run() {
  try {
    const p = await getDataPlans("MTN");
    console.log("Plans:", JSON.stringify(p, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
run();
