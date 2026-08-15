import type { ReactNode } from "react";
import { TrendGlyph, describeTrend, trendDirectionFromDelta, trendToneClass } from "./illustrations/TrendGlyph";

type ScoreVariant = "large" | "compact" | "card";

type ScoreCardProps = {
  /** Metric label (e.g. "Credit conditions") */
  label: string;
  /** Current score (0-100) */
  value: number;
  /** Week-over-week delta */
  delta?: number;
  /** Tooltip text for the value */
  tooltip?: string;
  /** Visual variant */
  variant?: ScoreVariant;
  /** Optional suffix shown after the value (e.g. "/100") */
  suffix?: string;
  /**
   * Direction that counts favorably. Tightness-style scores rise when conditions
   * worsen (default); appetite-style scores rise when conditions improve.
   */
  increaseIsPositive?: boolean;
  /** Optional children rendered below the score (e.g. "vs last week: +3") */
  children?: ReactNode;
};

const scoreColor = (value: number) => {
  if (value >= 70) return "border-emerald-400/50";
  if (value >= 40) return "border-amber-400/50";
  return "border-rose-400/50";
};

/**
 * Delta readout: shaped glyph + tone + a sentence for assistive tech. The bare
 * "↑"/"↓" characters this replaced carried the direction in a decorative
 * codepoint that screen readers announce inconsistently or skip entirely.
 */
function ScoreDelta({
  label,
  delta,
  increaseIsPositive,
  glyphClass = "h-3.5 w-3.5",
  className = "",
}: {
  label: string;
  delta: number;
  increaseIsPositive: boolean;
  glyphClass?: string;
  className?: string;
}) {
  const direction = trendDirectionFromDelta(delta);
  return (
    <span
      className={`inline-flex items-center gap-0.5 align-baseline ${trendToneClass(direction, increaseIsPositive)} ${className}`}
    >
      <TrendGlyph direction={direction} className={glyphClass} />
      {delta !== 0 ? <span aria-hidden="true">{Math.abs(delta)}</span> : null}
      <span className="sr-only">{describeTrend({ label, delta })}</span>
    </span>
  );
}

export function ScoreCard({
  label,
  value,
  delta = 0,
  tooltip,
  variant = "card",
  suffix,
  increaseIsPositive = false,
  children,
}: ScoreCardProps) {
  if (variant === "large") {
    const scoreBorder = scoreColor(value);
    return (
      <div className={`rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 sm:px-6 py-3 text-center min-w-[8rem] border-b-2 ${scoreBorder}`}>
        <p className="type-eyebrow mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums text-slate-100">
          {value}
          <ScoreDelta
            label={label}
            delta={delta}
            increaseIsPositive={increaseIsPositive}
            glyphClass="h-4 w-4"
            className="ml-1 text-lg"
          />
        </p>
        {children}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="group/tip relative">
        <span className="type-eyebrow">
          {label}
        </span>
        <p className="font-semibold tabular-nums text-slate-100" title={tooltip}>
          {value}
          {suffix}
          <ScoreDelta
            label={label}
            delta={delta}
            increaseIsPositive={increaseIsPositive}
            className="ml-1"
          />
        </p>
        {children}
      </div>
    );
  }

  /* card (default) */
  const scoreBorder = scoreColor(value);
  return (
    <div className={`rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 sm:px-6 py-3 text-center min-w-[8rem] border-b-2 ${scoreBorder}`}>
      <p className="type-eyebrow mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums text-slate-100">
        {value}
        {suffix}
        <ScoreDelta
          label={label}
          delta={delta}
          increaseIsPositive={increaseIsPositive}
          glyphClass="h-4 w-4"
          className="ml-1 text-lg"
        />
      </p>
      {children}
    </div>
  );
}
