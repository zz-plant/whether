"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink } from "../components/ui/actionLink";
import { ButtonLink } from "../components/ui/buttonLink";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import type { TimeMachineRegimeEntry } from "../../lib/timeMachine/timeMachineCache";

type Coverage = Record<number, number[]>;

const REGIME_COLORS: Record<string, string> = {
  EXPANSION: "bg-emerald-500",
  SCARCITY: "bg-rose-500",
  DEFENSIVE: "bg-amber-500",
  VOLATILE: "bg-sky-500",
};

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
  const [activeTimelineEntry, setActiveTimelineEntry] = useState<string | null>(null);
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

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-fluid-xl font-semibold text-slate-100">Historical trends</h1>
          <p className="text-sm text-slate-300">Tightness and risk appetite over the last 12 available periods.</p>
        </div>
        <ActionLink href="/history/compare" variant="pill">Compare two periods &rarr;</ActionLink>
      </div>

      {regimeSeries.length > 0 ? (
        <div className="space-y-1.5">
          <p className="type-eyebrow">Regime timeline</p>
          <div className="flex flex-wrap gap-1">
            {regimeSeries.slice(-24).map((entry) => {
              const isSelected = entry.year === selectedYear && entry.month === selectedMonth;
              const monthLabel = new Date(entry.year, entry.month - 1).toLocaleString("en", { month: "short" });
              const entryLabel = `${monthLabel} ${entry.year}: ${entry.regime}`;
              return (
                <button
                  key={`${entry.year}-${entry.month}`}
                  type="button"
                  onClick={() => navigateTo(entry.year, entry.month)}
                  onMouseEnter={() => setActiveTimelineEntry(entryLabel)}
                  onMouseLeave={() => setActiveTimelineEntry(null)}
                  onFocus={() => setActiveTimelineEntry(entryLabel)}
                  onBlur={() => setActiveTimelineEntry(null)}
                  title={entryLabel}
                  className={`h-8 w-8 rounded-md transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${REGIME_COLORS[entry.regime] ?? "bg-slate-600"} ${isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-slate-950 scale-110" : "opacity-80 hover:opacity-100"}`}
                  aria-label={entryLabel}
                />
              );
            })}
          </div>
          <p className="min-h-[1.25em] text-fluid-micro text-slate-300" aria-hidden="true">{activeTimelineEntry ?? " "}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-fluid-micro text-slate-400">
            {Object.entries(REGIME_COLORS).map(([regime, color]) => (
              <span key={regime} className="inline-flex items-center gap-1">
                <span className={`inline-block h-2.5 w-2.5 rounded-md ${color}`} aria-hidden="true" />
                {getRegimePublicLabel(regime)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <select
          value={selectedYear}
          onChange={(event) => { setSelectedYear(Number(event.target.value)); setSelectedMonth(0); }}
          className="min-h-[44px] rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--app-text)] focus:border-sky-400/60 focus:outline-none"
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
              className={`min-h-[44px] rounded-md px-3 py-2 text-xs font-medium transition-colors ${month === selectedMonth ? "bg-sky-500/18 text-sky-100 border border-sky-400/40" : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"}`}
            >
              {new Date(selectedYear, month - 1).toLocaleString("en", { month: "short" })}
            </button>
          ))}
        </div>
        {selectedMonth > 0 ? (
          <button type="button" onClick={clearSelection} className="text-fluid-micro text-sky-200 hover:text-sky-100 underline decoration-sky-600">Clear selection</button>
        ) : null}
      </div>

      {regimeForPeriod ? (
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 space-y-3">
          <div className="space-y-1">
            <p className="type-eyebrow">Selected period</p>
            <p className="text-sm text-slate-100">{selectedMonth}/{selectedYear}</p>
            <span className={`inline-block rounded-sm px-2 py-0.5 type-badge ${REGIME_COLORS[regimeForPeriod] ?? "bg-slate-500"}`}>{getRegimePublicLabel(regimeForPeriod)}</span>
          </div>
          <div className="pt-2 border-t border-slate-800/60">
            <ButtonLink href={`/?month=${selectedMonth}&year=${selectedYear}`} variant="primary" className="w-full sm:w-auto">
              View Weekly Brief for this period &rarr;
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </>
  );
}
