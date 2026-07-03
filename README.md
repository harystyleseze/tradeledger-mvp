# TradeLedger

> Revenue-based working capital for Nigerian merchants, powered by Nomba.

TradeLedger scores Nomba merchants from 90 days of settlement data, then extends working capital advances repaid automatically at 15% of weekly revenue — no forms, no collateral, no branch visit. Merchants who add buyers via Dedicated Virtual Accounts unlock higher advance limits and a richer credit profile.

---

## Features

- **8-dimension credit scoring** — 5 settlement dimensions (revenue mean, consistency, operational streak, growth, channel diversity) + 3 DVA dimensions (buyer diversity, receivables regularity, concentration penalty)
- **Tiered advance caps** — ₦500K (settlement) → ₦1M (2+ DVA buyers) → ₦1.5M (DVA + checkout)
- **Per-buyer Dedicated Virtual Accounts** — each buyer gets a unique NUBAN; every payment is automatically reconciled as `exact`, `under`, or `over`
- **Invoice locking** — set `defaultAmountExpected` on a buyer account; reconciliation fires against it even when Nomba's webhook omits the field
- **Revenue-share repayment** — 15% of weekly revenue via Nomba mandate; pauses automatically on zero-revenue weeks
- **Auto-delinquency** — 8 consecutive zero-revenue weeks triggers advance status change and manual review alert
- **Cross-merchant buyer reputation** — `senderAccountNumber` aggregated across all merchants; query any bank account's payment history and shortfall rate network-wide
- **HMAC-SHA256 webhook verification** — `nomba-signature` header, `express.raw()` body, immediate 200 response
- **Idempotent event processing** — `webhookRequestId @unique` + Prisma P2002 catch; Nomba retries are safe
- **Sandbox simulator** — 5 routes fire synthetic webhook events for full flow demos without real API traffic

---

## Businesses where this fits really well

### 1. Wholesale distributors

A beverage distributor sells to 200 retailers every week.
Each retailer gets a dedicated virtual account.
When a retailer pays, the distributor immediately knows:
* Which retailer paid.
* Which account was used.
* How much was paid.

This is one of the strongest use cases.

### 2. Manufacturers
A manufacturer supplies multiple distributors.
Each distributor receives a dedicated account.
Payments are automatically linked to the correct distributor, making accounts receivable much easier to manage.

### 3. Schools
Each student or parent receives a unique payment account.
When school fees are paid, the system knows exactly which student the payment belongs to without relying on payment references.

### 4. Property management
Each tenant has a dedicated account for rent payments.
Incoming payments are automatically attributed to the correct tenant.

### 5. B2B businesses with recurring invoices

For example:

* Printing companies
* Logistics companies
* Medical suppliers
* Food distributors

Customers order regularly and pay multiple invoices over time. Dedicated accounts simplify reconciliation.

### 6. Subscription or wallet platforms

If customers top up balances frequently, each customer can have a persistent virtual account that they use whenever they want to add funds.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│   Onboard → Dashboard → Consent → Admin             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (same origin)
┌──────────────────────▼──────────────────────────────┐
│              Express API Server (Node.js)            │
│  /merchants  /advances  /buyers  /admin  /simulate   │
│                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  Scoring   │  │  Nomba API   │  │  Webhook    │  │
│  │  Engine    │  │  Integration │  │  Handler    │  │
│  │ (8 dims)   │  │  (auth cache)│  │ (8 events)  │  │
│  └────────────┘  └──────┬───────┘  └──────┬──────┘  │
│                         │                 │          │
│  ┌──────────────────────▼─────────────────▼──────┐  │
│  │              Prisma ORM (13 models)            │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│          PostgreSQL (Render managed database)        │
└─────────────────────────────────────────────────────┘
                          ▲
┌─────────────────────────┴───────────────────────────┐
│                   Nomba APIs                        │
│  Transactions · Mandates · Transfers                │
│  Virtual Accounts · Sub-accounts                    │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20, ES Modules |
| API framework | Express 4 |
| ORM | Prisma 5 + PostgreSQL |
| Cron jobs | node-cron |
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Charts | Recharts 2 |
| Payment API | Nomba v1 |
| Deployment | Render (single web service + managed PostgreSQL) |

---

## Repository Structure

```
tradeledger/
├── client/                  # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── pages/           # Onboard, Dashboard, Consent, Admin
│   │   └── components/      # ScoreCard, AdvanceOffer, RepaymentChart, BuyerLedger
│   └── README.md
├── server/                  # Express API server
│   ├── src/
│   │   ├── routes/          # merchants, advances, buyers, admin, simulate
│   │   ├── webhooks/        # handler + 8 event processors
│   │   ├── scoring/         # engine.js, helpers.js, __tests__/
│   │   ├── jobs/            # revenueReview.js, reconciliation.js
│   │   └── nomba/           # auth, transactions, mandates, transfers, virtualAccounts
│   ├── prisma/
│   │   └── schema.prisma    # 13 models
│   └── README.md
├── .env.example             # Environment variable template
├── render.yaml              # Render Blueprint — builds client + server, provisions DB
├── PITCH.md                 # Investor pitch deck
└── README.md                # This file
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally
- Nomba sandbox credentials ([Nomba Dashboard](https://dashboard.nomba.com) → Developers → API Keys)

### 1. Clone and configure

```bash
git clone https://github.com/harystyleseze/tradeledger-mvp.git
cd tradeledger-mvp
cp .env.example server/.env
```

Open `server/.env` and fill in all variables:

```
NOMBA_BASE_URL=https://sandbox.api.nomba.com/v1
NOMBA_CLIENT_ID=<your client ID>
NOMBA_CLIENT_SECRET=<your client secret>
NOMBA_ACCOUNT_ID=<your account ID>
NOMBA_WEBHOOK_SECRET=<your webhook secret>
DATABASE_URL=postgresql://user:password@localhost:5432/tradeledger
```

### 2. Start the backend

```bash
cd server
npm install
npx prisma migrate dev    # creates DB schema
npm run dev               # starts on http://localhost:3001
```

### 3. Start the frontend

```bash
cd ../client
npm install
npm run dev               # starts on http://localhost:5173
```

### 4. Open the app

Navigate to `http://localhost:5173`. The Vite dev proxy forwards all API calls from the frontend to the Express server.

