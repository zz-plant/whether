import type { ReactNode } from "react";

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

const deltaColor = (delta: number, increaseIsPositive: boolean) => {
  if (delta === 0) return "text-slate-400";
  const improved = increaseIsPositive ? delta > 0 : delta < 0;
  return improved ? "text-emerald-200" : "text-amber-200";
};

const scoreColor = (value: number) => {
  if (value >= 70) return "border-emerald-400/50";
  if (value >= 40) return "border-amber-400/50";
  return "border-rose-400/50";
};

// "→" for unchanged, matching the delta glyphs on the weekly brief (DecisionHero, CompareStrip).
const deltaArrow = (delta: number) => (delta > 0 ? "↑" : delta < 0 ? "↓" : "→");

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
          <span className={`text-lg ml-1 ${deltaColor(delta, increaseIsPositive)}`}>
            {deltaArrow(delta)}{delta !== 0 ? Math.abs(delta) : ""}
          </span>
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
          <span className={`ml-1 ${deltaColor(delta, increaseIsPositive)}`}>
            {deltaArrow(delta)}{delta !== 0 ? Math.abs(delta) : ""}
          </span>
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
        <span className={`text-lg ml-1 ${deltaColor(delta, increaseIsPositive)}`}>
          {deltaArrow(delta)}{delta !== 0 ? Math.abs(delta) : ""}
        </span>
      </p>
      {children}
    </div>
  );
}
