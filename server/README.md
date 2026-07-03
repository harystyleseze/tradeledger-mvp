# TradeLedger API Server

Revenue-based working capital for Nigerian merchants. The server scores Nomba merchants from their transaction history, issues cash advances, and collects repayments automatically via the Nomba Mandates API.

---

## Requirements

- Node.js 20+
- PostgreSQL 14+
- Nomba sandbox credentials (Client ID, Client Secret, Account ID)

---

## Installation

```bash
npm install
npx prisma generate
npx prisma migrate dev    # creates the database and runs all migrations
npm run dev               # development server with hot reload (node --watch)
npm start                 # production
npm test                  # run scoring engine tests (15 tests, no DB required)
```

---

## Environment Variables

Copy `.env.example` from the project root and fill in all values:

```bash
cp ../.env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `NOMBA_BASE_URL` | Yes | `https://sandbox.api.nomba.com/v1` (sandbox) or `https://api.nomba.com/v1` (production) |
| `NOMBA_CLIENT_ID` | Yes | OAuth2 client ID — Nomba Dashboard → Developers → API Keys |
| `NOMBA_CLIENT_SECRET` | Yes | OAuth2 client secret — same location |
| `NOMBA_ACCOUNT_ID` | Yes | Your Nomba account ID — sent as `accountId` header on every API call |
| `NOMBA_WEBHOOK_SECRET` | Yes | HMAC-SHA256 signing key for verifying `nomba-signature` on inbound webhooks |
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/tradeledger` |
| `PORT` | No | HTTP port, defaults to `3001` |
| `NODE_ENV` | No | `development` (enables `/simulate` routes) or `production` (disables them, serves React static files) |

---

## API Reference

### Health

#### `GET /health`

Returns server status.

```json
{ "status": "ok", "env": "development", "ts": "2026-07-01T10:00:00.000Z" }
```

---

### Merchants — `/merchants`

#### `POST /merchants`

Onboard a merchant, score them from 90 days of Nomba transaction history, and return a pre-approved advance offer.

**Flow:** bank account lookup → transaction history fetch → 8-dimension scoring → advance calculation → persist `CreditScore`

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `customerId` | string | Yes | Nomba customer ID (e.g. `cus_...`) |
| `name` | string | Yes | Business name |
| `email` | string | Yes | Contact email |
| `phone` | string | Yes | Phone number |
| `bankCode` | string | Yes | Nigerian bank code (e.g. `"057"` for Zenith) |
| `accountNumber` | string | Yes | Bank account number for disbursement |

**Response:**

```json
{
  "merchantId": "clxxx...",
  "scoreId": "clyyy...",
  "score": 72,
  "eligible": true,
  "breakdown": {
    "revenueMean": 25,
    "consistency": 18,
    "operationalStreak": 16,
    "growth": 10,
    "channelDiversity": 10,
    "buyerDiversity": 10,
    "receivablesRegularity": 7,
    "concentrationPenalty": 0
  },
  "advanceOffer": {
    "amountKobo": 100000000,
    "amountNaira": 1000000,
    "repaymentRate": 0.15
  },
  "reason": null
}
```

If ineligible: `eligible: false`, `advanceOffer: null`, `reason: "insufficient_history" | "insufficient_days" | "score_below_threshold"`.

---

#### `GET /merchants/:id`

Fetch a merchant with their latest credit score, active advance (with last 10 repayments), and all buyer accounts (with last 5 payments each).

```json
{
  "id": "clxxx...",
  "name": "Adaeze Electronics",
  "email": "adaeze@example.com",
  "scores": [{ "score": 72, "eligible": true, "breakdown": {...}, "createdAt": "..." }],
  "advances": [{
    "id": "claaa...",
    "amount": 100000000,
    "balance": 60000000,
    "status": "active",
    "repayments": [...]
  }],
  "buyerAccounts": [...]
}
```

---

### Advances — `/advances`

#### `POST /advances/apply`

Apply for an advance using a previously generated credit score.

**Request body:**

| Field | Type | Required |
|---|---|---|
| `merchantId` | string | Yes |
| `scoreId` | string | Yes |

**Flow:** validates score belongs to merchant and is eligible → creates Nomba sub-account (escrow) → creates Nomba mandate → persists `Advance` with status `pending_consent`

**Response:**

```json
{
  "advanceId": "clbbb...",
  "amount": 100000000,
  "amountNaira": 1000000,
  "mandateId": "mnd_...",
  "consentUrl": "https://sandbox.nomba.com/mandates/consent/...",
  "status": "pending_consent"
}
```

The merchant completes mandate authorization at `consentUrl`. Once done, call `/advances/:id/activate`.

---

#### `POST /advances/:id/activate`

Trigger loan disbursement after the merchant authorizes the mandate. The advance remains in `pending_consent` until the `transfer.success` webhook fires, at which point it becomes `active`.

No request body. Returns:

```json
{ "advanceId": "clbbb...", "merchantTxRef": "payout_clbbb..._1234567890", "message": "Disbursement initiated" }
```

---

#### `GET /advances/:id`

Fetch a single advance with all repayments and transfers.

```json
{
  "id": "clbbb...",
  "amount": 100000000,
  "amountNaira": 1000000,
  "balance": 60000000,
  "balanceNaira": 600000,
  "totalRepaid": 40000000,
  "totalRepaidNaira": 400000,
  "progressPercent": 40,
  "status": "active",
  "repaymentRate": 0.15,
  "repayments": [...],
  "transfers": [...]
}
```

---

### Buyer Accounts (DVA) — `/buyers`

Dedicated Virtual Accounts — each buyer gets a unique NUBAN. Payments to that NUBAN are automatically reconciled against the expected invoice amount.

#### `POST /buyers/accounts`

Provision a Nomba Virtual Account for a buyer.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `merchantId` | string | Yes | Merchant who owns this buyer relationship |
| `buyerName` | string | Yes | Buyer display name — becomes the NUBAN account name |
| `defaultAmountExpected` | integer | No | Invoice lock amount in kobo. Every payment to this NUBAN reconciles against this amount when the webhook carries no `amountExpected`. |

**Response:**

```json
{
  "buyerAccountId": "clccc...",
  "buyerName": "Kafilat Stores",
  "accountNumber": "0123456789",
  "bankCode": "999",
  "nombaVirtualAccountId": "va_...",
  "defaultAmountExpected": 5000000,
  "message": "Share this account number with your buyer to start capturing payments"
}
```

---

#### `GET /buyers/accounts/:merchantId`

List all buyer accounts with reconciliation summary (totals per buyer).

```json
{
  "count": 3,
  "buyers": [{
    "id": "clccc...",
    "buyerName": "Kafilat Stores",
    "accountNumber": "0123456789",
    "status": "active",
    "defaultAmountExpected": 5000000,
    "totalReceivedKobo": 45000000,
    "totalReceivedNaira": 450000,
    "paymentCount": 9,
    "lastPayment": "2026-06-28T...",
    "reconciliation": {
      "totalExpectedKobo": 45000000,
      "totalShortfallKobo": 0,
      "totalSurplusKobo": 0,
      "exactPayments": 8,
      "underpayments": 1,
      "overpayments": 0
    },
    "payments": [...]
  }]
}
```

---

#### `GET /buyers/accounts/:merchantId/:buyerAccountId`

Full buyer statement. Supports optional date range filtering.

**Query params:** `?from=2026-06-01&to=2026-06-30` (ISO date strings, both optional)

Each payment in the response includes `id`, `amount`, `amountExpected`, `payer`, `senderAccountNumber`, `receivedAt`, `reconciliationStatus` (`exact` | `under` | `over`), `shortfall`, `surplus`.

---

#### `PUT /buyers/accounts/:id`

Rename a buyer and/or update the invoice lock amount. Syncs the name change to Nomba.

**Request body:**

| Field | Type | Required |
|---|---|---|
| `merchantId` | string | Yes |
| `buyerName` | string | No |
| `defaultAmountExpected` | integer \| null | No — pass `null` to clear the lock |

Returns 409 if the account is already closed.

---

#### `DELETE /buyers/accounts/:id`

Close a buyer account. Expires the NUBAN on Nomba (idempotent — "already expired" errors are swallowed) and marks the account `closed` in the database.

**Request body:** `{ "merchantId": "..." }`

Returns `204 No Content`.

---

### Admin — `/admin`

#### `GET /admin/advances`

Portfolio overview — all advances across all merchants, all statuses.

```json
{
  "count": 42,
  "advances": [{
    "id": "clbbb...",
    "merchant": "Adaeze Electronics",
    "email": "adaeze@example.com",
    "amountNaira": 1000000,
    "balanceNaira": 600000,
    "totalRepaidNaira": 400000,
    "progressPercent": 40,
    "status": "active",
    "createdAt": "..."
  }]
}
```

---

#### `POST /admin/reconcile`

Manually trigger the nightly reconciliation job. Returns immediately; job runs asynchronously.

```json
{ "message": "Reconciliation started" }
```

---

#### `POST /admin/revenue-review`

Manually trigger the weekly revenue review job. Returns immediately; job runs asynchronously. Useful for demos.

---

#### `GET /admin/webhooks`

Recent webhook event stream for integration debugging.

**Query params:** `?limit=50` (max 200), `?event=virtual_account.funded` (filter by event type)

---

#### `GET /admin/unmatched-payments`

Payments received at NUBANs not managed by TradeLedger (recorded for audit).

**Query params:** `?limit=50` (max 200)

---

#### `GET /admin/checkout-failures`

Failed `payment_failure` checkout events, grouped by failure reason.

```json
{
  "count": 5,
  "byReason": { "card_declined": 3, "insufficient_funds": 2 },
  "failures": [...]
}
```

---

#### `GET /admin/buyer-reputation/:senderAccount`

Cross-merchant payment behavior for a given bank account number. Aggregates `BuyerPayment` records across all TradeLedger merchants where `senderAccountNumber` matches.

**Params:** `:senderAccount` — the payer's bank account number

```json
{
  "senderAccount": "0123456789",
  "totalPayments": 12,
  "merchantCount": 3,
  "totalPaidKobo": 120000000,
  "totalPaidNaira": 1200000,
  "shortfallRate": "8%",
  "reconciliation": { "exact": 10, "under": 1, "over": 1 },
  "merchants": [
    { "merchantId": "...", "merchantName": "Adaeze Electronics", "paymentCount": 5, "totalPaidKobo": 50000000, "totalPaidNaira": 500000 }
  ],
  "recentPayments": [...]
}
```

Returns 404 if no payment history found for this account number.

---

#### `GET /admin/recurring-failures`

Failed `tokenized_card.charge_failed` events. Highlights dunning cases (3+ consecutive failures).

```json
{
  "count": 8,
  "dunningCaseCount": 2,
  "failures": [{
    "tokenId": "tok_...",
    "consecutiveFailures": 4,
    "dunningTriggered": true,
    ...
  }]
}
```

---

### Simulate Routes — `/simulate`

**Only active when `NODE_ENV !== "production"`.**

These routes fire synthetic webhook events directly into the event handler functions, bypassing HMAC verification. Use them to test the full flow in a sandbox environment without triggering real Nomba webhooks.

| Method | Path | Required Body | Optional Body | Triggers |
|---|---|---|---|---|
| POST | `/simulate/va-funded` | `virtualAccountId`, `amount` | `amountExpected`, `payer`, `senderAccountNumber` | `virtual_account.funded` |
| POST | `/simulate/payment-success` | `merchantId`, `orderId`, `amount` | — | `payment_success` |
| POST | `/simulate/debit-success` | `mandateId`, `advanceId`, `amount` | `weekRevenue` (defaults to `amount`) | `mandate.debit_success` |
| POST | `/simulate/payment-failed` | `merchantId` | `orderId`, `amount`, `failureReason` | `payment_failure` |
| POST | `/simulate/charge-failed` | `merchantId`, `tokenId` | `amount`, `failureReason` | `tokenized_card.charge_failed` |

Each response: `{ "ok": true, "simulated": "<event_type>", "event": { ... } }`

**Demo — reconciliation engine:**
```bash
# Underpayment: ₦45K received against ₦50K expected
POST /simulate/va-funded
{ "virtualAccountId": "va_...", "amount": 4500000, "amountExpected": 5000000 }
# → reconciliationStatus: "under", shortfall: 500000

