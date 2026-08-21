"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink } from "../components/ui/actionLink";
import { ButtonLink } from "../components/ui/buttonLink";
import { TimelineBar } from "../components/TimelineBar";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { REGIME_COLORS } from "../viewModel";
import { formatMonthShortUtc, formatMonthLongYearUtc } from "../../lib/formatters";
import type { TimeMachineRegimeEntry } from "../../lib/timeMachine/timeMachineCache";

type Coverage = Record<number, number[]>;

export function HistoryExplorer({
  coverage,
  initialMonth,
  initialYear,
  regimeSeries,
}: {
  coverage: Coverage;
  initialMonth: number;
  initialYear: number;
  regimeSeries: TimeMachineRegimeEntry[];
}) {
  const router = useRouter();
  const years = useMemo(() => Object.keys(coverage).map(Number).sort((a, b) => b - a), [coverage]);
  const [selectedYear, setSelectedYear] = useState(initialYear || years[0] || 0);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const months = selectedYear ? (coverage[selectedYear] ?? []) : [];
  const regimeForPeriod = regimeSeries.find((entry) => entry.year === selectedYear && entry.month === selectedMonth)?.regime ?? null;

  const navigateTo = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    router.push(`/history?month=${month}&year=${year}`);
  }, [router]);

  const clearSelection = useCallback(() => {
    setSelectedMonth(0);
    router.push("/history");
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
          <h1 className="text-fluid-xl font-semibold text-slate-100">Historical trends</h1>
          <p className="text-sm text-slate-300">Continuous macro regime and funding-pressure trajectory since 2012.</p>
        </div>
        <ActionLink href="/history/compare" variant="pill">Compare two periods &rarr;</ActionLink>
      </div>

      {/* Continuous Zoomable Timeline Bar */}
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between pb-1">
          <p className="type-eyebrow">Interactive macro timeline</p>
          <span className="text-fluid-micro text-slate-400">Pinch or scrub along track to explore</span>
        </div>
        <TimelineBar
          currentMonth={selectedMonth || undefined}
          currentYear={selectedYear || undefined}
          onSelect={handleTimelineSelect}
          defaultZoom="MAX"
          showZoomControls
          variant="detailed"
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-fluid-micro text-slate-400 border-t border-slate-900">
          {(["EXPANSION", "VOLATILE", "DEFENSIVE", "SCARCITY"] as const).map((regime) => (
            <span key={regime} className="inline-flex items-center gap-1.5">
              <span className={`inline-block size-2 rounded-full ${REGIME_COLORS[regime] ?? "bg-slate-500"}`} aria-hidden="true" />
              {getRegimePublicLabel(regime)}
            </span>
          ))}
        </div>
      </div>

      {/* Quick Month / Year Selector */}
      <div className="space-y-3 pt-2">
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

      {regimeForPeriod && selectedMonth > 0 ? (
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/80 px-4 py-3 space-y-3">
          <div className="space-y-1">
            <p className="type-eyebrow">Selected period</p>
            <p className="text-sm font-semibold text-slate-100">
              {formatMonthLongYearUtc(selectedYear, selectedMonth)}
            </p>
            <span className={`inline-block rounded-sm px-2 py-0.5 type-badge text-slate-950 font-bold ${REGIME_COLORS[regimeForPeriod] ?? "bg-slate-500"}`}>
              {getRegimePublicLabel(regimeForPeriod)}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/60">
            <ButtonLink href={`/?month=${selectedMonth}&year=${selectedYear}`} variant="primary" className="w-full sm:w-auto">
              View Weekly Operating Brief for this period &rarr;
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
