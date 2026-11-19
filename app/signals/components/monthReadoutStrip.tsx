import type { ReactNode } from "react";

/**
 * A row of months a reader can point at and open, inside an opened instrument.
 *
 * The question over the panel draws the months as a picture with no links (a
 * link inside a `<summary>` is a control inside a control); this is where
 * each month is a real link, to that month in the time machine. Hovering or
 * focusing a month prints what it read on the line above the row, in place
 * of the row's own line; a tap on a touch screen opens the month, where every
 * value is printed. No script: the readout is each link's own text, shown by
 * `:hover` and `:focus-visible`, so it works before hydration and both
 * gestures show the same thing.
 */

type MonthReadout = {
  key: string;
  /** "Mar 2026". */
  label: string;
  /** "Mar", under the column. */
  shortLabel: string;
  /** The year under the column, for the first month and each January; null elsewhere. */
  yearLabel: string | null;
  /** What the month read: "Funding pressure 90 · risk appetite 55". */
  readout: string;
  /** The month in the time machine (`buildTimeMachineHref`); null for a month it does not hold. */
  href: string | null;
  /** The month's mark, drawn over its label. */
  mark?: ReactNode;
};

export function MonthReadoutStrip({
  months,
  label,
  caption,
}: {
  months: readonly MonthReadout[];
  /** Names the list for assistive tech: "Month-ends, Nov 2025 to Oct 2026". */
  label: string;
  /** The row's own line, shown while no month is pointed at: its domain and what a month opens. */
  caption: ReactNode;
}) {
  if (months.length === 0) return null;
  return (
    <div className="group/strip relative max-w-2xl" data-month-readout-strip>
      {/* Two lines tall either way, so a longer readout never moves the row. */}
      <p
        aria-hidden="true"
        className="min-h-10 text-fluid-nano leading-5 text-slate-400 group-has-[a:focus-visible]/strip:invisible group-has-[a:hover]/strip:invisible"
      >
        {caption}
      </p>
      <ol aria-label={label} className="flex">
        {months.map((month) => {
          const body = (
            <>
              {month.mark ? <span className="flex w-full justify-center">{month.mark}</span> : null}
              <span aria-hidden="true" className="text-fluid-nano leading-none text-slate-400">
                {month.shortLabel}
              </span>
              <span aria-hidden="true" className="min-h-3 text-[0.625rem] leading-none tabular-nums text-slate-500">
                {month.yearLabel}
              </span>
              {/* One readout at a time: the month under the pointer wins over the
                  one the keyboard is on, which steps aside while any month is
                  hovered (its rule's `:has()` outranks the focus rule). */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 hidden min-h-10 text-fluid-nano leading-5 text-slate-100 group-focus-visible/month:block group-has-[a:hover]/strip:hidden group-hover/month:block!"
              >
                <span className="font-semibold">{month.label}</span> · {month.readout}
              </span>
            </>
          );
          return (
            <li key={month.key} className="min-w-0 flex-1">
              {month.href ? (
                <a
                  href={month.href}
                  aria-label={`${month.label}: ${month.readout}`}
                  className="group/month flex min-h-11 flex-col items-center justify-end gap-1 rounded-sm py-1 hover:bg-[color:var(--bg-nested)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent-action)]"
                  style={{ touchAction: "manipulation" }}
                >
                  {body}
                </a>
              ) : (
                <span className="group/month flex min-h-11 flex-col items-center justify-end gap-1 py-1">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
