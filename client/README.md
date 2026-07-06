# TradeLedger Frontend

React 18 single-page application for TradeLedger — a B2B financial operations and embedded lending platform built on Nomba. The frontend provides merchant onboarding (dynamic sub-account creation), DVA management, online checkout links, a multi-tabbed Wallet for withdrawals and VAS (Airtime, Data, Power, TV), and a credit scoring/advance application portal.

In production, the Express API server builds and serves this application as static files from the same process — no separate hosting or CDN required.

---

## Tech Stack

| Package | Version | Role |
|---|---|---|
| React | 18.3 | UI library |
| React Router DOM | 6.23 | Client-side routing |
| Recharts | 2.12 | Credit score gauge + repayment area chart |
| Vite | 5.3 | Dev server + production bundler |
| Tailwind CSS | 3.4 | Utility-first styling |
| PostCSS + Autoprefixer | — | CSS processing pipeline |

---

## Pages

| Route | Component | Description |
|---|---|---|
| `/` | `Landing` | Marketing landing page — hero with live ledger card, stats, how-it-works, advance tiers |
| `/onboard` | `Onboard` | Merchant registration form — submits to `POST /merchants`, navigates to dashboard on success |
| `/dashboard/:merchantId` | `Dashboard` | Credit score display, advance offer or repayment tracker, score breakdown, buyer ledger |
| `/consent` | `Consent` | Mandate authorization — opens Nomba consent URL, polls `GET /advances/:id` until `status: "active"` |
| `/admin` | `Admin` | Lender portfolio view — stat cards, all advances, reconciliation trigger |
| `*` | redirect | Unknown paths redirect to `/` |

---

## Components

| Component | Used In | Description |
|---|---|---|
| `ScoreCard` | Dashboard | Recharts `RadialBarChart` credit score gauge (0–100). Color: green ≥70, amber ≥40, red <40. |
| `AdvanceOffer` | Dashboard | Pre-approved advance offer card with amount, terms, and "Apply" CTA. Shown when eligible, no active advance. |
| `RepaymentChart` | Dashboard | Recharts `AreaChart` of declining advance balance over repayment history. Shows progress % and week-by-week breakdown. |
| `BuyerLedger` | Dashboard | DVA management panel — add buyers (creates NUBAN), copy account numbers, view payment history, track reconciliation status per buyer. |

---

## Running Locally

The backend must be running on port 3001 before starting the frontend.

```bash
# Start the backend first
cd ../server && npm run dev

# Then start the frontend
npm install
npm run dev
# → http://localhost:5173
```

All API calls use relative paths (`/merchants`, `/advances`, etc.). Vite's dev proxy forwards them to `http://localhost:3001`.

---

## Dev Proxy

The Vite dev server proxies all API prefixes to the Express backend. This prevents CORS errors during development:

```javascript
// vite.config.js
proxy: {
  "/merchants": "http://localhost:3001",
  "/advances":  "http://localhost:3001",
  "/admin":     "http://localhost:3001",
  "/buyers":    "http://localhost:3001",
  "/simulate":  "http://localhost:3001",
  "/webhooks":  "http://localhost:3001",
  "/health":    "http://localhost:3001",
}
```

In production, the Express server serves `client/dist/` as static files, so the same-origin API calls work without any proxy.

---

## Build for Production

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally for verification
```

The `dist/` folder is served by the Express server in production via `express.static()`. React Router's `BrowserRouter` is handled by a catch-all route in Express that returns `index.html` for all non-API paths.

---

## Routing

Entry point (`main.jsx`) wraps the app in `React.StrictMode` and `BrowserRouter`.

Navigation patterns:
- **Onboard → Dashboard:** `useNavigate` with `state: serverResponse` to pass the initial score data without a second fetch
- **Dashboard → Consent:** `useNavigate` with `?advanceId=&consentUrl=` query string
- **Consent → Dashboard:** `useNavigate` after polling confirms `advance.status === "active"`
- **Admin → Onboard:** plain `<a href="/">` anchor

---

## State Management

All state is local (`useState` / `useEffect`). No global store.

- `Onboard`: `form`, `loading`, `error`
- `Dashboard`: `data` (score + merchant), `advance`, `buyers`, `applying`, `error`
- `Consent`: `advance`, `loading`, `authorized`, `polling`
- `Admin`: `portfolio`, `reconciling`
- `BuyerLedger`: `buyers`, `buyerName`, `adding`, `error`, `expandedId`

---

## Styling

Tailwind CSS 3 with no custom plugins. Key conventions:

- **Brand:** `green-600` / `green-700` for CTAs, score bars, and the TradeLedger wordmark
- **Cards:** `bg-white rounded-2xl border border-gray-100 p-6 shadow-sm`
- **Layout:** `max-w-md` (Onboard), `max-w-3xl` (Dashboard), `max-w-5xl` (Admin), centered with `mx-auto p-4 md:p-8`
- **Score colors:** green-600 (≥70), amber-500 (≥40), red-500 (<40) — applied consistently across `ScoreCard`, score text, and progress bars

---

## Score Breakdown Dimensions

The Dashboard renders 8 scoring dimensions as labeled progress bars:

**Settlement dimensions (always shown):**
- Revenue Level — max 30 pts
- Consistency — max 20 pts
- Operational Streak — max 20 pts
- Growth Trend — max 15 pts
- Channel Diversity — max 15 pts

**DVA dimensions (shown when merchant has buyer accounts):**
- Buyer Diversity — max +15 pts
- Receivables Regularity — max +10 pts
- Concentration Penalty — 0 or −10 pts (rendered in red if negative)
