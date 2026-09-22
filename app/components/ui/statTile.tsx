import type { ReactNode } from "react";

/**
 * A labelled figure. The history and compare routes had five stylings of this
 * one thing — `rounded-md bg-slate-950/40`, `rounded-lg border bg-slate-950/30`,
 * `weather-surface text-center text-2xl` — so a reader crossing one page met
 * the same fact in three frames. One surface, one type size, an optional unit
 * and an optional line under the figure.
 */
type StatTileProps = {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  detail?: ReactNode;
  className?: string;
};

export function StatTile({ label, value, unit, detail, className = "" }: StatTileProps) {
  return (
    <div className={`weather-surface px-3 py-2.5 ${className}`.trim()}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-100">
        {value}
        {unit ? <span className="text-sm font-normal text-slate-400"> {unit}</span> : null}
      </p>
      {/* A div, not a p: the phase map's tile carries a definition list and two
          sentences under its figure, and a <dl> inside a <p> is invalid. */}
      {detail ? <div className="mt-1 text-xs text-slate-400">{detail}</div> : null}
    </div>
  );
}
