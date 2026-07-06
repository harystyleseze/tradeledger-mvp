import { Link } from "react-router-dom";

// The signature element: a live ledger excerpt — the artifact the product produces.
const LEDGER_ROWS = [
  { payer: "Kafilat Stores", amount: "₦50,000", status: "exact", time: "Mon 09:14" },
  { payer: "Danladi Wholesale", amount: "₦45,000", status: "under", time: "Mon 11:02" },
  { payer: "Chika & Sons", amount: "₦82,500", status: "exact", time: "Tue 08:47" },
  { payer: "Musa Distribution", amount: "₦120,000", status: "over", time: "Tue 15:30" },
];

const BADGE = {
  exact: "bg-green-50 text-leaf border-green-200",
  under: "bg-amber-50 text-market border-amber-200",
  over: "bg-blue-50 text-blue-600 border-blue-200",
};

function ReconBadge({ status }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${BADGE[status]}`}>
      {status}
    </span>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <nav className="border-b border-rule bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <span className="font-display font-bold text-xl text-ink tracking-tight">TradeLedger</span>
          <div className="flex items-center gap-6 text-sm">
            <a href="#features" className="text-gray-600 hover:text-ink hidden sm:block">Features</a>
            <a href="#lending" className="text-gray-600 hover:text-ink hidden sm:block">Embedded Lending</a>
            <Link
              to="/onboard"
              className="bg-ink hover:bg-green-900 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-market font-semibold text-sm uppercase tracking-widest mb-4">
            Built on Nomba
          </p>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-ink leading-[1.08] tracking-tight">
            The Financial Operating System for B2B Trade.
          </h1>
          <p className="mt-5 text-lg text-gray-600 leading-relaxed">
            TradeLedger digitizes your supply chain payments, handles automated reconciliation,
            powers your business treasury, and uses your transaction history to unlock credit.
            One platform, zero paperwork.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/onboard"
              className="bg-ink hover:bg-green-900 text-white font-semibold px-6 py-3.5 rounded-lg transition-colors"
            >
              Onboard my business →
            </Link>
            <a
              href="#features"
              className="border border-rule bg-white hover:bg-gray-50 text-charcoal font-semibold px-6 py-3.5 rounded-lg transition-colors"
            >
              Explore features
            </a>
          </div>
        </div>

        {/* Signature: the live ledger card over the hero photo */}
        <div className="relative">
          <img
            src="/images/hero-merchant.jpg"
            alt="A Nigerian shop owner receiving payment at her store counter"
            className="rounded-2xl object-cover w-full h-[420px] md:h-[480px]"
          />
          <div className="absolute -bottom-6 -left-2 md:-left-8 bg-white rounded-xl border border-rule shadow-lg p-4 w-[92%] md:w-[380px]">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold text-sm text-ink">Buyer Ledger</p>
              <span className="text-[11px] text-gray-400 uppercase tracking-wide">Live reconciliation</span>
            </div>
            <div className="divide-y divide-gray-50">
              {LEDGER_ROWS.map((r) => (
                <div key={r.payer} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{r.payer}</p>
                    <p className="text-[11px] text-gray-400">{r.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tnum">{r.amount}</span>
                    <ReconBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Stats strip */}
      <section className="bg-ink text-white mt-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { value: "100%", label: "automated payment reconciliation" },
            { value: "4+", label: "value-added services built-in" },
            { value: "₦1.5M", label: "instant credit for eligible merchants" },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display font-bold text-3xl md:text-4xl tnum">{s.value}</p>
              <p className="mt-2 text-green-100/80 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-4 md:px-6 py-20">
        <h2 className="font-display font-bold text-3xl text-ink tracking-tight text-center">
          Everything your B2B business needs
        </h2>
        <p className="mt-3 text-gray-600 text-center max-w-xl mx-auto">
          We rebuilt merchant financial operations from the ground up using Nomba's infrastructure.
        </p>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {[
            {
              title: "Auto-Reconciliation Ledger",
              body: "Create Dedicated Virtual Accounts (DVAs) for each buyer. Know instantly who paid what, with underpayments and overpayments flagged automatically.",
              icon: "📊"
            },
            {
              title: "Treasury Wallet & VAS",
              body: "Manage your pooled funds in one place. Withdraw to any bank or pay for essential business services (Airtime, Data, Power, TV) directly from your dashboard.",
              icon: "💼"
            },
            {
              title: "Smart Checkout Links",
              body: "Generate secure, one-time payment links for ad-hoc customers. Process seamless refunds with a single click if an order goes wrong.",
              icon: "🔗"
            },
            {
              title: "Embedded Credit Scoring",
              body: "Your transaction history is automatically analyzed across 8 dimensions to build a verifiable credit profile and unlock instant working capital.",
              icon: "📈"
            },
          ].map((feature, i) => (
            <div key={feature.title} className="bg-white rounded-2xl border border-rule p-6 flex gap-4">
              <div className="text-3xl">{feature.icon}</div>
              <div>
                <h3 className="font-display font-semibold text-lg text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lending Section */}
      <section id="lending" className="bg-white border-y border-rule">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <img
            src="/images/market-vendor.jpg"
            alt="A vendor at a Nigerian market stall with baskets of fresh peppers and tomatoes"
            className="rounded-2xl object-cover w-full h-[360px]"
          />
          <div>
            <p className="text-market font-semibold text-sm uppercase tracking-widest mb-3">
              Embedded Lending
            </p>
            <h2 className="font-display font-bold text-3xl text-ink tracking-tight">
              Your sales record is your collateral.
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We turn what you already do—collecting payments from buyers—into an underwriting
              signal. No forms. No collateral. No branch visits. TradeLedger reads your Nomba
              settlement data and pre-approves you for advances.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-600">
              {[
                "15% of weekly revenue is the only repayment rule",
                "Repayments pause automatically on zero-revenue weeks",
                "Your regular buyers raise your advance limit",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-leaf font-bold">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Credit Tiers */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-20">
        <h2 className="font-display font-bold text-3xl text-ink tracking-tight text-center">
          Credit limits that grow with your business
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            {
              cap: "₦500,000",
              name: "Settlement",
              body: "Available to any merchant with 90 days of Nomba history and a score of 40 or above.",
              highlight: false,
            },
            {
              cap: "₦1,000,000",
              name: "Buyer Ledger",
              body: "Unlock by adding 2+ buyers with confirmed payment history on their dedicated accounts.",
              highlight: true,
            },
            {
              cap: "₦1,500,000",
              name: "Ledger + Checkout",
              body: "The full profile: buyer ledger plus active online checkout revenue.",
              highlight: false,
            },
          ].map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl p-6 border ${
                t.highlight
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-charcoal border-rule"
              }`}
            >
              <p className={`text-sm font-semibold uppercase tracking-widest ${t.highlight ? "text-green-200" : "text-market"}`}>
                {t.name}
              </p>
              <p className="font-display font-bold text-3xl mt-3 tnum">{t.cap}</p>
              <p className={`mt-3 text-sm leading-relaxed ${t.highlight ? "text-green-100/80" : "text-gray-600"}`}>
                {t.body}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            to="/onboard"
            className="inline-block bg-ink hover:bg-green-900 text-white font-semibold px-8 py-4 rounded-lg transition-colors"
          >
            Start using TradeLedger today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display font-bold text-ink">TradeLedger</span>
          <p className="text-sm text-gray-500">
            A complete B2B financial operating system · Built on the Nomba API
          </p>
          <Link to="/admin" className="text-sm text-gray-400 hover:text-gray-600">
            Lender portal →
          </Link>
        </div>
      </footer>
    </div>
  );
}
