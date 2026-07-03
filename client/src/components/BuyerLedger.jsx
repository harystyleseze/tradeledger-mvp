import { useState } from "react";
import api from "../api.js";

export default function BuyerLedger({ merchantId, initialBuyers = [] }) {
  const [buyers, setBuyers] = useState(initialBuyers);
  const [buyerName, setBuyerName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  async function addBuyer(e) {
    e.preventDefault();
    if (!buyerName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await api("/buyers/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, buyerName: buyerName.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      // Refresh buyer list
      const updated = await api(`/buyers/accounts/${merchantId}`).then((r) => r.json());
      setBuyers(updated.buyers ?? []);
      setBuyerName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="bg-white border border-rule rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-ink">Buyer payment accounts</h3>
        <span className="text-xs text-gray-400">
          {buyers.length} {buyers.length === 1 ? "buyer" : "buyers"}
        </span>
      </div>

      {/* Add buyer form */}
      <form onSubmit={addBuyer} className="flex gap-2">
        <input
          type="text"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Buyer name (e.g. Kafilat Stores)"
          className="flex-1 border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf"
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || !buyerName.trim()}
          className="bg-ink hover:bg-green-900 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {adding ? "Creating…" : "Add buyer"}
        </button>
      </form>
      {error && <p className="text-red-500 text-xs">{error}</p>}

      {/* Buyer list */}
      {buyers.length === 0 ? (
        <p className="text-gray-400 text-sm">
          Add a buyer to create a dedicated payment account. Each buyer gets a unique account
          number — when they pay it, TradeLedger records the payment automatically.
        </p>
      ) : (
        <div className="space-y-3">
          {buyers.map((b) => (
            <div key={b.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
              >
                <div>
                  <p className="font-medium text-sm text-gray-800">{b.buyerName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {b.paymentCount} payment{b.paymentCount !== 1 ? "s" : ""} ·{" "}
                    ₦{(b.totalReceivedNaira ?? 0).toLocaleString()} received
                  </p>
                </div>
                <span className="text-gray-300 text-xs">{expandedId === b.id ? "▲" : "▼"}</span>
              </button>

              {expandedId === b.id && (
                <div className="px-4 pb-4 space-y-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Account Number (NUBAN)</p>
                      <p className="font-mono text-sm font-semibold text-gray-800">
                        {b.accountNumber}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(b.accountNumber)}
                      className="text-xs text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-2 py-1 rounded-md transition-colors"
                    >
                      Copy
                    </button>
                  </div>

                  {b.payments && b.payments.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Recent payments</p>
                      <div className="space-y-1.5">
                        {b.payments.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-600">{p.payer}</span>
                            <span className="font-medium text-green-700">
                              +₦{(p.amountNaira ?? p.amount / 100).toLocaleString()}
                            </span>
                            <span className="text-gray-400">
                              {new Date(p.receivedAt).toLocaleDateString("en-NG", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No payments yet. Share the account number above with {b.buyerName}.
                    </p>
                  )}

                  {b.paymentCount < 2 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <p className="text-xs text-amber-700">
                        {2 - b.paymentCount} more payment{2 - b.paymentCount !== 1 ? "s" : ""}{" "}
                        needed from this buyer to count toward your credit score.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-50 pt-3">
        <p className="text-xs text-gray-400">
          Buyers with 2+ payments each improve your advance eligibility. More active buyers → higher
          advance cap (up to ₦1M with 2+ buyers, ₦1.5M with checkout active).
        </p>
      </div>
    </div>
  );
}
