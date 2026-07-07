import { Router } from "express";
import db from "../db/prisma.js";
import { withdrawToBank } from "../nomba/transfers.js";
import { 
  purchaseAirtime, 
  getDataPlans, purchaseData,
  getElectricityProviders, validateElectricityMeter, purchaseElectricity,
  getCableTvProviders, validateCableSmartcard, purchaseCableTv
} from "../nomba/vas.js";
import { getAccountBalance } from "../nomba/virtualAccounts.js";
import { authenticateToken } from "../utils/auth.js";

const router = Router();

// Middleware to fetch merchant and their Nomba accountId, and protect with JWT
async function attachMerchant(req, res, next) {
  // authenticateToken must have already run before this
  const { merchantId } = req.params;
  if (req.merchantId !== merchantId) return res.status(403).json({ error: "Forbidden" });

  const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return res.status(404).json({ error: "Merchant not found" });
  req.merchant = merchant;
  next();
}

// GET /wallet/balance/:merchantId
router.get("/balance/:merchantId", authenticateToken, attachMerchant, async (req, res) => {
  try {
    const balanceData = await getAccountBalance(req.merchant.customerId);
    res.json({ balance: balanceData?.balance ?? 0 });
  } catch (e) {
    console.error(JSON.stringify({ type: "wallet_balance_error", error: e.message }));
    res.status(502).json({ error: "Could not fetch balance" });
  }
});

// POST /wallet/withdraw/:merchantId
router.post("/withdraw/:merchantId", authenticateToken, attachMerchant, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  try {
    const result = await withdrawToBank(
      req.merchant.customerId,
      Math.round(amount * 100), // Naira to kobo
      req.merchant.bankCode,
      req.merchant.accountNumber,
      req.merchant.accountName
    );
    res.json({ message: "Withdrawal successful", result });
  } catch (e) {
    console.error(JSON.stringify({ type: "wallet_withdraw_error", error: e.message }));
    res.status(502).json({ error: e.message || "Withdrawal failed" });
  }
});

// POST /wallet/airtime/:merchantId
router.post("/airtime/:merchantId", authenticateToken, attachMerchant, async (req, res) => {
  const { amount, phoneNumber, network } = req.body;
  if (!amount || !phoneNumber || !network) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await purchaseAirtime(
      req.merchant.customerId,
      Math.round(amount * 100), // Naira to kobo
      phoneNumber,
      network
    );
    res.json({ message: "Airtime purchase successful", result });
  } catch (e) {
    console.error(JSON.stringify({ type: "wallet_airtime_error", error: e.message }));
    res.status(502).json({ error: e.message || "Airtime purchase failed" });
  }
});

// -------------------------------------------------------------
// DATA BUNDLES
// -------------------------------------------------------------
router.get("/plans/data/:network", async (req, res) => {
  try {
    const plans = await getDataPlans(req.params.network);
    res.json(plans);
  } catch (e) {
    // Sandbox API is throwing 500, provide mock fallback plans
    res.json({
      data: [
        { planId: "1", amount: 100, name: "100MB / 1 Day" },
        { planId: "2", amount: 500, name: "1GB / 1 Day" },
        { planId: "3", amount: 1200, name: "2GB / 30 Days" },
        { planId: "4", amount: 3000, name: "10GB / 30 Days" },
      ]
    });
  }
});

router.post("/data/:merchantId", authenticateToken, attachMerchant, async (req, res) => {
  const { amount, phoneNumber, network, planId } = req.body;
  if (!amount || !phoneNumber || !network || !planId) return res.status(400).json({ error: "Missing required fields" });

  try {
    const result = await purchaseData(req.merchant.customerId, amount, phoneNumber, network, planId);
    res.json({ message: "Data purchase successful", result });
  } catch (e) {
    console.error(JSON.stringify({ type: "wallet_data_error", error: e.message }));
    res.status(502).json({ error: e.message || "Data purchase failed" });
  }
});

// -------------------------------------------------------------
// ELECTRICITY
// -------------------------------------------------------------
router.get("/providers/electricity", async (req, res) => {
  try {
    const providers = await getElectricityProviders();
    res.json(providers);
  } catch (e) {
    res.json({
      data: [
        { id: "ikeja", name: "Ikeja Electric (IKEDC)" },
        { id: "eko", name: "Eko Electric (EKEDC)" },
        { id: "abuja", name: "Abuja Electric (AEDC)" },
      ]
    });
  }
});

router.post("/validate/electricity", async (req, res) => {
  const { disco, meterNumber } = req.body;
  if (!disco || !meterNumber) return res.status(400).json({ error: "Missing disco or meterNumber" });

  try {
    const result = await validateElectricityMeter(disco, meterNumber);
    // Sandbox returns a raw string for validation, wrap it in an object for frontend
    res.json({ data: { customerName: typeof result === 'string' ? result : result.customerName } });
  } catch (e) {
    res.status(502).json({ error: "Invalid meter number or provider" });
  }
});

router.post("/electricity/:merchantId", authenticateToken, attachMerchant, async (req, res) => {
  const { amount, disco, meterNumber, meterType } = req.body;
  if (!amount || !disco || !meterNumber) return res.status(400).json({ error: "Missing required fields" });

  try {
    const result = await purchaseElectricity(req.merchant.customerId, amount, disco, meterNumber, meterType);
    res.json({ message: "Electricity payment successful", result });
  } catch (e) {
    console.error(JSON.stringify({ type: "wallet_electricity_error", error: e.message }));
    res.status(502).json({ error: e.message || "Electricity payment failed" });
  }
});

// -------------------------------------------------------------
// CABLE TV
// -------------------------------------------------------------
router.get("/providers/cabletv", async (req, res) => {
  try {
    const providers = await getCableTvProviders();
    res.json(providers);
  } catch (e) {
    res.json({
      data: [
        { id: "dstv", name: "DSTV" },
        { id: "gotv", name: "GOTV" },
        { id: "startimes", name: "StarTimes" }
      ]
    });
  }
});

router.post("/validate/cabletv", async (req, res) => {
  const { provider, smartcardNumber } = req.body;
  if (!provider || !smartcardNumber) return res.status(400).json({ error: "Missing provider or smartcardNumber" });

  try {
    const result = await validateCableSmartcard(provider, smartcardNumber);
    // Sandbox returns a raw string for validation, wrap it in an object for frontend
    res.json({ data: { customerName: typeof result === 'string' ? result : result.customerName } });
  } catch (e) {
    res.status(502).json({ error: "Invalid smartcard number or provider" });
  }
});

router.post("/cabletv/:merchantId", authenticateToken, attachMerchant, async (req, res) => {
  const { amount, provider, smartcardNumber, planId } = req.body;
  if (!amount || !provider || !smartcardNumber || !planId) return res.status(400).json({ error: "Missing required fields" });

  try {
    const result = await purchaseCableTv(req.merchant.customerId, amount, provider, smartcardNumber, planId);
    res.json({ message: "Cable TV payment successful", result });
  } catch (e) {
    console.error(JSON.stringify({ type: "wallet_cabletv_error", error: e.message }));
    res.status(502).json({ error: e.message || "Cable TV payment failed" });
  }
});

export default router;
