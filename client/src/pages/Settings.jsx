import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import SearchableSelect from "../components/SearchableSelect.jsx";

const FALLBACK_BANKS = [
  { code: "057", name: "Zenith Bank" },
  { code: "058", name: "GTBank" },
  { code: "044", name: "Access Bank" },
  { code: "011", name: "First Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "032", name: "Union Bank" },
];

export default function Settings() {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const [banks, setBanks] = useState(FALLBACK_BANKS);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", bankCode: "", accountNumber: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch dynamic bank list
    api("/merchants/banks")
      .then((r) => r.json())
      .then((d) => {
        const list = d.banks ?? [];
        if (list.length > 0) {
          setBanks(list);
        }
      })
      .catch(() => {});

    // Fetch merchant details
    api(`/merchants/${merchantId}`)
      .then((r) => r.json())
      .then((d) => {
        setForm({
          name: d.name || "",
          email: d.email || "",
          phone: d.phone || "",
          bankCode: d.bankCode || "",
          accountNumber: d.accountNumber || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [merchantId]);

  function setField(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api(`/merchants/${merchantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout merchantId={merchantId} merchantName={form.name}>
        <div className="max-w-3xl mx-auto py-8">
          <div className="h-64 bg-white border border-rule rounded-2xl animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout merchantId={merchantId} merchantName={form.name}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Profile Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Update your business profile and external bank account details for settlements.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white border border-rule rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={setField("name")}
                required
                className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={setField("email")}
                required
                className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={setField("phone")}
                required
                className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
              />
            </div>
          </div>

          <hr className="border-rule" />

          <div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">Settlement Bank Account</h3>
            <p className="text-gray-500 text-xs mb-4">
              This is the external bank account where your approved loans will be disbursed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  id="accountNumber"
                  type="text"
                  value={form.accountNumber}
                  onChange={setField("accountNumber")}
                  required
                  className="w-full border border-rule rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf bg-paper/50"
                />
              </div>
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
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {success && (
            <p className="text-sm text-leaf bg-green-50 rounded-lg px-3 py-2">Settings saved successfully!</p>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-ink hover:bg-green-900 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
