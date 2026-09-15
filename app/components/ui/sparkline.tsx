/**
 * Word-sized inline trend graphic.
 *
 * Tufte's sparkline: a "datawords" graphic sized to sit in a line of type rather
 * than boxed off as a figure. No axes, no gridlines, no legend, no title — those
 * cost ink and repeat what the surrounding sentence already says. The reader gets
 * shape (is this rising, volatile, flat?) directly beside the number that carries
 * level.
 *
 * Two integrity rules this component holds to:
 *
 * 1. Geometry always comes from `points`. There is no index-derived fallback: a
 *    series that cannot be drawn honestly renders nothing and lets the number
 *    stand alone. (A previous homepage chart derived bar heights from array index
 *    and drew the same rising staircase regardless of the data.)
 * 2. Autoscaling exaggerates small moves, so callers that autoscale must show the
 *    domain in text nearby. `rangeLabel()` builds that string, and the domain is
 *    always stated in the accessible label.
 */

export type SparklinePoint = { label: string; value: number };

const VIEW_W = 120;
const VIEW_H = 24;
const PAD_Y = 2.5;

/** Semantic tones resolve to tokens, so light and dark themes both hold. */
const TONE_COLOR = {
  easing: "var(--color-semantic-easing-border)",
  tightening: "var(--color-semantic-tightening-border)",
  caution: "var(--color-semantic-caution-border)",
  unchanged: "var(--color-semantic-unchanged-border)",
} as const;

export type SparklineTone = keyof typeof TONE_COLOR;

type SparklineDomain = readonly [number, number];

/**
 * Series → SVG path, in a fixed 120x24 user space. Shared with
 * `HistoricalTrendChart` so the projection math exists once.
 */
export function buildSparklinePath(
  values: readonly number[],
  domain: SparklineDomain,
  width = VIEW_W,
  height = VIEW_H,
  padY = PAD_Y,
): string {
  const [min, max] = domain;
  const span = max - min || 1;
  const usable = height - padY * 2;
  return values
    .map((value, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - padY - ((value - min) / span) * usable;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Observed range, padded so the extremes don't sit on the stroke edge. */
export function sparklineDomain(values: readonly number[]): SparklineDomain {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

/** Middle 50% of the series — the "is this reading unusual?" reference band. */
export function interquartileRange(values: readonly number[]): SparklineDomain | undefined {
  if (values.length < 4) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };
  return [at(0.25), at(0.75)];
}

/**
 * The domain as display text. An autoscaled sparkline without a stated range
 * can't be decoded, so callers should render this next to the graphic.
 */
export function rangeLabel(domain: SparklineDomain): string {
  return `${Math.round(domain[0])}–${Math.round(domain[1])}`;
}

type SparklineProps = {
  points: readonly SparklinePoint[];
  /** Describe what is plotted; the domain and endpoints are appended. */
  label: string;
  /** Defaults to the observed range. Pass a fixed domain to compare series. */
  domain?: SparklineDomain;
  /** Shaded reference range, e.g. `interquartileRange(values)`. */
  band?: SparklineDomain;
  tone?: SparklineTone;
  /** Width in `em`, so the graphic scales with its surrounding type. */
  widthEm?: number;
  className?: string;
};

export function Sparkline({
  points,
  label,
  domain,
  band,
  tone = "unchanged",
  widthEm = 5,
  className,
}: SparklineProps) {
  // Below two points there is no shape to show. Render nothing rather than a
  // decorative stub — the adjacent number is still the honest reading.
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const resolvedDomain = domain ?? sparklineDomain(values);
  const [min, max] = resolvedDomain;
  const span = max - min || 1;
  const path = buildSparklinePath(values, resolvedDomain);

  const last = points[points.length - 1];
  const first = points[0];
  const usable = VIEW_H - PAD_Y * 2;
  const toY = (value: number) => VIEW_H - PAD_Y - ((value - min) / span) * usable;
  const lastY = toY(last.value);

  const bandTop = band ? toY(Math.max(band[1], min)) : 0;
  const bandBottom = band ? toY(Math.min(band[0], max)) : 0;

  const accessibleLabel =
    `${label}: ${points.length} readings from ${first.label} to ${last.label}, ` +
    `ranging ${rangeLabel(resolvedDomain)}. Latest ${Math.round(last.value)} at ${last.label}.`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      // em sizing keeps it word-sized against whatever type it sits in, and the
      // aspect matches the viewBox (5:1) so the stroke never distorts.
      style={{ width: `${widthEm}em`, height: `${widthEm / 5}em` }}
      className={`inline-block shrink-0 align-[-0.15em] overflow-visible ${className ?? ""}`}
      aria-label={accessibleLabel}
    >
      {band ? (
        <rect
          x="0"
          y={bandTop}
          width={VIEW_W}
          height={Math.max(bandBottom - bandTop, 0.5)}
          fill="currentColor"
          opacity="0.1"
        />
      ) : null}
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
        vectorEffect="non-scaling-stroke"
      />
      {/* Tufte marks the current reading so the eye lands on "now" first. */}
      <circle cx={VIEW_W} cy={lastY} r="2" fill={TONE_COLOR[tone]} />
    </svg>
  );
}
