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
  /** Optional children rendered below the score (e.g. "vs last week: +3") */
  children?: ReactNode;
};

/** Delta direction: positive = metric moving up, negative = metric moving down.
 *  Credit conditions: up = tighter = amber (bad). Investor sentiment: up = easier = emerald (good). */
const deltaColor = (label: string, delta: number) => {
  if (delta === 0) return "text-slate-600";
  const isTightness = label.toLowerCase().includes("credit");
  if (delta > 0) return isTightness ? "text-amber-200" : "text-emerald-200";
  return isTightness ? "text-emerald-200" : "text-amber-200";
};

const deltaArrow = (delta: number) => (delta > 0 ? "↑" : delta < 0 ? "↓" : "—");

export function ScoreCard({
  label,
  value,
  delta = 0,
  tooltip,
  variant = "card",
  suffix,
  children,
}: ScoreCardProps) {
  if (variant === "large") {
    return (
      <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 sm:px-6 py-3 text-center min-w-[8rem]">
        <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums text-slate-100">
          {value}
          <span className={`text-lg ml-1 ${deltaColor(label, delta)}`}>
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
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </span>
        <p className="font-semibold tabular-nums text-slate-100" title={tooltip}>
          {value}
          {suffix}
          <span className={`ml-1 ${deltaColor(label, delta)}`}>
            {deltaArrow(delta)}{delta !== 0 ? Math.abs(delta) : ""}
          </span>
        </p>
        {children}
      </div>
    );
  }

  /* card (default) */
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 sm:px-6 py-3 text-center min-w-[8rem]">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums text-slate-100">
        {value}
        {suffix}
        <span className={`text-lg ml-1 ${deltaColor(label, delta)}`}>
          {deltaArrow(delta)}{delta !== 0 ? Math.abs(delta) : ""}
        </span>
      </p>
      {children}
    </div>
  );
}
