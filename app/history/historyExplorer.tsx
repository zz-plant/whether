"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionLink } from "../components/ui/actionLink";
import { MonthGrid } from "../components/history/monthGrid";
import { TimelineBar } from "../components/TimelineBar";
import { formatMonthLongYearUtc } from "../../lib/formatters";
import type { TimeMachineRegimeEntry } from "../../lib/timeMachine/timeMachineCache";

export function HistoryExplorer({
  initialMonth,
  initialYear,
  regimeSeries,
}: {
  initialMonth: number;
  initialYear: number;
  regimeSeries: TimeMachineRegimeEntry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Both pickers read one source. The month grid used to come from the full
  // record while the regime lookup came from a trailing 24-month series, so the
  // grid offered months the rest of the panel could not resolve — picking one
  // older than two years produced a selection with nothing attached to it.
  const coverage = useMemo(() => {
    const byYear = new Map<number, number[]>();
    for (const entry of regimeSeries) {
      const months = byYear.get(entry.year);
      if (months) months.push(entry.month);
      else byYear.set(entry.year, [entry.month]);
    }
    return byYear;
  }, [regimeSeries]);

  const years = useMemo(
    () => [...coverage.keys()].sort((a, b) => b - a),
    [coverage]
  );

  const [selectedYear, setSelectedYear] = useState(initialYear || years[0] || 0);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const months = selectedYear ? (coverage.get(selectedYear) ?? []) : [];
  const hasSelection =
    selectedMonth > 0 &&
    regimeSeries.some(
      (entry) => entry.year === selectedYear && entry.month === selectedMonth
    );

  const navigateTo = useCallback(
    (year: number, month: number) => {
      setSelectedYear(year);
      setSelectedMonth(month);
      // Replace while already exploring a month, so leaving the explorer costs
      // one back-press rather than one per month visited.
      const href = `/history?month=${month}&year=${year}`;
      startTransition(() => {
        if (selectedMonth > 0) router.replace(href);
        else router.push(href);
      });
    },
    [router, selectedMonth]
  );

  const clearSelection = useCallback(() => {
    setSelectedMonth(0);
    startTransition(() => {
      router.replace("/history");
    });
  }, [router]);

  const handleTimelineSelect = useCallback(
    (target: { month: number; year: number }) => {
      navigateTo(target.year, target.month);
    },
    [navigateTo]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-fluid-xl font-semibold text-slate-100">Historical trends</h2>
          <p className="text-sm text-slate-300">Conditions and funding pressure, month by month, since 2012.</p>
        </div>
        <ActionLink href="/history/compare" variant="pill">Compare two periods &rarr;</ActionLink>
      </div>

      {/* The bar carries its own gesture hints as `title`s; a sentence about how
          to drag it is not page content. */}
      <div className="weather-surface space-y-2 p-4">
        <p className="type-eyebrow pb-1">Timeline</p>
        <TimelineBar
          currentMonth={selectedMonth || undefined}
          currentYear={selectedYear || undefined}
          onSelect={handleTimelineSelect}
          defaultZoom="MAX"
          showZoomControls
          variant="detailed"
        />
      </div>

      {/* The precise picker. The scrubber above already names the selected
          period and its regime, so this no longer restates them in a third
          place — it only offers the large targets the 6px-per-month track
          cannot, and the link out to that month's brief. */}
      <div className="space-y-3 pt-2" aria-busy={isPending}>
        <div className="flex items-center justify-between">
          <p className="type-eyebrow">Jump to specific month</p>
          {selectedMonth > 0 ? (
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex min-h-[44px] items-center text-fluid-micro text-sky-200 hover:text-sky-100 underline decoration-sky-600"
            >
              Clear filter
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(event) => { setSelectedYear(Number(event.target.value)); setSelectedMonth(0); }}
            className="min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--app-text)]"
            style={{ colorScheme: "light dark" }}
            aria-label="Select year"
          >
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <MonthGrid
            months={months}
            selectedMonth={selectedMonth || undefined}
            onSelect={(month) => navigateTo(selectedYear, month)}
          />
        </div>
      </div>

      {hasSelection ? (
        <ActionLink
          href={`/?month=${selectedMonth}&year=${selectedYear}`}
          variant="primary"
          className="w-full sm:w-auto"
        >
          View the {formatMonthLongYearUtc(selectedYear, selectedMonth)} brief &rarr;
        </ActionLink>
      ) : null}
    </div>
  );
}
