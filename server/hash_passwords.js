import db from "./src/db/prisma.js";
import bcrypt from "bcrypt";

async function run() {
  const merchants = await db.merchant.findMany();
  let updated = 0;
  for (const m of merchants) {
    if (!m.passwordHash || m.passwordHash === "") {
      const hash = await bcrypt.hash("password123", 10);
      await db.merchant.update({
        where: { id: m.id },
        data: { passwordHash: hash }
      });
      updated++;
    }
  }
  console.log(`Updated ${updated} merchants with default password 'password123'`);
  process.exit(0);
}
run();
