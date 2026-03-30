export default function StatsCard({ icon: Icon, label, value, subtitle, trend }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-txt-secondary uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-txt mt-1.5 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-txt-muted mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <Icon size={18} className="text-primary" strokeWidth={1.8} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-border">
          <span className={`text-xs font-medium ${trend >= 0 ? "text-success" : "text-danger"}`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
          <span className="text-xs text-txt-muted">vs last period</span>
        </div>
      )}
    </div>
  );
}
