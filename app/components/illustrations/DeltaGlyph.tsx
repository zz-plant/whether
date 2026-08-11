export type DeltaGlyphProps = {
  idPrefix: string;
  /** Reading at the start of the period. */
  previous: number;
  /** Reading now. */
  current: number;
  min: number;
  max: number;
  /** Metric name, for the accessible title. */
  label: string;
  /**
   * Direction that counts favorably. Tightness-style scores rise when conditions
   * worsen (default); appetite-style scores rise when conditions improve.
   */
  increaseIsPositive?: boolean;
  className?: string;
};

const formatValue = (v: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v);

/**
 * Inline before/after mark: ghosted dot at last week's reading, solid dot at this
 * week's, connected by a rule. Reads at 16px, so it can sit in a sentence.
 */
export function DeltaGlyph({
  idPrefix,
  previous,
  current,
  min,
  max,
  label,
  increaseIsPositive = false,
  className,
}: DeltaGlyphProps) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;

  const xFor = (v: number) => 4 + ((Math.min(Math.max(v, min), max) - min) / (max - min)) * 40;
  const xPrev = xFor(previous);
  const xCurr = xFor(current);
  const delta = current - previous;

  const improved = increaseIsPositive ? delta > 0 : delta < 0;
  const color =
    Math.abs(delta) < 0.001
      ? "var(--color-semantic-unchanged-fg)"
      : improved
        ? "var(--accent-success)"
        : "var(--accent-danger)";

  const desc =
    Math.abs(delta) < 0.001
      ? `Unchanged at ${formatValue(current)}.`
      : `${delta > 0 ? "Rose" : "Fell"} from ${formatValue(previous)} to ${formatValue(current)}.`;

  return (
    <svg
      viewBox="0 0 48 16"
      width="100%"
      style={{ height: "auto" }}
      role="img"
      aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`}
      className={className}
    >
      <title id={`${idPrefix}-title`}>{label}</title>
      <desc id={`${idPrefix}-desc`}>{desc}</desc>

      <line x1={4} y1={8} x2={44} y2={8} stroke="var(--border-default)" strokeWidth={1.5} strokeLinecap="round" />

      {Math.abs(xCurr - xPrev) > 0.5 ? (
        <line x1={xPrev} y1={8} x2={xCurr} y2={8} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      ) : null}

      <circle cx={xPrev} cy={8} r={2.5} fill="var(--app-text-muted)" fillOpacity={0.45} />
      <circle cx={xCurr} cy={8} r={3} fill={color} />
    </svg>
  );
}
