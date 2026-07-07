import 'dotenv/config';
import db from './src/db/prisma.js';

async function run() {
  const accounts = await db.buyerAccount.findMany();
  console.log("Accounts:", accounts);
}
run();
