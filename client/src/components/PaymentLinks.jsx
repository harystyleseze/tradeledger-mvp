import { useState, useEffect } from "react";
import api from "../api.js";

export default function PaymentLinks({ merchantId }) {
  const [amount, setAmount] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [merchantId]);

  async function fetchHistory() {
    try {
      const res = await api(`/checkout/history/${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.payments || []);
      }
    } catch (err) {
      console.error("Failed to fetch checkout history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function createLink(e) {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setCreating(true);
    setError(null);
    setGeneratedLink(null);

    try {
      const res = await api("/checkout/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, amount: Number(amount), customerEmail, customerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create link");
      
      setGeneratedLink(data.checkoutLink);
      setAmount("");
      setCustomerEmail("");
      setCustomerEmail("");
      setCustomerName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function refundOrder(orderId, amount) {
    if (!window.confirm(`Are you sure you want to refund ₦${amount}?`)) return;
    try {
      const res = await api(`/checkout/refund/${merchantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Refund successful");
      fetchHistory();
    } catch (err) {
      alert(err.message || "Refund failed");
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="space-y-6">
      {/* Create Link Card */}
      <div className="bg-white border border-rule rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="font-display font-semibold text-ink">Create Payment Link</h3>
          <p className="text-sm text-gray-500">Generate a one-time secure payment link powered by Nomba Checkout.</p>
        </div>

        <form onSubmit={createLink} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₦) *</label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf"
              disabled={creating}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name (Optional)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Adebayo"
                className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf"
                disabled={creating}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer Email (Optional)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. adebayo@example.com"
                className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf"
                disabled={creating}
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-xs">{error}</p>}
          
          <button
            type="submit"
            disabled={creating}
            className="bg-ink hover:bg-green-900 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {creating ? "Generating..." : "Generate Link"}
          </button>
        </form>

        {generatedLink && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-800 font-medium mb-2">Link created successfully!</p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={generatedLink} 
                className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 text-sm text-gray-700" 
              />
              <button
                onClick={() => copyToClipboard(generatedLink)}
                className="text-sm bg-white border border-green-200 text-green-700 hover:bg-green-100 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Card */}
      <div className="bg-white border border-rule rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display font-semibold text-ink">Paid Checkout Links</h3>
          <button onClick={fetchHistory} className="text-xs text-gray-500 hover:text-ink">Refresh</button>
        </div>

        {loadingHistory ? (
          <p className="text-sm text-gray-400">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400">No successful checkout payments yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-sm text-gray-800 tnum">₦{h.amountNaira.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{h.orderId}</p>
                </div>
                <div className="text-right">
                  {h.status === "refunded" ? (
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-[10px] font-bold rounded-md mb-1 uppercase tracking-wide">Refunded</span>
                  ) : (
                    <div className="flex flex-col items-end gap-1 mb-1">
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-md uppercase tracking-wide">Paid</span>
                      <button 
                        onClick={() => refundOrder(h.orderId, h.amountNaira)}
                        className="text-[10px] font-medium text-red-500 hover:text-red-700 underline"
                      >
                        Refund
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">
                    {new Date(h.receivedAt).toLocaleString("en-NG", {
                      dateStyle: "short",
                      timeStyle: "short"
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
