import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import AppNav from "../components/AppNav.jsx";

export default function Admin() {
  const [portfolio, setPortfolio] = useState(null);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    api("/admin/advances")
      .then((r) => r.json())
      .then(setPortfolio);
  }, []);

  async function triggerReconcile() {
    setReconciling(true);
    await api("/admin/reconcile", { method: "POST" });
    setTimeout(() => setReconciling(false), 3000);
  }

  const statusColor = {
    active: "bg-green-50 text-leaf border-green-200",
    pending_consent: "bg-amber-50 text-market border-amber-200",
    settled: "bg-gray-100 text-gray-500 border-gray-200",
    delinquent: "bg-red-50 text-red-600 border-red-200",
  };

  const totalDisbursed = portfolio?.advances.reduce((s, a) => s + a.amountNaira, 0) ?? 0;
  const totalOutstanding = portfolio?.advances.reduce((s, a) => s + a.balanceNaira, 0) ?? 0;
  const delinquentCount = portfolio?.advances.filter((a) => a.status === "delinquent").length ?? 0;

  return (
    <div className="min-h-screen bg-paper">
      <AppNav
        right={
          <>
            <button
              onClick={triggerReconcile}
              disabled={reconciling}
              className="px-3 py-1.5 bg-white border border-rule rounded-lg hover:bg-gray-50 disabled:text-gray-400 text-charcoal"
            >
              {reconciling ? "Reconciling..." : "Run reconciliation"}
            </button>
            <Link
              to="/onboard"
              className="px-3 py-1.5 bg-ink text-white rounded-lg hover:bg-green-900"
            >
              + New merchant
            </Link>
          </>
        }
      />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Loan portfolio</h1>
          <p className="text-gray-500 text-sm mt-1">Every advance, across every merchant</p>
        </div>

        {!portfolio ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white border border-rule rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Advances", value: portfolio.count },
                { label: "Disbursed", value: `₦${totalDisbursed.toLocaleString()}` },
                { label: "Outstanding", value: `₦${totalOutstanding.toLocaleString()}` },
                { label: "Delinquent", value: delinquentCount, alert: delinquentCount > 0 },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-rule rounded-2xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
                  <p className={`font-display font-bold text-2xl mt-1 tnum ${s.alert ? "text-red-600" : "text-ink"}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Portfolio table */}
            <div className="bg-white rounded-2xl border border-rule overflow-hidden">
              {portfolio.advances.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-gray-500">No advances yet.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Onboard a merchant to originate the first one.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-rule">
                        {["Merchant", "Amount (₦)", "Repaid (₦)", "Balance (₦)", "Progress", "Status"].map((h) => (
                          <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.advances.map((a) => (
                        <tr key={a.id} className="border-b border-gray-50 hover:bg-paper/60">
                          <td className="px-4 py-3">
                            <p className="font-medium text-charcoal">{a.merchant}</p>
                            <p className="text-gray-400 text-xs">{a.email}</p>
                          </td>
                          <td className="px-4 py-3 tnum">{a.amountNaira.toLocaleString()}</td>
                          <td className="px-4 py-3 tnum">{a.totalRepaidNaira.toLocaleString()}</td>
                          <td className="px-4 py-3 tnum">{a.balanceNaira.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-leaf rounded-full"
                                  style={{ width: `${a.progressPercent}%` }}
                                />
                              </div>
                              <span className="text-gray-500 tnum">{a.progressPercent}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor[a.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {a.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
