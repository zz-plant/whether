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
  const yFor = (v: number) => 152 - ((clamp(v) - min) / (max - min)) * 136;

  const currentValue = clamp(current);
  const triggerValue = clamp(trigger);
  const reversalValue = reversal === undefined ? undefined : clamp(reversal);

  const yCurrent = yFor(currentValue);
  const yTrigger = yFor(triggerValue);

  // No space before "%", a thin space before a word unit, nothing when unitless.
  const readout = `${formatNumber(currentValue)}${unit === "" ? "" : unit === "%" ? "" : " "}${unit}`;

  const desc =
    reversalValue === undefined
      ? `Trigger at ${formatNumber(triggerValue)}${unit}.`
      : `Trigger at ${formatNumber(triggerValue)}${unit}. Reversal at ${formatNumber(reversalValue)}${unit}.`;

  return (
    <svg
      viewBox="0 0 124 168"
      width="100%"
      style={{ height: "auto" }}
      role="img"
      aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`}
      className={className}
    >
      <title id={`${idPrefix}-title`}>{`${signalLabel}: ${readout}`}</title>
      <desc id={`${idPrefix}-desc`}>{desc}</desc>

      <line
        x1={56}
        y1={16}
        x2={56}
        y2={152}
        stroke="var(--border-default)"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {Math.abs(yCurrent - yTrigger) > 0.5 ? (
        <line
          x1={56}
          y1={yCurrent}
          x2={56}
          y2={yTrigger}
          stroke="var(--accent-warning)"
          strokeWidth={6}
          strokeOpacity={0.28}
          strokeLinecap="butt"
        />
      ) : null}

      <line x1={46} y1={yTrigger} x2={70} y2={yTrigger} stroke="var(--accent-danger)" strokeWidth={2} />
      <text x={76} y={yTrigger + 3} fill="var(--app-text-muted)" fontSize={9}>
        Trigger
      </text>

      {reversalValue !== undefined ? (
        <>
          <line
            x1={46}
            y1={yFor(reversalValue)}
            x2={70}
            y2={yFor(reversalValue)}
            stroke="var(--accent-success)"
            strokeWidth={2}
            strokeDasharray="3 2"
          />
          <text x={76} y={yFor(reversalValue) + 3} fill="var(--app-text-muted)" fontSize={9}>
            Reversal
          </text>
        </>
      ) : null}

      <circle
        cx={56}
        cy={yCurrent}
        r={5}
        fill="var(--bg-panel)"
        stroke="var(--app-text)"
        strokeWidth={2.5}
      />
      {/* Readout sits left of the rail; notch captions sit right. Two columns never collide. */}
      <text x={44} y={yCurrent + 3} textAnchor="end" fill="var(--app-text)" fontSize={10} fontWeight={600}>
        {readout}
      </text>

      <text x={56} y={164} textAnchor="middle" fill="var(--app-text-muted)" fontSize={8}>
        {formatNumber(min)}
      </text>
      <text x={56} y={11} textAnchor="middle" fill="var(--app-text-muted)" fontSize={8}>
        {formatNumber(max)}
      </text>
    </svg>
  );
}
