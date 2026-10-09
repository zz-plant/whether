import type { ReactNode } from "react";

/**
 * Labelled figures, as a definition list set in the running text's size.
 *
 * This was `StatTile`: a framed box with a small grey label over a bold figure,
 * five of them in a row on /history and three on /comps. A figure set larger
 * than the sentence beside it claims to be the page's point, and a row of them
 * claims that five times, so none of them reads as the one that matters
 * (2026-10-09). A page that has one figure to lead with sets it in its own
 * line (`/comps`); everything else is a fact beside the section it qualifies.
 *
 * Wrapped as a row from `sm`, stacked on a phone. The label stays first and the
 * value follows it, so a paste or a screen reader reads "Months on record 177
 * since Jan 2012", the same order the tiles printed.
 */
export function FactList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <dl className={`flex flex-col gap-y-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6 ${className}`.trim()}>
      {children}
    </dl>
  );
}

export function Fact({ label, value, unit }: { label: ReactNode; value: ReactNode; unit?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-100">
        {value}
        {unit ? <span className="font-normal text-slate-400"> {unit}</span> : null}
      </dd>
    </div>
  );
}
