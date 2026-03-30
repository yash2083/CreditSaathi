import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function RevenueChart({ data = [] }) {
  const chartData = data.map((d) => ({
    period: d.filingPeriod || d.period,
    revenue: d.taxableRevenue || d.revenue || 0,
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-txt mb-1">Revenue Trend</h3>
      <p className="text-xs text-txt-muted mb-4">Monthly taxable revenue from GST filings</p>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="period" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v}`} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
            <Line type="monotone" dataKey="revenue" stroke="#1F7A63" strokeWidth={2} dot={{ fill: "#1F7A63", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#1F7A63", stroke: "#fff", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-txt-muted text-sm">No revenue data available</div>
      )}
    </div>
  );
}
