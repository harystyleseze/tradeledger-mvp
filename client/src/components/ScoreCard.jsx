import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

export default function ScoreCard({ score, scoreColor }) {
  const data = [{ value: score }];

  return (
    <div className="bg-white border border-rule rounded-2xl p-6 flex items-center gap-6">
      <div className="relative">
        <RadialBarChart
          width={120} height={120}
          cx={60} cy={60}
          innerRadius={45} outerRadius={55}
          startAngle={90} endAngle={-270}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={4}
            fill={score >= 70 ? "#16a34a" : score >= 40 ? "#f59e0b" : "#ef4444"}
            background={{ fill: "#f3f4f6" }}
          />
        </RadialBarChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-display text-2xl font-bold tnum ${scoreColor}`}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-500">Credit score</p>
        <p className={`font-display text-xl font-bold ${scoreColor}`}>
          {score >= 70 ? "Excellent" : score >= 40 ? "Eligible" : "Not eligible"}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {score >= 40
            ? "Based on 90 days of Nomba transaction history"
            : "Build more transaction history to qualify"}
        </p>
      </div>
    </div>
  );
}
