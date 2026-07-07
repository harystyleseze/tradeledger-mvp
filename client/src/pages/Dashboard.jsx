import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import ScoreCard from "../components/ScoreCard.jsx";
import AdvanceOffer from "../components/AdvanceOffer.jsx";
import RepaymentChart from "../components/RepaymentChart.jsx";
import BuyerInsights from "../components/BuyerInsights.jsx";

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
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
  const [merchantName, setMerchantName] = useState(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null);
  const [mandateStatus, setMandateStatus] = useState(null);
  const [insights, setInsights] = useState(null);

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
      });

    // Fetch account balance (non-blocking)
    api(`/merchants/${merchantId}/balance`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.balance) setBalance(d.balance); })
      .catch(() => {});

    // Fetch mandate status (non-blocking)
    api(`/merchants/${merchantId}/mandate-status`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMandateStatus(d); })
      .catch(() => {});

    // Fetch buyer insights (non-blocking)
    api(`/buyers/insights/${merchantId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setInsights(d); })
      .catch(() => {});
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
      <DashboardLayout merchantId={merchantId} merchantName={merchantName}>
        <Skeleton />
      </DashboardLayout>
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
    <DashboardLayout merchantId={merchantId} merchantName={merchantName}>
      <div className="space-y-6">
        {/* At-a-Glance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-rule rounded-2xl p-5 flex flex-col justify-between hover:border-leaf transition-colors group">
            <p className="text-xs text-gray-500 font-medium">Available Balance</p>
            <p className="font-display font-bold text-ink text-2xl mt-3 tnum group-hover:text-leaf transition-colors">
              ₦{((balance?.availableBalance || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white border border-rule rounded-2xl p-5 flex flex-col justify-between hover:border-leaf transition-colors group">
            <p className="text-xs text-gray-500 font-medium">Active Buyers</p>
            <p className="font-display font-bold text-ink text-2xl mt-3 tnum group-hover:text-leaf transition-colors">
              {insights?.buyerCount || 0}
            </p>
          </div>
          <div className="bg-white border border-rule rounded-2xl p-5 flex flex-col justify-between hover:border-leaf transition-colors group">
            <p className="text-xs text-gray-500 font-medium">Predictability</p>
            <p className={`font-display font-bold text-2xl mt-3 ${insights?.predictability === 'high' ? 'text-leaf' : insights?.predictability === 'medium' ? 'text-amber-500' : insights?.predictability === 'low' ? 'text-red-500' : 'text-gray-400'}`}>
              {insights?.predictability ? (insights.predictability.charAt(0).toUpperCase() + insights.predictability.slice(1)) : 'N/A'}
            </p>
          </div>
          <div className="bg-white border border-rule rounded-2xl p-5 flex flex-col justify-between hover:border-leaf transition-colors group">
            <p className="text-xs text-gray-500 font-medium">Credit Score</p>
            <p className={`font-display font-bold text-2xl mt-3 ${scoreColor}`}>
              {score} <span className="text-sm font-medium text-gray-400">/ 100</span>
            </p>
          </div>
        </div>

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
            <div className="bg-white border border-rule rounded-2xl p-6 flex flex-col justify-center h-full">
              <h3 className="font-display font-semibold text-ink mb-2">Path to Eligibility</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {data.reason === "insufficient_history"
                  ? "Not enough transaction history yet. Keep selling on Nomba and check back in 30 days."
                  : data.reason === "insufficient_days"
                  ? "You need at least 7 active trading days in your history to score. Keep transacting."
                  : "Your score is below the 40-point minimum for an advance. Improve your buyer diversity and payment consistency."}
              </p>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className={score >= 40 ? "text-leaf" : "text-gray-500"}>Minimum Score (40)</span>
                    <span className={score >= 40 ? "text-leaf" : "text-gray-900"}>{score} / 40</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${score >= 40 ? 'bg-leaf' : 'bg-amber-400'}`} style={{ width: `${Math.min((score / 40) * 100, 100)}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className={(insights?.buyerCount || 0) >= 3 ? "text-leaf" : "text-gray-500"}>Active Buyers (3 needed)</span>
                    <span className={(insights?.buyerCount || 0) >= 3 ? "text-leaf" : "text-gray-900"}>{insights?.buyerCount || 0} / 3</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${(insights?.buyerCount || 0) >= 3 ? 'bg-leaf' : 'bg-amber-400'}`} style={{ width: `${Math.min(((insights?.buyerCount || 0) / 3) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mandate status — compact info row */}
        {mandateStatus?.hasMandateId && (
          <div className="grid md:grid-cols-2 gap-6">

            {mandateStatus?.hasMandateId && (
              <div className="bg-white border border-rule rounded-2xl p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  mandateStatus.mandateStatus === "active" ? "bg-green-50" :
                  mandateStatus.mandateStatus === "unavailable" ? "bg-gray-50" : "bg-amber-50"
                }`}>
                  <span className={`text-lg ${
                    mandateStatus.mandateStatus === "active" ? "text-leaf" :
                    mandateStatus.mandateStatus === "unavailable" ? "text-gray-400" : "text-amber-500"
                  }`}>⟳</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Repayment mandate</p>
                  <p className={`font-medium text-sm capitalize ${
                    mandateStatus.mandateStatus === "active" ? "text-leaf" :
                    mandateStatus.mandateStatus === "unavailable" ? "text-gray-500" : "text-amber-600"
                  }`}>
                    {mandateStatus.mandateStatus === "unavailable" ? "Sandbox mode" : mandateStatus.mandateStatus}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">
                  {mandateStatus.mandateId?.slice(-8)}
                </p>
              </div>
            )}
          </div>
        )}

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

        <BuyerInsights insights={insights} />
      </div>
    </DashboardLayout>
  );
}
