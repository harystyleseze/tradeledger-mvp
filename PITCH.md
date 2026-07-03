# TradeLedger

**Revenue-Based Working Capital for Nigerian Merchants**

_Powered by Nomba · Built for the 598,000 merchants credit can't reach_

---

## The Problem

**Adaeze runs an electronics shop in Onitsha.** She has been processing payments on Nomba for 14 months. Her average weekly revenue is ₦180,000. Last month, her main supplier offered a bulk discount — open for 72 hours. She needed ₦210,000.

She called her bank. They asked for 6 months of salary slips.

She visited a microfinance institution. Their committee meets fortnightly.

She tried Carbon and FairMoney. They use consumer BVN profiles. They don't read merchant settlement data.

She raised ₦80,000 from family. Missed the discount. Bought at full price — ₦380,000 instead of ₦300,000. An unnecessary ₦80,000 cost. Then her inventory ran short. She lost customers to a competitor who made the same order.

Adaeze has the transaction history. The proof of revenue. The repayment capacity. She has been building it for 14 months on Nomba's platform. Nobody is reading it.

---

**This is not an edge case. This is the Nigerian SME credit market.**

| Metric | Figure | Source |
|---|---|---|
| Unmet MSME credit demand in Nigeria | ₦130 trillion (~$94B) | CBN Deputy Governor, April 7 2026 |
| Merchants active on Nomba | 600,000+ | Nomba CEO public statement |
| Nomba monthly transaction volume | $1B+ | Nomba public reporting |
| Nomba merchants currently reached by credit | 2,000–20,000 (0.3–3.3%) | CEO, TechPoint Africa + TechCabal, April 2026 |
| Merchants completely unreachable by Nomba's own credit product | ~598,000 | TechCabal, April 10 2026 |

---

## Why Existing Solutions Don't Work

| Provider | Why it fails for Nomba merchants |
|---|---|
| Banks | Require collateral, salary slips, branch visits. Built for formal employment, not merchant revenue. |
| Carbon / FairMoney | Underwrite on consumer BVN credit profiles. They do not read merchant settlement data. High CAC from outbound acquisition. |
| Kuda / Anchor | No credit origination product. Purely deposit and payments infrastructure. |
| Moniepoint | POS hardware rail — not API-accessible to Nomba merchants. Different ecosystem entirely. |

None of them can read Nomba settlement data. None of them can.

---

## The Solution

**TradeLedger turns what a merchant already does on Nomba into an underwriting signal — and turns that signal into same-day working capital.**

### How it works

1. **Score:** 3+ months of Nomba transaction history → 8-dimension credit score computed automatically. No application form. No manual review.

2. **Offer:** A pre-approved advance appears in the merchant's dashboard. One tap to accept. Mandate OTP consent on Nomba.

3. **Disburse:** Funds hit the merchant's bank account in minutes via Nomba Transfers API.

4. **Repay:** 15% of weekly revenue, collected every Monday via Nomba mandate. Repayment pauses automatically if revenue drops to zero that week. The advance closes itself when the balance reaches zero.

**No forms. No collateral. No branch visit. No underwriter.**

---

## The Two-Tier Product

TradeLedger has two layers. The first is always-on. The second is opt-in and creates the moat.

| Tier | Signal used | Advance cap |
|---|---|---|
| Settlement scoring | 90-day Nomba transaction history | ₦500,000 |
| DVA receivables | Per-buyer Dedicated Virtual Accounts + payment history | ₦1,000,000 |
| DVA + Checkout | DVA buyers + tokenized card revenue | ₦1,500,000 |

**Tier 2 — the Buyer Ledger:** Merchants add buyers by name. The system provisions a real NUBAN (Nigerian bank account number) for each buyer. When that buyer pays — whether they're a business partner, wholesaler, or regular customer — the payment lands in TradeLedger's ledger, reconciled against the invoice amount, attributed to that buyer, and timestamped.

After 30–60 days, three additional scoring dimensions activate: buyer diversity, payment regularity, and concentration risk. The merchant's credit limit grows. Their profile deepens.

And the buyer's bank account number — their `senderAccountNumber` — is recorded. When the same buyer pays another TradeLedger merchant, the network sees it. This is cross-merchant payment behavior data that no credit bureau in Nigeria has.

---

## Market Size

