import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../api.js";

export default function Consent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const advanceId = searchParams.get("advanceId");
  const consentUrl = searchParams.get("consentUrl");

  const [advance, setAdvance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!advanceId) return;
    api(`/advances/${advanceId}`)
      .then((r) => r.json())
      .then((d) => {
        setAdvance(d);
        setLoading(false);
        if (d.status === "active" || d.status === "disbursed") setAuthorized(true);
      })
      .catch(() => setLoading(false));
  }, [advanceId]);

  function pollForActivation() {
    setPolling(true);
    // Poll advance status every 3s for up to 2 minutes
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const d = await api(`/advances/${advanceId}`).then((r) => r.json());
        if (d.status === "active" || d.status === "disbursed") {
          setAdvance(d);
          setAuthorized(true);
          clearInterval(interval);
          setPolling(false);
        }
      } catch {}
      if (attempts >= 40) {
        clearInterval(interval);
        setPolling(false);
      }
    }, 3000);
  }

  function openConsentWindow() {
    if (!consentUrl) return;
    window.open(consentUrl, "_blank", "noopener,noreferrer");
    pollForActivation();
  }

  // Sandbox path — no Nomba consent URL. Activation triggers the real
  // disbursement transfer; the transfer.success webhook flips the advance
  // to active.
  const [activateError, setActivateError] = useState(null);
  async function activateAdvance() {
    setActivateError(null);
    try {
      const res = await api(`/advances/${advanceId}/activate`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Activation failed");
      pollForActivation();
    } catch (err) {
      setActivateError(err.message);
    }
  }

  if (!advanceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <p className="text-gray-500">No advance ID provided.</p>
          <Link to="/" className="text-leaf text-sm mt-2 inline-block">← Back to home</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-gray-400">Loading advance details…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-rule max-w-md w-full p-8 space-y-6">

        <div className="text-center">
          <h1 className="font-display font-bold text-xl text-ink tracking-tight">TradeLedger</h1>
          <p className="text-gray-500 text-sm mt-1">Advance mandate authorization</p>
        </div>

        {authorized ? (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-50 text-leaf text-2xl font-bold flex items-center justify-center">
              ✓
            </div>
            <p className="font-display font-semibold text-ink text-lg">Mandate authorized</p>
            <p className="text-sm text-gray-500">
              Your advance of ₦{((advance?.amount ?? 0) / 100).toLocaleString()} has been activated.
              Repayments will be collected at 15% of your weekly revenue.
            </p>
            <button
              onClick={() => navigate(`/dashboard/${advance?.merchantId ?? ""}`)}
              className="bg-ink hover:bg-green-900 text-white font-semibold px-6 py-3 rounded-lg w-full transition-colors"
            >
              View your dashboard →
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {advance && (
              <div className="bg-paper rounded-xl border border-rule p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Advance amount</span>
                  <span className="font-semibold tnum">₦{((advance.amount ?? 0) / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Repayment rate</span>
                  <span className="font-semibold">15% of weekly revenue</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Repayment method</span>
                  <span className="font-semibold">Direct debit mandate (on-demand)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Factor fee</span>
                  <span className="font-semibold">Fixed at origination</span>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 leading-relaxed">
              By authorizing this mandate, you agree that TradeLedger may debit 15% of your weekly
              Nomba settlement each Monday until the advance balance is fully repaid. Early repayment
              is allowed at any time. The factor fee does not accrue interest.
            </p>

            {consentUrl ? (
              <button
                onClick={openConsentWindow}
                disabled={polling}
                className="bg-ink hover:bg-green-900 disabled:bg-gray-300 text-white font-semibold px-6 py-3 rounded-lg w-full transition-colors"
              >
                {polling ? "Waiting for authorization…" : "Authorize mandate →"}
              </button>
            ) : (
              <p className="text-sm text-market bg-amber-50 border border-amber-100 rounded-lg p-3">
                Consent URL not available. Return to your dashboard and try applying again.
              </p>
            )}

            {polling && (
              <p className="text-xs text-gray-400 text-center">
                Complete the authorization in the new tab — this page will update automatically.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
