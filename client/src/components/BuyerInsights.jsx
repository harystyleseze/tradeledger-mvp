import { useEffect, useState } from "react";
import api from "../api.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
  AreaChart, Area,
} from "recharts";

const COLORS = {
  exact: "#16a34a",   // leaf green
  under: "#ef4444",   // red
  over: "#f59e0b",    // amber
  slices: ["#16a34a", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"],
};

function formatNaira(n) {
  return `₦${Number(n).toLocaleString()}`;
}

export default function BuyerInsights({ insights: data }) {
  // Don't render anything if no buyer data
  if (!data || data.buyerCount === 0) return null;
  // Need at least some payments to show insights
  if (data.reliability?.length === 0 && data.timeline?.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="font-display font-semibold text-ink">Buyer payment intelligence</h3>
        <span className="text-xs bg-green-50 text-leaf px-2 py-0.5 rounded-full font-medium">DVA</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Insight 1 — Buyer Reliability */}
        {data.reliability.length > 0 && (
          <div className="bg-white border border-rule rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500">Buyer reliability</p>
              <p className="text-xs text-gray-400 mt-0.5">Payment accuracy across your buyers</p>
            </div>

            <ResponsiveContainer width="100%" height={Math.max(120, data.reliability.length * 40)}>
              <BarChart data={data.reliability} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" domain={[0, "dataMax"]} hide />
                <YAxis
                  type="category"
                  dataKey="buyerName"
                  width={100}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [v, name === "exact" ? "On target" : name === "under" ? "Underpaid" : "Overpaid"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="exact" stackId="a" fill={COLORS.exact} radius={[0, 0, 0, 0]} />
                <Bar dataKey="under" stackId="a" fill={COLORS.under} />
                <Bar dataKey="over" stackId="a" fill={COLORS.over} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-1.5">
              {data.reliability.slice(0, 3).map((b) => (
                <div key={b.buyerName} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{b.buyerName}</span>
                  <span className={`font-medium tnum ${b.exactRate >= 80 ? "text-leaf" : b.exactRate >= 50 ? "text-market" : "text-red-500"}`}>
                    {b.exactRate}% on target
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insight 2 — Revenue Concentration */}
        {data.concentration.length > 0 && (
          <div className="bg-white border border-rule rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500">Revenue concentration</p>
              <p className="text-xs text-gray-400 mt-0.5">How diversified your buyer revenue is</p>
            </div>

            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={data.concentration}
                    dataKey="percent"
                    nameKey="buyerName"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.concentration.map((_, i) => (
                      <Cell key={i} fill={COLORS.slices[i % COLORS.slices.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex-1 space-y-1.5">
                {data.concentration.map((c, i) => (
                  <div key={c.buyerName} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS.slices[i % COLORS.slices.length] }}
                    />
                    <span className="text-gray-600 flex-1 truncate">{c.buyerName}</span>
                    <span className="text-gray-800 font-medium tnum">{c.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            {data.concentrationWarning ? (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-700">
                  ⚠ {data.topBuyerPercent}% of buyer revenue comes from one source. Adding more
                  buyers strengthens your credit profile.
                </p>
              </div>
            ) : data.concentration.length >= 2 ? (
              <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                <p className="text-xs text-green-700">
                  ✓ No single buyer exceeds 70% — healthy revenue diversification.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Insight 3 — Payment Timeline */}
        {data.timeline.length >= 2 && (
          <div className="bg-white border border-rule rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500">Buyer payment timeline</p>
              <p className="text-xs text-gray-400 mt-0.5">Weekly DVA revenue from all buyers</p>
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.timeline}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(w) => w.split("-")[1]}
                />
                <YAxis
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip
                  formatter={(v) => formatNaira(v)}
                  labelFormatter={(l) => `Week ${l}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="totalNaira"
                  stroke="#16a34a"
                  fill="#dcfce7"
                  strokeWidth={2}
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>

            <p className="text-xs text-gray-400">
              Your buyers have paid {formatNaira(data.timeline.reduce((s, w) => s + w.totalNaira, 0))} over{" "}
              {data.timeline.length} weeks, averaging {formatNaira(data.weeklyAverageNaira)}/week.
            </p>
          </div>
        )}

        {/* Insight 4 — Cash Flow Predictability */}
        {data.predictability !== "none" && (
          <div className="bg-white border border-rule rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500">Cash flow predictability</p>
              <p className="text-xs text-gray-400 mt-0.5">How consistent your buyer payments are</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className={`font-display text-3xl font-bold tnum ${
                  data.predictability === "high" ? "text-leaf"
                  : data.predictability === "medium" ? "text-market"
                  : "text-red-500"
                }`}>
                  {data.predictabilityScore}/10
                </p>
                <p className={`text-sm font-medium mt-1 ${
                  data.predictability === "high" ? "text-leaf"
                  : data.predictability === "medium" ? "text-market"
                  : "text-red-500"
                }`}>
                  {data.predictability === "high" ? "High" : data.predictability === "medium" ? "Medium" : "Low"}
                </p>
              </div>

              <div className="flex-1">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.predictability === "high" ? "bg-leaf"
                      : data.predictability === "medium" ? "bg-amber-400"
                      : "bg-red-400"
                    }`}
                    style={{ width: `${data.predictabilityScore * 10}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Unpredictable</span>
                  <span>Very predictable</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Based on {data.timeline.length} weeks of buyer payment data.
              {data.predictability === "high"
                ? " Regular payments increase your advance eligibility and cap."
                : " More consistent buyer payments will improve your credit profile."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
