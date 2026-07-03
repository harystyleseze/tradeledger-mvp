import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import AppNav from "../components/AppNav.jsx";
import ScoreCard from "../components/ScoreCard.jsx";
import AdvanceOffer from "../components/AdvanceOffer.jsx";
import RepaymentChart from "../components/RepaymentChart.jsx";
import BuyerLedger from "../components/BuyerLedger.jsx";

function Skeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6 animate-pulse">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-56 bg-white border border-rule rounded-2xl" />
        <div className="h-56 bg-white border border-rule rounded-2xl" />
      </div>
      <div className="h-72 bg-white border border-rule rounded-2xl" />
    </div>
  );
}

export default function Dashboard() {
  const { merchantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(location.state ?? null);
  const [advance, setAdvance] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [merchantName, setMerchantName] = useState(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!data) {
      api(`/merchants/${merchantId}`)
        .then((r) => r.json())
        .then(setData)
        .catch(() => navigate("/onboard"));
    }
  }, [merchantId]);

  useEffect(() => {
    api(`/merchants/${merchantId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.name) setMerchantName(d.name);
        if (d.advances?.[0]) setAdvance(d.advances[0]);
        if (d.buyerAccounts) {
          // Shape from GET /merchants/:id includes payments nested under each buyerAccount
          setBuyers(
            d.buyerAccounts.map((ba) => ({
              id: ba.id,
              buyerName: ba.customerReference,
              accountNumber: ba.accountNumber,
              bankCode: ba.bankCode,
              paymentCount: ba.payments?.length ?? 0,
              totalReceivedNaira: (ba.payments ?? []).reduce((s, p) => s + p.amount / 100, 0),
              payments: (ba.payments ?? []).map((p) => ({
                amount: p.amount,
                amountNaira: p.amount / 100,
                payer: p.payer,
                receivedAt: p.receivedAt,
              })),
            }))
          );
        }
      });
  }, [merchantId]);

  async function applyForAdvance() {
    setApplying(true);
    setError(null);
    try {
      const res = await api("/advances/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, scoreId: data.scoreId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      // Navigate to styled consent page instead of showing raw URL.
      // consentUrl is absent on sandbox (mandates API unavailable) — the
      // consent page then offers direct activation instead.
      const consentParam = result.consentUrl
        ? `&consentUrl=${encodeURIComponent(result.consentUrl)}`
        : "";
      navigate(`/consent?advanceId=${result.advanceId}${consentParam}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-paper">
        <AppNav />
        <Skeleton />
      </div>
    );
  }

  const score = data.score ?? data.scores?.[0]?.score ?? 0;
  const scoreColor = score >= 70 ? "text-leaf" : score >= 40 ? "text-amber-500" : "text-red-500";
  const ringColor = score >= 70 ? "border-green-500" : score >= 40 ? "border-amber-400" : "border-red-400";
  const breakdown = data.breakdown ?? data.scores?.[0]?.breakdown;

  // DVA dimensions to show when enriched
  const dvaDimensions = breakdown ? [
    { label: "Buyer Diversity", key: "buyerDiversityScore", max: 15 },
    { label: "Receivables Regularity", key: "receivablesRegularityScore", max: 10 },
    { label: "Concentration Penalty", key: "concentrationPenalty", max: 0, penalty: true },
  ].filter(({ key }) => breakdown[key] !== undefined) : [];

  return (
    <div className="min-h-screen bg-paper">
      <AppNav
        right={
          <>
            {merchantName && (
              <span className="text-gray-500 hidden sm:block">{merchantName}</span>
            )}
            <Link to="/admin" className="text-gray-400 hover:text-ink">
              Lender portal →
            </Link>
          </>
        }
      />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Score + Offer/Advance side by side on desktop */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <ScoreCard score={score} breakdown={breakdown} scoreColor={scoreColor} ringColor={ringColor} />

          {advance ? (
            <RepaymentChart advance={advance} />
          ) : data.advanceOffer ? (
            <AdvanceOffer
              offer={data.advanceOffer}
              onApply={applyForAdvance}
              applying={applying}
              error={error}
            />
          ) : (
            <div className="bg-white border border-rule rounded-2xl p-6">
              <h3 className="font-display font-semibold text-ink mb-2">No advance offer yet</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {data.reason === "insufficient_history"
                  ? "Not enough transaction history yet. Keep selling on Nomba and check back in 30 days — the score builds itself."
                  : data.reason === "insufficient_days"
                  ? "You need at least 7 active trading days in your history to score. Keep transacting and check back soon."
                  : "Your score is below the 40-point minimum for an advance. Adding regular buyers to your ledger below is the fastest way to raise it."}
              </p>
            </div>
          )}
        </div>

        {/* Score breakdown */}
        {breakdown && (
          <div className="bg-white border border-rule rounded-2xl p-6">
            <h3 className="font-display font-semibold text-ink mb-4">Score breakdown</h3>
            <div className="space-y-3">
              {[
                { label: "Revenue Level", key: "revenueScore", max: 30 },
                { label: "Consistency", key: "consistencyScore", max: 20 },
                { label: "Operational Streak", key: "streakScore", max: 20 },
                { label: "Growth Trend", key: "growthScore", max: 15 },
                { label: "Channel Diversity", key: "diversityScore", max: 15 },
              ].map(({ label, key, max }) => {
                const val = breakdown[key] ?? 0;
                const pct = (val / max) * 100;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium tnum">{val}/{max}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-leaf rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {dvaDimensions.length > 0 && (
                <>
                  <div className="pt-1 pb-0.5 border-t border-gray-50">
                    <p className="text-xs text-leaf font-medium">+ Buyer Payment Intelligence</p>
                  </div>
                  {dvaDimensions.map(({ label, key, max, penalty }) => {
                    const val = breakdown[key] ?? 0;
                    const pct = penalty
                      ? val < 0 ? 100 : 0
                      : max > 0 ? (val / max) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className={`font-medium tnum ${val < 0 ? "text-red-500" : "text-leaf"}`}>
                            {val > 0 ? `+${val}` : val}{penalty ? "" : `/${max}`}
                          </span>
                        </div>
                        {!penalty && (
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                        {penalty && val < 0 && (
                          <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full w-full" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* Buyer Ledger — shown for all merchants to encourage DVA adoption */}
        <BuyerLedger merchantId={merchantId} initialBuyers={buyers} />
      </div>
    </div>
  );
}
