export type AttributionContribution = {
  /** Signal name, already human-readable. */
  label: string;
  /** Positive = tightening pressure, negative = loosening pressure. */
  weight: number;
};

export type AttributionFanProps = {
  idPrefix: string;
  contributions: AttributionContribution[];
  /** Posture word the fan converges on, e.g. "Tighten". */
  postureLabel: string;
  className?: string;
};

const SPAN = 152;
const TOP = 20;
/** Left-column gap. Wide enough that ribbons visibly converge on the contiguous right bar. */
const GAP = 10;

const colorFor = (weight: number) =>
  weight > 0 ? "var(--accent-danger)" : "var(--accent-success)";

export function AttributionFan({
  idPrefix,
  contributions,
  postureLabel,
  className,
}: AttributionFanProps) {
  // Signed sort: all tightening pressure first, then loosening. Direction must group.
  const items = contributions
    .filter((c) => Number.isFinite(c.weight) && c.weight !== 0)
    .slice()
    .sort((a, b) => b.weight - a.weight);

  const total = items.reduce((sum, c) => sum + Math.abs(c.weight), 0);
  if (items.length === 0 || total === 0) return null;

  const available = SPAN - GAP * (items.length - 1);

  // Left column is gapped; right column is contiguous. They are stacked independently.
  const bands: Array<{
    c: AttributionContribution;
    share: number;
    a0: number;
    a1: number;
    b0: number;
    b1: number;
    color: string;
  }> = [];
  for (let i = 0, leftCursor = TOP, rightCursor = TOP; i < items.length; i += 1) {
    const c = items[i];
    const share = Math.abs(c.weight) / total;
    const a0 = leftCursor;
    const a1 = a0 + Math.max(3, available * share);
    const b0 = rightCursor;
    const b1 = b0 + SPAN * share;
    bands.push({ c, share, a0, a1, b0, b1, color: colorFor(c.weight) });
    leftCursor = a1 + GAP;
    rightCursor = b1;
  }

  const percent = new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const count = new Intl.NumberFormat().format(items.length);

  return (
    <div className={className}>
      <svg
        viewBox="0 0 320 176"
        width="100%"
        style={{ height: "auto" }}
        role="img"
        aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`}
      >
        <title id={`${idPrefix}-title`}>{`Signal contributions to posture: ${postureLabel}`}</title>
        <desc id={`${idPrefix}-desc`}>
          {`${count} ${items.length === 1 ? "signal contributes" : "signals contribute"}; ribbon width is share of the shift, red is tightening pressure and green is loosening.`}
        </desc>

        {bands.map(({ c, a0, a1, b0, b1, color }) => (
          <path
            key={`ribbon-${c.label}`}
            d={`M 10 ${a0} C 150 ${a0} 170 ${b0} 310 ${b0} L 310 ${b1} C 170 ${b1} 150 ${a1} 10 ${a1} Z`}
            fill={color}
            fillOpacity={0.3}
            stroke="none"
          />
        ))}

        {bands.map(({ c, a0, a1, color }) => (
          <rect
            key={`node-${c.label}`}
            x={0}
            y={a0}
            width={10}
            height={a1 - a0}
            fill={color}
            fillOpacity={0.9}
          />
        ))}

        {bands.map(({ c, b0, b1, color }) => (
          <rect
            key={`slice-${c.label}`}
            x={310}
            y={b0}
            width={10}
            height={b1 - b0}
            fill={color}
            fillOpacity={0.9}
          />
        ))}

        <text x={320} y={12} textAnchor="end" fill="var(--app-text)" fontSize={10} fontWeight={600}>
          {postureLabel}
        </text>
      </svg>

      <ul className="mt-4 flex list-none flex-col gap-2 p-0 text-fluid-micro">
        {bands.map(({ c, share, color }) => (
          <li key={`legend-${c.label}`} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="shrink-0 rounded-sm"
              style={{ background: color, display: "block", width: 8, height: 8 }}
            />
            <span className="min-w-0 flex-1 truncate">{c.label}</span>
            <span
              className="shrink-0 text-fluid-nano tabular-nums"
              style={{ color: "var(--app-text-muted)" }}
            >
              {percent.format(share)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
