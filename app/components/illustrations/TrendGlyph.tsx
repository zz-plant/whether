/**
 * Canonical direction-of-motion vocabulary.
 *
 * Every delta in the app should describe movement three ways at once: a glyph
 * (shape, so it survives a screenshot and colour-blindness), a tone (colour,
 * resolved against which way counts as favourable for that signal), and a
 * sentence (text, so assistive tech and copied text carry it too).
 *
 * Colour convention, deliberately narrower than the rest of the palette:
 * emerald = moved favourably, amber = moved unfavourably, slate = unchanged.
 * Rose is reserved for the threshold/reversal vocabulary (`ThresholdLadder`,
 * regime severity) — reusing it for an ordinary weekly delta made a routine
 * 2-point move read as a breach.
 *
 * Scope: this module handles a *scalar* move — one number against its previous
 * reading. For the shape of a whole series use `app/components/ui/sparkline.tsx`;
 * for an explicit before/after pair on a rail use `DeltaGlyph`. The three are
 * complementary, not alternatives.
 */

export type TrendDirection = "up" | "down" | "mixed" | "flat";

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export const formatTrendValue = (value: number) => numberFormatter.format(value);

export const trendDirectionFromDelta = (delta: number | null | undefined): TrendDirection => {
  if (delta === null || delta === undefined || !Number.isFinite(delta) || delta === 0) {
    return "flat";
  }
  return delta > 0 ? "up" : "down";
};

/**
 * Adapter for `RegimeSignalIndicator.trendArrow`, which the report model still
 * emits as a literal character. Callers should render the glyph rather than the
 * character so the direction has a shape and an accessible name.
 */
export const trendDirectionFromArrow = (arrow: "↑" | "↓" | "→"): TrendDirection =>
  arrow === "↑" ? "up" : arrow === "↓" ? "down" : "flat";

/** Maps the `directionLabel` vocabulary from `reportDynamics` onto a glyph direction. */
export const trendDirectionFromLabel = (trendLabel?: string): TrendDirection => {
  const key = trendLabel?.trim().toLowerCase() ?? "";
  if (key === "improving" || key === "strengthening" || key === "easing") return "up";
  if (key === "deteriorating" || key === "weakening" || key === "tightening") return "down";
  if (key === "mixed" || key === "unstable") return "mixed";
  return "flat";
};

/**
 * Tone for a movement. `increaseIsPositive` defaults to false because
 * tightness-style scores — the majority here — rise when conditions worsen.
 */
export const trendToneClass = (direction: TrendDirection, increaseIsPositive = false) => {
  if (direction === "flat") return "text-slate-400";
  if (direction === "mixed") return "text-amber-300";
  const improved = increaseIsPositive ? direction === "up" : direction === "down";
  return improved ? "text-emerald-300" : "text-amber-300";
};

/**
 * One sentence naming the metric, the direction, and the size of the move.
 * Built as whole clauses rather than concatenated fragments so it stays
 * translatable.
 */
export const describeTrend = ({
  label,
  delta,
  unit,
  current,
  /** Period the delta spans. Override for anything wider than a week. */
  period = "since last week",
}: {
  label: string;
  delta: number | null | undefined;
  unit?: string;
  current?: number;
  period?: string;
}) => {
  const suffix = unit ? ` ${unit}` : "";
  const at = current === undefined ? "" : ` to ${formatTrendValue(current)}${suffix}`;

  if (delta === null || delta === undefined || !Number.isFinite(delta) || delta === 0) {
    return `${label} unchanged ${period}${at}.`;
  }

  const size = `${formatTrendValue(Math.abs(delta))}${suffix}`;
  return delta > 0
    ? `${label} rose ${size} ${period}${at}.`
    : `${label} fell ${size} ${period}${at}.`;
};

/**
 * Screen-reader-only movement sentence. Pair with an `aria-hidden` glyph so the
 * arrow is not announced as a stray "upwards arrow" character.
 */
export const TrendDescription = (props: Parameters<typeof describeTrend>[0]) => (
  <span className="sr-only">{describeTrend(props)}</span>
);

const GLYPH_PATHS: Record<TrendDirection, string> = {
  up: "M3.5 11.5 11.5 3.5M7.5 3.5h4v4",
  down: "M3.5 4.5 11.5 12.5M7.5 12.5h4v-4",
  mixed: "M2.5 10.5 5.3 7.7l2.2 2.2 3.8-3.8 2.2 2.2",
  flat: "M3 8h10",
};

/**
 * Decorative by design: `aria-hidden`, because the direction belongs in a
 * `TrendDescription` sibling where it can name the metric too.
 */
export const TrendGlyph = ({
  direction,
  className = "h-3.5 w-3.5",
}: {
  direction: TrendDirection;
  className?: string;
}) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" focusable="false">
    <path
      d={GLYPH_PATHS[direction]}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Glyph + tone + accessible sentence in one span — the default way to render a
 * delta. Callers supply their own numeric label as `children` so the visible
 * text stays in each surface's own voice.
 */
export const TrendMark = ({
  label,
  delta,
  unit,
  current,
  increaseIsPositive = false,
  className = "",
  children,
}: {
  label: string;
  delta: number | null | undefined;
  unit?: string;
  current?: number;
  increaseIsPositive?: boolean;
  className?: string;
  children?: React.ReactNode;
}) => {
  const direction = trendDirectionFromDelta(delta);
  return (
    <span
      className={`inline-flex items-center gap-1 ${trendToneClass(direction, increaseIsPositive)} ${className}`}
    >
      <TrendGlyph direction={direction} />
      <TrendDescription label={label} delta={delta} unit={unit} current={current} />
      {children ? <span aria-hidden="true">{children}</span> : null}
    </span>
  );
};
