import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function CashFlowChart({ data = [] }) {
  const chartData = data.map((d) => ({ month: d.month, inflow: d.totalInflow || 0, outflow: d.totalOutflow || 0 }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-txt mb-1">Cash Flow</h3>
      <p className="text-xs text-txt-muted mb-4">Monthly inflow vs outflow from bank transactions</p>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${v}`} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="inflow" fill="#1F7A63" radius={[4, 4, 0, 0]} name="Inflow" />
            <Bar dataKey="outflow" fill="#E6A23C" radius={[4, 4, 0, 0]} name="Outflow" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-txt-muted text-sm">No cash flow data</div>
      )}
    </div>
  );
}
