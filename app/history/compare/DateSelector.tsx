"use client";

import { useRouter, useSearchParams } from "next/navigation";

export interface DateOption {
  year: number;
  month: number;
  label: string;
}

interface DateSelectorProps {
  label: string;
  paramPrefix: string;
  options: DateOption[];
  /** The month the column below draws; left out when it draws the current week. */
  currentYear?: number;
  currentMonth?: number;
  /**
   * The option for the current week, which clears the period's query. Only a period
   * whose column draws the current week without one can offer it: Period B falls back
   * to Mar 2020, so a "current week" choice there loaded a month six years back.
   */
  currentWeekLabel?: string;
}

/**
 * One period's month. The selected option is the month the column below draws, so
 * the page passes the month it loaded, not a default of its own: Period A with no
 * query drew the current week while this showed the newest month-end (2026-10-09:
 * "Sep 2026 · Cloudy" over a column dated Oct 7, Freezing).
 */
export function DateSelector({
  label,
  paramPrefix,
  options,
  currentYear,
  currentMonth,
  currentWeekLabel,
}: DateSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (val) {
      const [year, month] = val.split("-");
      params.set(`year${paramPrefix}`, year);
      params.set(`month${paramPrefix}`, month);
    } else {
      params.delete(`year${paramPrefix}`);
      params.delete(`month${paramPrefix}`);
    }
    router.push(`/history/compare?${params.toString()}`);
  };

  const val = currentYear && currentMonth ? `${currentYear}-${currentMonth}` : "";

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="type-eyebrow">
        {label}
      </label>
      <select
        value={val}
        onChange={handleChange}
        style={{ colorScheme: "light dark" }}
        className="weather-input min-h-[44px] w-full px-3 py-2 text-sm text-[var(--app-text)] cursor-pointer"
      >
        {currentWeekLabel ? <option value="">{currentWeekLabel}</option> : null}
        {options.map((opt) => (
          <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