---

## API Quick Reference

### Core flows

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/merchants` | Onboard merchant + score from 90-day transaction history |
| `GET` | `/merchants/:id` | Fetch merchant with score, advance, and buyer accounts |
| `POST` | `/advances/apply` | Apply for advance using a credit score |
| `POST` | `/advances/:id/activate` | Trigger disbursement after mandate consent |
| `GET` | `/advances/:id` | Fetch advance with repayments and transfers |

### Buyer accounts (DVA)

| Method | Path | Description |
|---|---|---|
| `POST` | `/buyers/accounts` | Provision a Dedicated Virtual Account (NUBAN) for a buyer |
| `GET` | `/buyers/accounts/:merchantId` | List all buyers with reconciliation summary |
| `GET` | `/buyers/accounts/:merchantId/:buyerAccountId` | Full buyer statement with optional `?from` / `?to` date filter |
| `PUT` | `/buyers/accounts/:id` | Rename buyer or update invoice lock amount |
| `DELETE` | `/buyers/accounts/:id` | Close buyer account (expires NUBAN on Nomba) |

### Admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/advances` | Portfolio overview — all advances, all merchants |
| `POST` | `/admin/reconcile` | Trigger nightly reconciliation job manually |
| `POST` | `/admin/revenue-review` | Trigger weekly revenue review job manually |
| `GET` | `/admin/webhooks` | Recent webhook event stream (`?event=`, `?limit=`) |
| `GET` | `/admin/unmatched-payments` | Payments received at unrecognized NUBANs |
| `GET` | `/admin/checkout-failures` | Failed checkout events grouped by reason |
| `GET` | `/admin/buyer-reputation/:senderAccount` | Cross-merchant payment behavior for a bank account |
| `GET` | `/admin/recurring-failures` | Failed tokenized card charges with dunning flags |

### Webhook receiver

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhooks/nomba` | Inbound Nomba webhook — HMAC-verified, idempotent |

### Simulator (development only)

| Method | Path | Description |
|---|---|---|
| `POST` | `/simulate/va-funded` | Simulate `virtual_account.funded` event |
| `POST` | `/simulate/payment-success` | Simulate `payment_success` event |
| `POST` | `/simulate/debit-success` | Simulate `mandate.debit_success` event |
| `POST` | `/simulate/payment-failed` | Simulate `payment_failure` event |
| `POST` | `/simulate/charge-failed` | Simulate `tokenized_card.charge_failed` event |

---

## Webhook Events

| Event | Handler | What it does |
|---|---|---|
| `virtual_account.funded` | `virtualAccountFunded` | Reconciles payment against buyer account (exact/under/over). Unknown NUBANs → `UnmatchedPayment`. Closed accounts → logged and skipped. |
| `mandate.debit_success` | `mandateDebitSuccess` | Records repayment, decrements advance balance. Balance 0 → `settled`. |
| `transfer.success` | `transferSuccess` | Confirms disbursement — sets advance to `active`. |
| `transfer.failed` | `transferFailed` | Marks transfer failed, logs disbursement error. |
| `payment_success` | `paymentSuccess` | Creates `CheckoutPayment` record. |
| `tokenized_card.charge_success` | `tokenizedCardCharge` | Creates `RecurringCharge` record. |
| `payment_failure` | `paymentFailed` | Creates `CheckoutFailure` with normalized reason. |
| `tokenized_card.charge_failed` | `recurringChargeFailed` | Creates `RecurringFailure`. Logs `dunning_threshold_reached` at ≥3 consecutive failures. |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NOMBA_BASE_URL` | Yes | Nomba API base URL |
| `NOMBA_CLIENT_ID` | Yes | OAuth2 client ID |
| `NOMBA_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `NOMBA_ACCOUNT_ID` | Yes | Nomba account ID — sent as `accountId` header on every request |
| `NOMBA_WEBHOOK_SECRET` | Yes | HMAC-SHA256 signing key for webhook verification |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | HTTP port, defaults to `3001` |
| `NODE_ENV` | No | `development` enables `/simulate` routes and dev logging |

---

## Testing

```bash
cd server && npm test
# 15 tests passing
# scoreMerchant: 10 tests (eligibility guards, dimension scoring, edge cases)
# calculateAdvance: 5 tests (multiplier range, cap tiers, repayment rate)
```

Tests run without a database — the scoring engine is pure functions.

---

## Deployment

Deployed to Render using the included `render.yaml` Blueprint. One web service hosts both the API and the React frontend; a managed PostgreSQL database is provisioned alongside it.

**Quick deploy:**
1. Push to GitHub
2. Render → New → Blueprint → connect repo → Apply
3. Set `NOMBA_CLIENT_ID`, `NOMBA_CLIENT_SECRET`, `NOMBA_ACCOUNT_ID`, `NOMBA_WEBHOOK_SECRET` in the Render environment tab
4. Webhook URL: `https://<your-render-subdomain>.onrender.com/webhooks/nomba`