| Level | Description | Value | Basis |
|---|---|---|---|
| **TAM** | Nigeria MSME credit gap | ₦130T (~$94B/yr) | CBN Deputy Governor, April 7 2026 |
| **SAM** | ~120K eligible Nomba merchants × ₦150K avg × 3 cycles/yr × 15% factor | ~₦8.1B/yr | Internal model |
| **SOM Year 1** | 5,000 merchants at same economics | ₦337.5M gross | Internal projection |
| **SOM Year 3** | 10K–20K merchants | ₦675M–₦1.35B/yr | Internal projection |

Exchange rate basis: ₦1,550/$.

**Demand is already proven:**
- Nomba/Globus pilot: ₦21.3B SME portfolio, sub-1% NPL over 18 months — credit quality on Nomba's merchant base is sound
- Moniepoint: ₦1 trillion disbursed to ~70,000 businesses in 2025 — demand at scale is real
- Square Loans: $5.7B originated in 2024, <3% loss rate — the RBF model works at scale globally

---

## Technology

TradeLedger runs on Nomba's full API stack:

| Nomba API | Role in TradeLedger |
|---|---|
| Transactions API | Fetches 90-day history for scoring |
| Virtual Accounts API | Provisions per-buyer NUBANs |
| Mandates API | Pre-authorized on-demand revenue-share debit |
| Transfers API | Same-day loan disbursement |
| Sub-accounts API | Escrow isolation per advance |
| Webhooks (8 events) | Real-time repayment confirmation, payment capture, failure tracking |

**Scoring engine — 8 dimensions:**

Settlement (always active):
1. Revenue Mean — volume signal
2. Consistency — coefficient of variation in daily revenue
3. Operational Streak — longest consecutive active-day run in last 30 days
4. Growth — second-half vs first-half average revenue trend
5. Channel Diversity — distinct transaction source types

DVA (activates when merchant has buyer accounts):

6. Buyer Diversity — number of buyers with ≥2 confirmed payments
7. Receivables Regularity — coefficient of variation in payment intervals (low = regular = better)
8. Concentration Penalty — −10 pts if any single buyer is >70% of DVA revenue (concentration risk)

Eligibility threshold: score ≥ 40. 15/15 tests passing.

**Stack:** Node.js + Express + Prisma + PostgreSQL (backend); React 18 + Vite + Tailwind CSS (frontend); deployed on Render.

---

## Business Model

### Unit economics per advance (₦150K average)

| Line | Value |
|---|---|
| Factor fee (flat) | 15% = ₦22,500 |
| Advance cycles per merchant per year | 3 (60–90 day repayment) |
| Gross revenue per merchant per year | ₦67,500 |
| Customer acquisition cost | ~₦0 — offer surfaces in dashboard, no outbound sales |
| Loss rate target | 6% = ₦9,000 per advance |
| Net revenue per merchant per year | ~₦40,500 |
| Net margin at scale | ~50% |

### Portfolio P&L

| Scale | Gross Revenue | Net Profit | Net Margin |
|---|---|---|---|
| 1,000 merchants | ₦67.5M | ₦40.5M | ~60% |
| 10,000 merchants | ₦675M | ₦405M | ~60% |
| 100,000 merchants | ₦6.75B | ₦4.05B | ~60% |

Break-even: ~742 active merchants at ₦2.5M/month operating burn.

LTV:CAC ratio: effectively unbounded (CAC ≈ ₦0). At a notional ₦5,000 CAC: **24:1**.

---

## What's Built

This is a working product, not a concept.

| Component | Status |
|---|---|
| 8-dimension scoring engine | Built + 15/15 tests passing |
| Advance lifecycle (apply → consent → disburse → repay → settle) | Built + sandbox-verified |
| Per-buyer DVA provisioning with reconciliation | Built |
| Revenue review cron (weekly mandate debit) | Built |
| Nightly reconciliation job (orphan detection) | Built |
| Auto-delinquency trigger (8 consecutive zero-revenue weeks) | Built |
| Cross-merchant buyer reputation endpoint | Built |
| All 8 webhook event handlers (HMAC-verified, idempotent) | Built |
| React frontend (onboarding, dashboard, consent, admin) | Built |
| Render deployment with managed PostgreSQL | Live |
| Sandbox simulator (5 routes for full demo without real API calls) | Built |

---

## Competitive Moat

Three structural advantages, each compounding over time:

### 1. Data rail
Nomba settlement data is structurally inaccessible to any lender not operating the same payment infrastructure. A bank cannot pull it. Carbon cannot pull it. Moniepoint cannot pull it. TradeLedger reads it directly from Nomba's transaction API on every scoring request. This is not a competitive advantage that can be replicated by effort — it requires operating the same rail.

