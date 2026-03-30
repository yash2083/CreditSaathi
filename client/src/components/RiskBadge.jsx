export default function RiskBadge({ category, score }) {
  const style = category === "Low" ? "badge-low" : category === "Medium" ? "badge-medium" : "badge-high";

  return (
    <div className="inline-flex items-center gap-2">
      <span className={style}>{category} Risk</span>
      {score !== undefined && (
        <span className="text-sm font-mono font-semibold text-txt">{score}</span>
      )}
    </div>
  );
}