# Overpayment: ₦55K received against ₦50K expected
POST /simulate/va-funded
{ "virtualAccountId": "va_...", "amount": 5500000, "amountExpected": 5000000 }
# → reconciliationStatus: "over", surplus: 500000

# Cross-merchant buyer reputation
POST /simulate/va-funded   # merchant A's buyer account
{ ..., "senderAccountNumber": "0987654321" }
POST /simulate/va-funded   # merchant B's buyer account
{ ..., "senderAccountNumber": "0987654321" }
GET /admin/buyer-reputation/0987654321
# → merchantCount: 2, full cross-merchant aggregate
```

---

## Webhook Events

### Security

All inbound webhooks arrive at `POST /webhooks/nomba`. The handler:

1. Reads the raw request body with `express.raw({ type: "application/json" })` — this middleware **must be registered before** `express.json()` globally, otherwise HMAC verification will fail.
2. Computes `HMAC-SHA256(body, NOMBA_WEBHOOK_SECRET)` and compares it to the `nomba-signature` header.
3. Returns `200` **immediately** before any processing — this stops Nomba's retry mechanism.
4. Writes the event to the `WebhookEvent` table. If `requestId` already exists (Prisma P2002), the event is silently dropped (idempotent dedup).
5. Dispatches to the appropriate handler asynchronously.

```javascript
// Verification pattern
const sig = req.header("nomba-signature");
const expected = crypto
  .createHmac("sha256", process.env.NOMBA_WEBHOOK_SECRET)
  .update(req.body)   // req.body must be Buffer (express.raw), not parsed JSON
  .digest("hex");