### 2. Zero CAC
The advance offer appears inside the merchant's existing Nomba dashboard after 3+ months of activity. No outbound sales. No ads. No loan officers. No physical branches. The merchant finds the product the moment they become eligible. Competitors spend ₦5,000–₦50,000 per acquired borrower. TradeLedger spends nothing.

### 3. Proprietary loss model
After 12 months at 5,000 merchants, TradeLedger will have more labeled Nigerian SME credit outcomes — who repaid, who defaulted, at what revenue level, with what prior warning pattern — than any external data provider can access. This data is internal, non-transferable under any open banking mandate, and becomes more accurate with every advance cycle. The longer TradeLedger operates, the harder it is to displace.

---

## Why Now

Four conditions aligned in 2026 that did not exist before:

1. **Nomba's mandate API is production-ready.** On-demand revenue-share debit without requiring a new card or bank setup from the merchant. This is the repayment mechanism. Without it, RBF on Nomba's rail is not possible.

2. **Nomba has scale.** 600,000+ merchants, $1B+/month volume. The data pool is large enough for scoring to be meaningful.

3. **Nomba/Globus pilot has proven credit quality.** ₦21.3B deployed, sub-1% NPL over 18 months. The risk is manageable on this merchant population.

4. **Lidya's exit created a gap, not a lesson about credit.** Lidya shut down in October 2025 — $16.45M raised, $150M disbursed, sub-1% NPL. It failed because of VC funding winter and governance collapse, not credit losses. The model works. TradeLedger runs on Nomba's existing infrastructure — no external balance sheet required, no VC dependency for unit economics to hold.

---

## Roadmap

**Phase 1 — Hackathon MVP (built)**
Scoring engine, DVA buyer ledger, advance lifecycle, mandate-based repayment, webhook event processing, React frontend, Render deployment.

**Phase 2 — Pilot (Months 2–6)**
Production mandate OTP hardening. FCCPC DEON 2025 registration (90-day window from first public advance). DVA scoring calibration against real repayment outcomes. Delinquency escalation workflows.

**Phase 3 — Scale (Months 7–18)**
Nomba white-label balance sheet facility (₦500M–₦1B initial book). CBN Unit MFB license application at ₦5B book (₦20M minimum paid-up capital required by regulation at ₦10–₦20B book stage). Open banking data ingestion for non-Nomba merchant segments. ₦10B warehouse credit facility target at month 12.

---

## The Ask

**Post-hackathon:** A Nomba partnership to pilot TradeLedger with 500 live merchants on real mandate rails. Series seed financing at demonstrated <6% loss rate and 500+ merchant scale.

**Acquisition angle:** Nomba has the merchant data (600K), the mandate API (on-demand debit), and a publicly stated gap (20K/600K). TradeLedger is the productized scoring and lending layer. An acqui-hire costs less than building the scoring engine internally — and it arrives with 15 passing tests, a working codebase, a deployed product, and a filing timeline already underway.

---

## Team

**Harrison Eze** — Builder, Team Privex (Solo)

Full-stack engineer. Built TradeLedger end-to-end: scoring engine design and implementation, Nomba API integration (Transactions, Mandates, Transfers, Virtual Accounts, Webhooks), DVA reconciliation engine, advance lifecycle state machine, React frontend with mandate consent flow, Render deployment.

Contact: ceze5265@gmail.com
GitHub: [github.com/harystyleseze/TradeLedger](https://github.com/harystyleseze/TradeLedger)

---

## Appendix — Source Citations

| Claim | Source |
|---|---|
| ₦130T MSME credit gap | CBN Deputy Governor, April 7 2026 |
| 600,000+ Nomba merchants | Nomba CEO, TechPoint Africa, April 9 2026 |
| Nomba credit reaches 2,000–20,000 merchants | TechCabal, April 10 2026 |
| ~598,000 merchants unreachable | TechCabal, April 10 2026 |
| Nomba/Globus pilot: ₦21.3B, sub-1% NPL, 18 months | Nomba CEO public statement |
| Moniepoint: ₦1T to ~70K businesses in 2025 | Moniepoint public reporting |
| Square Loans: $5.7B originated in 2024, <3% loss rate | Block Inc. public financials, 2024 |
| Lidya: $16.45M raised, $150M disbursed, sub-1% NPL, shut down Oct 2025 | TechCabal / TechMoran / Techpoint, 3-source verified |
| Lidya failure cause: VC funding winter + governance collapse (not credit losses) | Primary source verified |
| 56% of Nigerian SME borrowers face access challenges | IFC 2024 Nigerian Credit Infrastructure Report |
