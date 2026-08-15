import { buildSparklinePath, rangeLabel, sparklineDomain } from "./ui/sparkline";
import { TrendGlyph, describeTrend, trendDirectionFromDelta, trendToneClass } from "./illustrations/TrendGlyph";

type TrendPoint = { date: string; value: number };

type HistoricalTrendChartProps = {
  label: string;
  color: string;
  points: TrendPoint[];
  /**
   * Direction that counts favorably. Tightness-style scores rise when conditions
   * worsen (default); appetite-style scores rise when conditions improve.
   */
  increaseIsPositive?: boolean;
};

const W = 100;
const H = 32;
const PAD_Y = 2;

export function HistoricalTrendChart({ label, color, points, increaseIsPositive = false }: HistoricalTrendChartProps) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  // Same projection the inline sparkline uses, so the two never drift apart.
  const domain = sparklineDomain(values);
  const [min, max] = domain;
  const span = max - min || 1;
  const pathD = buildSparklinePath(values, domain, W, H, PAD_Y);

  const currentVal = points[points.length - 1].value;
  const firstVal = points[0].value;
  const delta = currentVal - firstVal;
  const direction = trendDirectionFromDelta(delta);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="type-eyebrow">{label}</span>
        <span className="text-fluid-xs font-semibold tabular-nums text-slate-300">
          {currentVal}
          <span
            className={`ml-1 inline-flex items-center gap-0.5 align-baseline ${trendToneClass(direction, increaseIsPositive)}`}
          >
            <TrendGlyph direction={direction} className="h-3 w-3" />
            <span aria-hidden="true">{Math.abs(delta).toFixed(0)}</span>
            <span className="sr-only">
              {describeTrend({
                label,
                delta,
                current: currentVal,
                period: `over ${points.length} periods`,
              })}
            </span>
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-8 overflow-visible"
        role="img"
        // The chart is autoscaled, so the range has to be stated or the shape
        // can't be decoded.
        aria-label={`${label} over ${points.length} periods, ranging ${rangeLabel(domain)}. Latest ${currentVal}.`}
      >
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={W} cy={H - PAD_Y - ((currentVal - min) / span) * (H - PAD_Y * 2)} r="2" fill={color} />
      </svg>
    </div>
  );
}
