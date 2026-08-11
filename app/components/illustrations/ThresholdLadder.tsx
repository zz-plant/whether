export type ThresholdLadderProps = {
  idPrefix: string;
  /** Rail domain. */
  min: number;
  max: number;
  /** Where the signal sits now. */
  current: number;
  /** Crossing this fires the rule. */
  trigger: number;
  /** Crossing this reverses the rule. Omit if the rule has no reversal condition. */
  reversal?: number;
  /** Unit suffix for the readout, e.g. "%" or "bps". */
  unit?: string;
  /** Name of the measured signal, for the accessible title. */
  signalLabel: string;
  className?: string;
};

const formatNumber = (v: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);

const RAIL_START = 12;
const RAIL_END = 228;
const RAIL_Y = 30;

export function ThresholdLadder({
  idPrefix,
  min,
  max,
  current,
  trigger,
  reversal,
  unit = "",
  signalLabel,
  className,
}: ThresholdLadderProps) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

  const clamp = (v: number) => (Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min);
  const xFor = (v: number) =>
    RAIL_START + ((clamp(v) - min) / (max - min)) * (RAIL_END - RAIL_START);

  const currentValue = clamp(current);
  const triggerValue = clamp(trigger);
  const reversalValue = reversal === undefined ? undefined : clamp(reversal);

  const xCurrent = xFor(currentValue);
  const xTrigger = xFor(triggerValue);

  // No space before "%", a thin space before a word unit, nothing when unitless.
  const readout = `${formatNumber(currentValue)}${unit === "" ? "" : unit === "%" ? "" : " "}${unit}`;

  const desc =
    reversalValue === undefined
      ? `Trigger at ${formatNumber(triggerValue)}${unit}.`
      : `Trigger at ${formatNumber(triggerValue)}${unit}. Reversal at ${formatNumber(reversalValue)}${unit}.`;

  // Keep end-of-rail captions from spilling out of the viewBox.
  const clampLabelX = (x: number) => Math.min(Math.max(x, 26), 214);

  return (
    <svg
      viewBox="0 0 240 56"
      width="100%"
      style={{ height: "auto" }}
      role="img"
      aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`}
      className={className}
    >
      <title id={`${idPrefix}-title`}>{`${signalLabel}: ${readout}`}</title>
      <desc id={`${idPrefix}-desc`}>{desc}</desc>

      <line
        x1={RAIL_START}
        y1={RAIL_Y}
        x2={RAIL_END}
        y2={RAIL_Y}
        stroke="var(--border-default)"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {Math.abs(xCurrent - xTrigger) > 0.5 ? (
        <line
          x1={xCurrent}
          y1={RAIL_Y}
          x2={xTrigger}
          y2={RAIL_Y}
          stroke="var(--accent-warning)"
          strokeWidth={6}
          strokeOpacity={0.28}
          strokeLinecap="butt"
        />
      ) : null}

      <line
        x1={xTrigger}
        y1={RAIL_Y - 8}
        x2={xTrigger}
        y2={RAIL_Y + 8}
        stroke="var(--accent-danger)"
        strokeWidth={2}
      />
      <text
        x={clampLabelX(xTrigger)}
        y={RAIL_Y - 14}
        textAnchor="middle"
        fill="var(--app-text-muted)"
        fontSize={9}
      >
        Trigger
      </text>

      {reversalValue !== undefined ? (
        <>
          <line
            x1={xFor(reversalValue)}
            y1={RAIL_Y - 8}
            x2={xFor(reversalValue)}
            y2={RAIL_Y + 8}
            stroke="var(--accent-success)"
            strokeWidth={2}
            strokeDasharray="3 2"
          />
          <text
            x={clampLabelX(xFor(reversalValue))}
            y={RAIL_Y - 14}
            textAnchor="middle"
            fill="var(--app-text-muted)"
            fontSize={9}
          >
            Reversal
          </text>
        </>
      ) : null}

      <circle
        cx={xCurrent}
        cy={RAIL_Y}
        r={5}
        fill="var(--bg-panel)"
        stroke="var(--app-text)"
        strokeWidth={2.5}
      />
      {/* Readout sits under the dot; domain bounds sit at the rail ends. */}
      <text
        x={clampLabelX(xCurrent)}
        y={RAIL_Y + 20}
        textAnchor="middle"
        fill="var(--app-text)"
        fontSize={10}
        fontWeight={600}
      >
        {readout}
      </text>

      <text x={RAIL_START} y={RAIL_Y + 20} textAnchor="start" fill="var(--app-text-muted)" fontSize={8}>
        {formatNumber(min)}
      </text>
      <text x={RAIL_END} y={RAIL_Y + 20} textAnchor="end" fill="var(--app-text-muted)" fontSize={8}>
        {formatNumber(max)}
      </text>
    </svg>
  );
}
