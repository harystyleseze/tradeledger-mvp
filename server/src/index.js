import "dotenv/config";
import express from "express";
import merchantsRouter from "./routes/merchants.js";
import advancesRouter from "./routes/advances.js";
import adminRouter from "./routes/admin.js";
import buyersRouter from "./routes/buyers.js";
import simulateRouter from "./routes/simulate.js";
import checkoutRouter from "./routes/checkout.js";
import walletRouter from "./routes/wallet.js";
import webhookRouter from "./webhooks/handler.js";
import { startRevenueReviewJob } from "./jobs/revenueReview.js";
import { startReconciliationJob } from "./jobs/reconciliation.js";

const app = express();

// Webhook route uses express.raw() internally — must be registered BEFORE express.json()
app.use(webhookRouter);

// --- CORS ---
// CORS_ORIGIN can be a single URL or comma-separated list of URLs.
// e.g. "https://tradeledger.vercel.app" or "https://tradeledger.vercel.app,https://tradeledger-git-main.vercel.app"
// In development, localhost:5173 is always allowed.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
allowedOrigins.push("http://localhost:5173");

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

app.use("/merchants", merchantsRouter);
app.use("/advances", advancesRouter);
app.use("/admin", adminRouter);
app.use("/buyers", buyersRouter);
app.use("/simulate", simulateRouter);
app.use("/checkout", checkoutRouter);
app.use("/wallet", walletRouter);

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ type: "unhandled_error", error: err.message, stack: err.stack }));
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(JSON.stringify({ type: "server_start", port: PORT, env: process.env.NODE_ENV }));
  startRevenueReviewJob();
  startReconciliationJob();
});
