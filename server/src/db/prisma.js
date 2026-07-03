import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

export default db;
