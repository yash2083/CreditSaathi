export default function SHAPPanel({ shapSummary = [], shapValues = {} }) {
  const features = shapSummary.length > 0
    ? [...shapSummary].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    : Object.entries(shapValues).map(([key, value]) => ({
        feature: key,
        impact: value,
        direction: value >= 0 ? "positive" : "negative",
        displayLabel: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const max = Math.max(...features.map((f) => Math.abs(f.impact)), 0.01);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-txt mb-1">Feature Impact (SHAP)</h3>
      <p className="text-xs text-txt-muted mb-4">Factors contributing to the credit score — green increases score, red decreases it.</p>

      <div className="space-y-3">
        {features.map((f, i) => {
          const w = (Math.abs(f.impact) / max) * 100;
          const pos = f.direction === "positive" || f.impact >= 0;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-txt-secondary">{f.displayLabel || f.feature}</span>
                <span className={`text-xs font-mono font-medium ${pos ? "text-success" : "text-danger"}`}>
                  {pos ? "+" : ""}{typeof f.impact === "number" ? f.impact.toFixed(3) : f.impact}
                </span>
              </div>
              <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pos ? "bg-success" : "bg-danger"}`}
                  style={{ width: `${Math.max(w, 4)}%`, transition: `width 0.5s ease ${i * 80}ms` }} />
              </div>
            </div>
          );
        })}
      </div>
      {features.length === 0 && <p className="text-xs text-txt-muted text-center py-4">No SHAP data available</p>}
    </div>
  );
}
