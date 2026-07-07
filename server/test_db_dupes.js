import 'dotenv/config';
import db from './src/db/prisma.js';

async function run() {
  const all = await db.merchant.findMany();
  for (const m of all) {
    if (m.email.toLowerCase().includes("ceze52")) {
      console.log(`- ID: ${m.id}, EMAIL: '${m.email}', PASS: '${m.passwordHash}'`);
    }
  }
}
run();
