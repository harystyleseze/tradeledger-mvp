# TradeLedger: B2B Financial Operations & Embedded Lending Platform

**Powered by Nomba**

---

## The Problem

**B2B Merchants (Wholesalers, Distributors, Aggregators) struggle with two massive pain points:**

1. **Reconciliation Chaos:** A distributor sells to 200 retailers. They receive 200 transfers a week into a single bank account. Determining who paid what, matching exact amounts to invoices, and chasing down underpayments is a manual, error-prone nightmare.
2. **The Credit Gap:** Because their cash flow is tracked manually or spread across fragmented channels, they lack verifiable digital ledgers. When they or their buyers need working capital to buy more inventory, banks reject them for lacking "formal" documentation.

They have the transaction history. The proof of revenue. The repayment capacity. But because it isn't structured, nobody can underwrite it.

---

## The Solution: TradeLedger

**TradeLedger is a B2B financial operating system that digitizes supply chain payments so the resulting data can unlock credit.**

We turn what a merchant already does (collecting payments) into an underwriting signal, and turn that signal into working capital.

### 1. Payment Collection & Reconciliation (The "Ledger")
We eliminate manual reconciliation using Nomba's infrastructure:
* **Dedicated Virtual Accounts (DVAs):** Merchants onboard their buyers (retailers, partners). Each buyer receives a permanent, unique Virtual Bank Account. 
* **Auto-Reconciliation:** When a buyer pays, the system automatically knows exactly who paid, logs it in the merchant's ledger, and categorizes it as an exact payment, underpayment, or overpayment.
* **Online Checkout:** For ad-hoc payments, merchants generate secure payment links powered by Nomba Checkout.

### 2. Treasury & Fund Management (The "Wallet")
All payments pool into a master **Nomba Sub-Account** provisioned specifically for the merchant.
* **Withdrawals:** Merchants can withdraw their pooled balance to their traditional bank accounts.
* **Value-Added Services (VAS):** Merchants can spend their balance directly on the platform to pay for business operations — Airtime, Data Bundles, Electricity (with meter validation), and Cable TV (with smartcard validation).

### 3. Credit Underwriting & Lending (The "Trade")
Because all B2B payments now flow through structured DVAs, TradeLedger has perfect visibility into cash flow.
* **Scoring Engine:** Our backend evaluates buyer payment behavior (velocity, consistency, diversity) to generate a dynamic credit score (A, B, C, D, F) and a recommended credit limit.
* **Lender Portal:** Merchants or third-party lenders can use this auto-generated reputation data to offer trade credit, inventory financing, or cash advances to buyers with zero manual underwriting.

---

## The Core Features

| Component | What it does |
|---|---|
| **Sub-account Provisioning** | Automatically creates a Nomba sub-account for every onboarded merchant. |
| **DVA Engine** | Provisions unique NUBANs per buyer and automatically reconciles inflows via Webhooks. |
| **Multi-tabbed Wallet** | Instant access to pooled funds for withdrawals and dynamic VAS (Data, Airtime, Power, TV). |
| **Instant Refunds** | Single-click refunds for successful checkout link payments. |
| **8-Dimension Scoring** | Evaluates 5 settlement dimensions and 3 DVA dimensions to assess credit risk. |
| **Cross-Merchant Reputation** | Tracks payer account numbers across the entire platform to build network-wide credit profiles. |

---

## Why Existing Solutions Don't Work

| Provider | Why it fails for B2B Merchants |
|---|---|
| Banks | Require collateral and manual invoicing. Built for formal corporate structures, not fragmented B2B networks. |
| Consumer Lenders | Underwrite based on consumer BVN profiles, ignoring B2B cash flow and trade volume. |
| Pure Payment Gateways | No built-in ledgering, reconciliation logic, or credit origination. |

---

## Technology Stack

TradeLedger is built on top of the comprehensive Nomba API ecosystem:

* **Sub-accounts API:** Escrow isolation and fund pooling per merchant.
* **Virtual Accounts API:** Per-buyer DVA provisioning.
* **Checkout API:** Tokenized card and transfer links with instant refund capabilities.
* **Transfers API:** Withdrawals to external bank accounts.
* **Bill Payment API:** Real-time lookup, validation, and purchase of Airtime, Data, Power, and TV.
* **Webhooks:** HMAC-verified, real-time reconciliation of payments and inflows.

**Stack:** Node.js + Express + Prisma + PostgreSQL (Backend); React 18 + Vite + Tailwind CSS (Frontend). Deployed on Render.

---

## Competitive Moat

1. **The Data Rail:** TradeLedger structures unstructured B2B payments. By controlling the ledger, we generate underwriting data that no credit bureau possesses.
2. **Cross-Merchant Network Effects:** A buyer who defaults on Merchant A will have their reputation downgraded when attempting to buy on credit from Merchant B. The network gets smarter with every transaction.
3. **Zero CAC:** The platform solves an immediate, painful operational problem (reconciliation). Credit is an embedded upsell that requires zero outbound sales effort. 

**TradeLedger doesn't just lend money. It fixes the financial operations of the merchant, and uses the resulting data to make lending safe.**
