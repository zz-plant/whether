type TrendPoint = { date: string; value: number };

type HistoricalTrendChartProps = {
  label: string;
  color: string;
  points: TrendPoint[];
  /**
   * Which direction reads as good. Tightness-style scores rise when conditions
   * worsen (default); appetite-style scores rise when conditions improve.
   */
  increaseIsPositive?: boolean;
};

export function HistoricalTrendChart({ label, color, points, increaseIsPositive = false }: HistoricalTrendChartProps) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 32;

  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.value - min) / range) * (h - 4) - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const currentVal = points[points.length - 1].value;
  const firstVal = points[0].value;
  const delta = currentVal - firstVal;
  const improved = increaseIsPositive ? delta > 0 : delta < 0;
  const deltaArrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const deltaColor = delta === 0 ? "text-slate-400" : improved ? "text-emerald-200" : "text-amber-200";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
        <span className="text-fluid-xs font-semibold tabular-nums text-slate-300">
          {currentVal}
          <span className={`${deltaColor} ml-1`}>
            {deltaArrow}{Math.abs(delta).toFixed(0)}
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8 overflow-visible" aria-label={`${label} trend over ${points.length} periods`}>
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={w} cy={h - ((currentVal - min) / range) * (h - 4) - 2} r="2" fill={color} />
      </svg>
    </div>
  );
}
