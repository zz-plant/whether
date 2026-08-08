export type PostureDialProps = {
  idPrefix: string;
  /** -1 = fully loosen, 0 = neutral, +1 = fully tighten. */
  value: number;
  /** Previous reading on the same scale. Omit when there is no prior week. */
  previous?: number;
  /** Short posture word rendered under the dial, e.g. "Tighten". */
  label: string;
  className?: string;
};

const clamp = (v: number) => (Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);

/** value -1 → 180° (left), 0 → 90° (up), +1 → 0° (right); center (100,100). */
const pointAt = (v: number, r: number) => {
  const t = ((90 - v * 90) * Math.PI) / 180;
  return { x: 100 + r * Math.cos(t), y: 100 - r * Math.sin(t) };
};

export function PostureDial({ idPrefix, value, previous, label, className }: PostureDialProps) {
  const current = clamp(value);
  const prior = previous === undefined ? undefined : clamp(previous);

  const delta = prior === undefined ? 0 : current - prior;
  const hasDelta = Math.abs(delta) > 0.001;

  // Arc always runs low→high so sweep=1 stays the minor arc regardless of direction.
  const bandStart = prior === undefined ? undefined : pointAt(Math.min(prior, current), 78);
  const bandEnd = prior === undefined ? undefined : pointAt(Math.max(prior, current), 78);

  const needleColor =
    current > 0.02
      ? "var(--accent-danger)"
      : current < -0.02
        ? "var(--accent-success)"
        : "var(--accent-info)";
  const needleFrom = pointAt(current, 24);
  const needleTo = pointAt(current, 84);

  const desc =
    prior === undefined
      ? "No prior reading to compare."
      : !hasDelta
        ? "Unchanged since last week."
        : delta > 0
          ? "Moved toward tighten since last week."
          : "Moved toward loosen since last week.";

  const capStyle = { letterSpacing: "0.08em", textTransform: "uppercase" } as const;

  return (
    <svg
      viewBox="0 0 200 138"
      width="100%"
      style={{ height: "auto" }}
      role="img"
      aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`}
      className={className}
    >
      <title id={`${idPrefix}-title`}>{`Posture: ${label}`}</title>
      <desc id={`${idPrefix}-desc`}>{desc}</desc>

      <path
        d="M 22 100 A 78 78 0 0 1 178 100"
        fill="none"
        stroke="var(--border-default)"
        strokeWidth={10}
        strokeLinecap="round"
      />

      {hasDelta && bandStart && bandEnd ? (
        <path
          d={`M ${bandStart.x} ${bandStart.y} A 78 78 0 0 1 ${bandEnd.x} ${bandEnd.y}`}
          fill="none"
          stroke={delta > 0 ? "var(--accent-danger)" : "var(--accent-success)"}
          strokeWidth={10}
          strokeOpacity={0.35}
          strokeLinecap="butt"
        />
      ) : null}

      {prior !== undefined ? (
        <line
          x1={pointAt(prior, 68).x}
          y1={pointAt(prior, 68).y}
          x2={pointAt(prior, 88).x}
          y2={pointAt(prior, 88).y}
          stroke="var(--app-text-muted)"
          strokeWidth={2}
          strokeOpacity={0.7}
        />
      ) : null}

      <line
        x1={needleFrom.x}
        y1={needleFrom.y}
        x2={needleTo.x}
        y2={needleTo.y}
        stroke={needleColor}
        strokeWidth={3}
        strokeLinecap="round"
      />

      <circle
        cx={100}
        cy={100}
        r={5}
        fill="var(--bg-panel)"
        stroke="var(--border-strong)"
        strokeWidth={2}
      />

      <text x={22} y={116} textAnchor="middle" fill="var(--app-text-muted)" fontSize={9} style={capStyle}>
        Loosen
      </text>
      <text x={178} y={116} textAnchor="middle" fill="var(--app-text-muted)" fontSize={9} style={capStyle}>
        Tighten
      </text>

      {/* Below the arc: the needle sweeps the whole interior, so nothing else can live there. */}
      <text x={100} y={133} textAnchor="middle" fill="var(--app-text)" fontSize={15} fontWeight={600}>
        {label}
      </text>
    </svg>
  );
}
