import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";

const FALLBACK_BANKS = [
  { code: "057", name: "Zenith Bank" },
  { code: "058", name: "GTBank" },
  { code: "044", name: "Access Bank" },
  { code: "011", name: "First Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "032", name: "Union Bank" },
];

export default function Onboard() {
  const navigate = useNavigate();
  const [banks, setBanks] = useState(FALLBACK_BANKS);
  const [form, setForm] = useState({
    customerId: "", name: "", email: "", phone: "",
    bankCode: "", accountNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dynamic bank list on mount
  useEffect(() => {
    api("/merchants/banks")
      .then((r) => r.json())
      .then((d) => {
        const list = d.banks ?? [];
        if (list.length > 0) {
          setBanks(list);
          // Set default selection to first bank if not yet selected
          setForm((f) => f.bankCode ? f : { ...f, bankCode: list[0].code });
        }
      })
      .catch(() => {
        // Keep fallback banks — already set
        setForm((f) => f.bankCode ? f : { ...f, bankCode: FALLBACK_BANKS[0].code });
      });
  }, []);

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api("/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      navigate(`/dashboard/${data.merchantId}`, { state: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper grid lg:grid-cols-2">
      {/* Form panel */}
      <div className="flex flex-col p-6 md:p-10">
        <Link to="/" className="font-display font-bold text-xl text-ink tracking-tight">
          TradeLedger
        </Link>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md">
            <h1 className="font-display font-bold text-3xl text-ink tracking-tight">
              Get your credit score in 60 seconds
            </h1>
            <p className="text-gray-500 mt-2">
              Scored from your last 90 days of Nomba revenue. Checking your score never
              affects it.
            </p>

            <form onSubmit={submit} className="mt-8 bg-white rounded-2xl border border-rule p-6 space-y-4">
              {[
                { label: "Nomba Customer ID", key: "customerId", placeholder: "cus_..." },
                { label: "Business Name", key: "name", placeholder: "Adaeze's Food Stall" },
                { label: "Email", key: "email", placeholder: "adaeze@example.com", type: "email" },
                { label: "Phone", key: "phone", placeholder: "08012345678" },
                { label: "Account Number", key: "accountNumber", placeholder: "0000000000" },
              ].map(({ label, key, placeholder, type = "text" }) => (
                <div key={key}>
                  <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    id={key}
                    type={type}
                    value={form[key]}
                    onChange={set(key)}
                    placeholder={placeholder}
                    required
                    className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                  />
                </div>
              ))}

              <div>
                <label htmlFor="bank" className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                <select
                  id="bank"
                  value={form.bankCode}
                  onChange={set("bankCode")}
                  className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                >
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink hover:bg-green-900 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-lg transition-colors"
              >
                {loading ? "Analysing your revenue..." : "Check my credit score →"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Photo panel */}
      <div className="relative hidden lg:block">
        <img
          src="/images/onboard-merchant.jpg"
          alt="A food stall owner checking his phone at his stand"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
          <p className="font-display font-semibold text-2xl leading-snug max-w-md">
            Your offer arrives on your phone — while you keep selling.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-green-100/90">
            <li>✓ Funds disbursed within minutes of consent</li>
            <li>✓ Repayment pauses automatically if revenue drops</li>
            <li>✓ No collateral, no paperwork, no branch visit</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
