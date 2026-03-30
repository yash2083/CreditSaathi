import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ScoreHistoryChart({ data = [] }) {
  const chartData = data.map((d) => ({
    date: new Date(d.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    score: d.scoreValue,
  })).reverse();

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-txt mb-1">Score History</h3>
      <p className="text-xs text-txt-muted mb-4">Credit score over time</p>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[300, 850]} tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }}
              formatter={(v) => [`${v}`, "Score"]} />
            <Line type="monotone" dataKey="score" stroke="#1F7A63" strokeWidth={2}
              dot={{ fill: "#1F7A63", r: 3, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-txt-muted text-sm">No score history</div>
      )}
    </div>
  );
}
