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
  /**
   * What one step between points on this chart is — "months", "weeks". Stated because the
   * headline number here is the last point of a *history* series, which is not
   * the same as the live score the rest of the page quotes; without the
   * granularity and the as-of date, the two read as the page contradicting
   * itself.
   */
  periodLabel?: string;
};

const asOfFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const formatAsOf = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? null : asOfFormatter.format(parsed);
};

const W = 100;
const H = 32;
const PAD_Y = 2;

export function HistoricalTrendChart({
  label,
  color,
  points,
  increaseIsPositive = false,
  periodLabel = "periods",
}: HistoricalTrendChartProps) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  // Same projection the inline sparkline uses, so the two never drift apart.
  const domain = sparklineDomain(values);
  const [min, max] = domain;
  const span = max - min || 1;
  const pathD = buildSparklinePath(values, domain, W, H, PAD_Y);

  const currentVal = points[points.length - 1].value;
  const dotY = H - PAD_Y - ((currentVal - min) / span) * (H - PAD_Y * 2);
  const asOf = formatAsOf(points[points.length - 1].date);
  /* The move is first point to last, so it spans the gaps between points, one
     fewer than the points. This counted the points: twelve month-ends printed
     "Risk appetite fell 6 over 12 months to 56" for an eleven-month move. */
  const moveSpan = `${points.length - 1} ${periodLabel}`;
  const periodSummary = `${moveSpan}${asOf ? ` to ${asOf}` : ""}`;
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
                period: `over ${moveSpan}`,
              })}
            </span>
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        // The box is w-full but the viewBox is 100x32, so the default
        // xMidYMid meet scaled to the height and drew the line at its intrinsic
        // 100px, centred, with the rest of the row empty — 310px of width
        // carrying a 100px chart on a phone. `none` lets the series use the
        // width it is given; the stroke and the end dot opt out of the stretch
        // below so neither turns into an ellipse.
        preserveAspectRatio="none"
        className="w-full h-8 overflow-visible"
        // The chart is autoscaled, so the range has to be stated or the shape
        // can't be decoded.
        aria-label={`${label} over ${moveSpan}, ranging ${rangeLabel(domain)}. Latest ${asOf ? `${asOf} ` : ""}read ${currentVal}.`}
      >
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* A zero-length round-capped stroke, not a circle: under a non-uniform
            scale a circle renders as an ellipse, while a non-scaling stroke
            keeps the dot the same size at every width. */}
        <path
          d={`M${W} ${dotY} L${W} ${dotY}`}
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="text-fluid-nano text-slate-400">{periodSummary}</p>
    </div>
  );
}
