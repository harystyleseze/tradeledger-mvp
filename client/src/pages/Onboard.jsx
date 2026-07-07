import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import SearchableSelect from "../components/SearchableSelect.jsx";

const FALLBACK_BANKS = [
  { code: "057", name: "Zenith Bank" },
  { code: "058", name: "GTBank" },
  { code: "044", name: "Access Bank" },
  { code: "011", name: "First Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "United Bank for Africa" },
  { code: "050", name: "EcoBank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "068", name: "Standard Chartered" },
  { code: "214", name: "FCMB" },
  { code: "023", name: "Citibank" },
  { code: "215", name: "Unity Bank" },
  { code: "100033", name: "Palmpay" },
  { code: "100004", name: "OPay" },
  { code: "100040", name: "Moniepoint" },
  { code: "090267", name: "Kuda Bank" },
];

export default function Onboard() {
  const navigate = useNavigate();
  const [banks, setBanks] = useState(FALLBACK_BANKS);
  const [form, setForm] = useState({
    customerId: "", name: "", email: "", phone: "",
    bankCode: "", accountNumber: "", password: "", confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("new"); // "new", "link", "login"

  // Fetch dynamic bank list on mount
  useEffect(() => {
    api("/merchants/banks")
      .then((r) => r.json())
      .then((d) => {
        const list = d.banks ?? [];
        if (list.length > 0) {
          setBanks(list);
        }
      })
      .catch(() => {
        // Keep fallback banks
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
      if (viewMode !== "login" && form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match");
      }
      
      if (viewMode === "login") {
        // Simple demo login
        const res = await api("/merchants/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Login failed");
        localStorage.setItem("token", data.token);
        localStorage.setItem("merchantId", data.merchantId);
        navigate(`/dashboard/${data.merchantId}`);
      } else {
        const res = await api("/merchants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Unknown error");
        localStorage.setItem("token", data.token);
        localStorage.setItem("merchantId", data.merchantId);
        navigate(`/dashboard/${data.merchantId}`, { state: data });
      }
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
              
              <div className="flex p-1 space-x-1 bg-gray-100/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode("new")}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${viewMode === "new" ? 'bg-white shadow text-ink' : 'text-gray-500 hover:text-ink'}`}
                >
                  Create New Account
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("link")}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${viewMode === "link" ? 'bg-white shadow text-ink' : 'text-gray-500 hover:text-ink'}`}
                >
                  Link Existing
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("login")}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${viewMode === "login" ? 'bg-white shadow text-ink' : 'text-gray-500 hover:text-ink'}`}
                >
                  Log In
                </button>
              </div>

              {viewMode === "login" ? (
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="adaeze@example.com"
                      required
                      className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={set("password")}
                      placeholder="••••••••"
                      required
                      className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                    />
                  </div>
                </>
              ) : (
                (viewMode === "link" ? [
                  { label: "Nomba Customer ID", key: "customerId", placeholder: "cus_..." },
                  { label: "Business Name", key: "name", placeholder: "Adaeze's Food Stall" },
                  { label: "Email", key: "email", placeholder: "adaeze@example.com", type: "email" },
                  { label: "Phone", key: "phone", placeholder: "08012345678" },
                  { label: "Account Number", key: "accountNumber", placeholder: "0000000000" },
                  { label: "Password", key: "password", placeholder: "••••••••", type: "password" },
                  { label: "Confirm Password", key: "confirmPassword", placeholder: "••••••••", type: "password" },
                ] : [
                  { label: "Business Name", key: "name", placeholder: "Adaeze's Food Stall" },
                  { label: "Email", key: "email", placeholder: "adaeze@example.com", type: "email" },
                  { label: "Phone", key: "phone", placeholder: "08012345678" },
                  { label: "Account Number", key: "accountNumber", placeholder: "0000000000" },
                  { label: "Password", key: "password", placeholder: "••••••••", type: "password" },
                  { label: "Confirm Password", key: "confirmPassword", placeholder: "••••••••", type: "password" },
                ]).map(({ label, key, placeholder, type = "text" }) => (
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
                ))
              )}

              {viewMode !== "login" && (
                <div>
                  <label htmlFor="bank" className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                  <SearchableSelect
                    id="bank"
                    options={banks}
                    value={form.bankCode}
                    onChange={(val) => setForm((f) => ({ ...f, bankCode: val }))}
                    placeholder="Select your bank"
                    required
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink hover:bg-green-900 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-lg transition-colors"
              >
                {loading ? "Analysing..." : (viewMode === "login" ? "Log In →" : "Check my credit score →")}
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
