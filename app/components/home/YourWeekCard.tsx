import type { ReactNode } from "react";

/**
 * One card for the reader's own state: the decisions they track and the
 * weekly close. These were two bordered panels with their own headings and
 * their own privacy footers, and for a first-time reader both were empty —
 * two screens of "nothing here yet" under the brief. One card, one heading,
 * one privacy line, and each half stays a row when it has nothing to show.
 */
export function YourWeekCard({
  decisions,
  closeout,
}: {
  decisions: ReactNode;
  closeout: ReactNode;
}) {
  return (
    <section
      aria-labelledby="your-week-heading"
      data-sticky-strip-hide
      className="weather-section rounded-xl border border-slate-800/70 bg-slate-900/40 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="your-week-heading" className="type-section font-semibold tracking-tight text-white">
          Your week
        </h2>
        <p className="text-fluid-nano text-white/40">Saved in this browser only.</p>
      </div>
      <div className="mt-3 divide-y divide-[color:var(--border-default)]">
        <div className="pb-3">{decisions}</div>
        <div className="pt-3">{closeout}</div>
      </div>
    </section>
  );
}
