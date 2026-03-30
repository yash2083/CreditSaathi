import { useEffect, useState } from "react";

export default function ScoreGauge({ score = 300, size = 220 }) {
  const [current, setCurrent] = useState(300);

  useEffect(() => {
    const duration = 1200;
    const start = Date.now();
    const from = 300;

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(Math.round(from + (score - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);

  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const circ = Math.PI * r;
  const pct = (current - 300) / 550;
  const offset = circ * (1 - pct);

  const color = current >= 700 ? "#2E7D32" : current >= 550 ? "#E6A23C" : "#D64545";
  const label = current >= 700 ? "Low Risk" : current >= 550 ? "Medium Risk" : "High Risk";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        {/* Background arc */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#E5E7EB" strokeWidth="12" strokeLinecap="round" />
        {/* Score arc */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke 0.3s ease" }} />
        {/* Score */}
        <text x={cx} y={cy - 16} textAnchor="middle" fill="#1F2937"
          style={{ fontSize: "36px", fontWeight: 700, fontFamily: "Inter", letterSpacing: "-0.03em" }}>
          {current}
        </text>
        {/* Label */}
        <text x={cx} y={cy + 6} textAnchor="middle" fill={color}
          style={{ fontSize: "12px", fontWeight: 600, fontFamily: "Inter" }}>
          {label}
        </text>
        {/* Range */}
        <text x={cx - r} y={cy + 22} textAnchor="middle" fill="#9CA3AF" style={{ fontSize: "10px" }}>300</text>
        <text x={cx + r} y={cy + 22} textAnchor="middle" fill="#9CA3AF" style={{ fontSize: "10px" }}>850</text>
      </svg>
    </div>
  );
}
