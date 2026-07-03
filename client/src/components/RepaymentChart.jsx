import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function formatNaira(kobo) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function RepaymentChart({ advance }) {
  const totalRepaid = advance.repayments
    .filter((r) => r.status === "success")
    .reduce((sum, r) => sum + r.amount, 0);
  const progressPercent = Math.round((totalRepaid / advance.amount) * 100);

  const chartData = advance.repayments
    .filter((r) => r.status === "success")
    .slice()
    .reverse()
    .reduce((acc, r, i) => {
      const prev = acc[i - 1]?.balance ?? advance.amount;
      acc.push({ week: `Wk ${i + 1}`, balance: prev - r.amount, repaid: r.amount });
      return acc;
    }, []);

  const statusColors = {
    active: "bg-green-100 text-green-700",
    pending_consent: "bg-yellow-100 text-yellow-700",
    settled: "bg-gray-100 text-gray-500",
    delinquent: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white border border-rule rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">Active advance</p>
          <p className="font-display text-2xl font-bold text-ink tnum">{formatNaira(advance.amount)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[advance.status] ?? "bg-gray-100 text-gray-500"}`}>
          {advance.status.replace("_", " ")}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-1 tnum">
          <span>Repaid: {formatNaira(totalRepaid)}</span>
          <span>Remaining: {formatNaira(advance.balance)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{progressPercent}% complete</p>
      </div>

      {/* Repayment chart */}
      {chartData.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Balance over time</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₦${(v / 100).toLocaleString()}`} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v) => formatNaira(v)} />
              <Area type="monotone" dataKey="balance" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Repayment collected at 15% of weekly revenue · Pauses automatically on zero-revenue weeks
      </p>
    </div>
  );
}
