"use client";

import { formatMonthShortUtc } from "../../../lib/formatters";

/**
 * The month picker, once. The history explorer and the time-machine dialog each
 * drew their own row of month buttons — one with a 44px target and
 * `aria-pressed`, the other with neither and a `Date` built in local time to
 * spell the month. One grid, both places; the calendar picker in
 * `app/components/TimeMachineCalendarPicker.tsx` still carries a third copy.
 */
export function MonthGrid({
  months,
  selectedMonth,
  onSelect,
  label = "Month",
}: {
  /** Months on record for the chosen year, 1–12. */
  months: number[];
  /** The month currently selected, or nothing. */
  selectedMonth?: number;
  onSelect: (month: number) => void;
  label?: string;
}) {
  return (
    <fieldset className="flex flex-wrap gap-1.5">
      <legend className="sr-only">{label}</legend>
      {months.map((month) => {
        const selected = month === selectedMonth;
        return (
          <button
            key={month}
            type="button"
            onClick={() => onSelect(month)}
            aria-pressed={selected}
            className={`min-h-[44px] min-w-[3.25rem] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors weather-focus-ring ${
              selected
                ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
                : "border-[color:var(--border-default)] text-slate-300 hover:bg-[var(--bg-nested)]"
            }`}
          >
            {formatMonthShortUtc(month)}
          </button>
        );
      })}
    </fieldset>
  );
}