if (!sig || sig !== expected) return res.status(401).send("invalid signature");
```

### Event Handlers

| Nomba Event | What it does |
|---|---|
| `virtual_account.funded` | Looks up `BuyerAccount` by `nombaVirtualAccountId`. If unknown NUBAN → creates `UnmatchedPayment`. If closed → logs and skips. Otherwise resolves `effectiveExpected` (webhook payload → account default → null), computes reconciliation status (`exact`/`under`/`over`), creates `BuyerPayment`. |
| `mandate.debit_success` | Finds `Advance` by `mandateId`. Creates `Repayment` (status `success`). Decrements `advance.balance`. If balance reaches 0 → sets advance to `settled`. |
| `transfer.success` | Finds `Transfer` by `merchantTxRef`. Sets transfer `success`. Sets parent `Advance` to `active` (disbursement confirmed). |
| `transfer.failed` | Finds `Transfer` by `merchantTxRef`. Sets transfer `failed`. Logs `disbursement_failed`. |
| `payment_success` | Creates `CheckoutPayment` record (idempotent on `orderId`). |
| `tokenized_card.charge_success` | Creates `RecurringCharge` record. |
| `payment_failure` | Normalizes `failureReason` → `card_declined` \| `insufficient_funds` \| `expired_card` \| `unknown`. Creates `CheckoutFailure`. |
| `tokenized_card.charge_failed` | Counts recent failures for `(merchantId, tokenId)` in last 30 days. Creates `RecurringFailure`. Logs `dunning_threshold_reached` if `consecutiveFailures >= 3`. |

---

## Scoring Engine

### `scoreMerchant(transactions)` — synchronous

Input: raw Nomba transaction array. Returns `{ score, eligible, breakdown, reason? }`.

Early exits (score: 0, eligible: false):
- 0 transactions or fewer than 10 successful → `reason: "insufficient_history"`
- Fewer than 7 distinct active days → `reason: "insufficient_days"`

**5 settlement dimensions (100 pts total):**

| Dimension | Max | Formula |
|---|---|---|
| Revenue Mean | 30 | `min(30, (mean_daily_kobo / 2,000,000) × 30)` — full score at ₦20,000/day average |
| Consistency | 20 | `max(0, 20 × (1 − min(CV, 1)))` where CV = stddev/mean. Perfect consistency = 20. |
| Operational Streak | 20 | Longest consecutive active-day run in last 30 days ÷ 30 × 20 |
| Growth | 15 | `min(15, max(0, 15 × (1 + growthRate)))` where growthRate = (last-half avg − first-half avg) / first-half avg |
| Channel Diversity | 15 | `min(15, distinct_sources × 5)` — 1 channel = 5pts, 2 = 10, 3+ = 15 |

Eligible if `total >= 40`.

---

### `scoreMerchantFull(merchantId, transactions)` — async

Calls `scoreMerchant` first, then enriches with 3 DVA dimensions if the merchant has active buyer accounts.

**3 DVA dimensions:**

| Dimension | Range | Formula |
|---|---|---|
| Buyer Diversity | +0 to +15 | `min(15, activeBuyers × 5)` where activeBuyers = accounts with ≥ 2 payments in 90 days |
| Receivables Regularity | +0 to +10 | `round(10 × (1 − min(intervalCV, 1)))` — low CV of payment intervals = high regularity |
| Concentration Penalty | 0 or −10 | −10 if any single buyer exceeds 70% of total DVA revenue |

Final score: `clamp(0, 100, baseScore + dvaDelta)`. Returns `dvaEnriched: false` if no buyer accounts exist.

---

### `calculateAdvance(score, weeklyRevenueKobo, dvaBuyerCount, hasCheckout)`

| Condition | Advance Cap |
|---|---|
| Settlement only (score ≥ 40) | ₦500,000 (50,000,000 kobo) |
| DVA with ≥ 2 confirmed buyers | ₦1,000,000 (100,000,000 kobo) |
| DVA ≥ 2 buyers + checkout active | ₦1,500,000 (150,000,000 kobo) |

Multiplier: `1.2 + ((score − 40) / 60) × 1.8` → ranges from 1.2× (score 40) to 3.0× (score 100), applied to `weeklyRevenue`, then capped at the tier ceiling.

---

## Database Schema

| Model | Key Fields | Unique Constraints | Relations |
|---|---|---|---|
| `Merchant` | customerId, name, email, phone, bankCode, accountNumber, accountName, status | `customerId` | → CreditScore[], Advance[], BuyerAccount[], CheckoutPayment[], RecurringCharge[], CheckoutFailure[], RecurringFailure[] |
| `CreditScore` | merchantId, score (0–100), eligible, breakdown (JSON), weeklyRevenue, reason | — | → Merchant, ← Advance (1:1) |
| `Advance` | merchantId, scoreId, mandateId, subAccountId, amount, balance, repaymentRate (0.15), status, settledAt | `scoreId`, `mandateId` | → Merchant, CreditScore, Repayment[], Transfer[] |
| `Repayment` | advanceId, amount, weekRevenue, mandateDebitRef, status, retryCount | `mandateDebitRef` | → Advance |
| `Transfer` | advanceId, merchantTxRef, amount, bankCode, accountNumber, accountName, status | `merchantTxRef` | → Advance |
| `WebhookEvent` | requestId, event, payload (JSON), processed | `requestId` | — |
| `BuyerAccount` | merchantId, nombaVirtualAccountId, customerReference, accountNumber, bankCode, status, closedAt, defaultAmountExpected | `nombaVirtualAccountId` | → Merchant, BuyerPayment[] |
| `BuyerPayment` | buyerAccountId, amount, payer, receivedAt, webhookRequestId, reconciliationStatus, amountExpected, surplus, shortfall, senderAccountNumber | `webhookRequestId` | → BuyerAccount |
| `UnmatchedPayment` | nombaAccountId, amount, senderName, senderAccount, webhookRequestId | `webhookRequestId` | — |
| `CheckoutPayment` | merchantId, amount, orderId, webhookRequestId | `orderId`, `webhookRequestId` | → Merchant |
| `RecurringCharge` | merchantId, amount, tokenId, webhookRequestId | `webhookRequestId` | → Merchant |
| `CheckoutFailure` | merchantId, orderId, amount, failureReason, webhookRequestId | `webhookRequestId` | → Merchant |
| `RecurringFailure` | merchantId, tokenId, amount, failureReason, consecutiveFailures, webhookRequestId | `webhookRequestId` | → Merchant |

All monetary columns are `Int` (kobo). Never `Float` for money.

---

## Cron Jobs

Both jobs start automatically on server boot (`src/index.js`). Both are also manually triggerable via the admin API for demo purposes.

### Revenue Review — `src/jobs/revenueReview.js`

**Schedule:** `"0 5 * * 1"` — every Monday at 05:00 UTC (06:00 WAT)

For each `active` advance:
1. Fetch last 7 days of Nomba transactions
2. Sum successful amounts as `weekRevenue`
3. If `weekRevenue === 0`: create a `skipped` Repayment; check the last 8 repayments — if all 8 are `skipped`, mark advance as `delinquent` and log `manual_review_required`
4. If revenue exists: compute `repayAmount = floor(weekRevenue × 0.15)` capped at `advance.balance`; call `POST /mandates/:id/debit` — the Repayment record is created by the subsequent `mandate.debit_success` webhook

### Nightly Reconciliation — `src/jobs/reconciliation.js`

**Schedule:** `"0 1 * * *"` — every day at 01:00 UTC (02:00 WAT)

Fetches yesterday's Nomba transactions and yesterday's `success` Repayments from the local DB. Any Nomba `merchantTxRef` not present locally is logged as a `reconciliation_orphan` (discrepancy alert). Reports `nombaCount`, `localCount`, `orphans`.

---

## Security

- **Webhook HMAC:** All inbound webhooks verified with HMAC-SHA256. See Webhook Events section above.
- **Idempotency:** Every event table has a `webhookRequestId @unique` constraint. Duplicate events (Prisma P2002) are silently dropped — Nomba's retry mechanism is safe.
- **Money as integers:** All amounts stored and computed as kobo (`Int`). No floating-point arithmetic on monetary values.
- **Simulate routes disabled in production:** `NODE_ENV=production` causes `src/routes/simulate.js` to not be registered. The `/simulate/*` paths return 404 in production.
- **Token caching:** The Nomba OAuth2 token is cached for 55 minutes (token TTL is 60 minutes). A single `getToken()` call is made per cache miss; all other requests reuse the cached token without hitting the auth endpoint.

---

## Testing

```bash
npm test
# 15 tests across 2 suites — no database or network calls required
```

Tests cover `scoreMerchant` (10 tests) and `calculateAdvance` (5 tests). The DVA-enriched `scoreMerchantFull` requires a real database and is validated manually via the simulate routes.

Test file: `src/scoring/__tests__/engine.test.js`
Runner: Jest with `--experimental-vm-modules` (required for ESM)
