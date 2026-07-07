import 'dotenv/config';
import db from './src/db/prisma.js';

async function run() {
  const merchant = await db.merchant.findFirst({
    include: {
      buyerAccounts: true
    }
  });
  console.log("Merchant:", merchant ? merchant.id : "none");
  console.log("BuyerAccounts:", merchant ? merchant.buyerAccounts.length : 0);
}
run();
