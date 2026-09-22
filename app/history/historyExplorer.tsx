"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionLink } from "../components/ui/actionLink";
import { TimelineBar } from "../components/TimelineBar";
import { formatMonthShortUtc, formatMonthLongYearUtc } from "../../lib/formatters";
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
          <p className="text-sm text-slate-300">The call and funding pressure, month by month, since 2012.</p>
        </div>
        <ActionLink href="/history/compare" variant="pill">Compare two periods &rarr;</ActionLink>
      </div>

      {/* Continuous Zoomable Timeline Bar */}
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between pb-1">
          <p className="type-eyebrow">Timeline</p>
          <span className="text-fluid-micro text-slate-400">
            Drag to scrub · shift-drag for single months · pinch or &#8984;-scroll to zoom
          </span>
        </div>
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
            className="min-h-[44px] rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--app-text)] focus:border-sky-400/60 focus:outline-none"
            style={{ colorScheme: "light dark" }}
            aria-label="Select year"
          >
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {months.map((month) => (
              <button
                key={month}
                type="button"
                onClick={() => navigateTo(selectedYear, month)}
                aria-pressed={month === selectedMonth}
                className={`min-h-[44px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  month === selectedMonth
                    ? "bg-sky-500/20 text-sky-100 border border-sky-400/50 shadow-sm"
                    : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"
                }`}
              >
                {formatMonthShortUtc(month)}
              </button>
            ))}
          </div>
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
