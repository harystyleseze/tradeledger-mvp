import 'dotenv/config';
import { lookupBank } from './src/nomba/transfers.js';

async function run() {
  try {
    const name = await lookupBank("100033", "8138496536");
    console.log("Account Name:", name);
  } catch(e) {
    console.error("Error lookup:", e);
  }
}
run();
