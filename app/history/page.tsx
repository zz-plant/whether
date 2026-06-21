"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ReportShell } from "../components/reportShell";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { useDecisionHistory } from "../components/home/useDecisionHistory";
import { RegimeStats } from "../components/history/RegimeStats";
import { getTimeMachineMonthsByYear, getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";

const REGIME_DISPLAY: Record<string, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Uncertain",
  EXPANSION: "Expansion",
};

type Coverage = Record<number, number[]>;

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { history } = useDecisionHistory();

  useEffect(() => { document.title = "Historical trends — Whether"; }, []);

  const urlMonth = Number(searchParams?.get("month")) || 0;
  const urlYear = Number(searchParams?.get("year")) || 0;

  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [selectedYear, setSelectedYear] = useState(urlYear);
  const [selectedMonth, setSelectedMonth] = useState(urlMonth);

  useEffect(() => {
    const data = getTimeMachineMonthsByYear();
    setCoverage(data);
    const years = Object.keys(data).map(Number).sort((a, b) => b - a);
    if (years.length > 0) {
      setSelectedYear((prev) => prev || years[0]);
    }
  }, []);

  const regimeSeries = useMemo(() => getTimeMachineRegimeSeries(), []);

  const REGIME_COLORS: Record<string, string> = {
    EXPANSION: "bg-emerald-500",
    SCARCITY: "bg-rose-500",
    DEFENSIVE: "bg-amber-500",
    VOLATILE: "bg-sky-500",
  };
  const regimeForPeriod = useMemo(() => {
    if (!selectedYear || !selectedMonth || !coverage) return null;
    const series = getTimeMachineRegimeSeries();
    const entry = series.find((e) => e.year === selectedYear && e.month === selectedMonth);
    return entry?.regime ?? null;
  }, [selectedYear, selectedMonth, coverage]);

  const years = useMemo(
    () => coverage ? Object.keys(coverage).map(Number).sort((a, b) => b - a) : [],
    [coverage],
  );
  const months = selectedYear && coverage ? (coverage[selectedYear] ?? []) : [];

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
    <ReportShell
      model={{
        status: { statusLabel: "Historical", recordDateLabel: "", fetchedAtLabel: "", treasurySource: "https://fred.stlouisfed.org" },
        page: { pageTitle: "History", pageSummary: "Tightness and risk appetite over time.", sectionLinks: [], currentPath: "/history" },
        trust: { trustStatusLabel: "Stable", trustStatusDetail: "", trustStatusAction: "", trustStatusTone: "stable" },
        chrome: { sidebarVariant: "full" },
      }}
    >
      <section className="weather-panel space-y-5 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">Historical trends</h1>
        <p className="text-sm text-slate-300">
          Tightness and risk appetite over the last 12 available periods.
        </p>

        {regimeSeries.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">Regime timeline</p>
            <div className="flex flex-wrap gap-1">
              {regimeSeries.slice(-24).map((entry) => {
                const isSelected = entry.year === selectedYear && entry.month === selectedMonth;
                const color = REGIME_COLORS[entry.regime] ?? "bg-slate-600";
                const monthLabel = new Date(entry.year, entry.month - 1).toLocaleString("en", { month: "short" });
                return (
                  <button
                    key={`${entry.year}-${entry.month}`}
                    type="button"
                    onClick={() => navigateTo(entry.year, entry.month)}
                    title={`${monthLabel} ${entry.year}: ${entry.regime}`}
                    className={`h-8 w-8 rounded-sm transition-transform hover:scale-110 ${color} ${
                      isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-slate-950 scale-110" : "opacity-80 hover:opacity-100"
                    }`}
                    aria-label={`${monthLabel} ${entry.year}: ${entry.regime}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-fluid-micro text-slate-500">
              {Object.entries(REGIME_COLORS).map(([regime, color]) => (
                  <span key={regime} className="inline-flex items-center gap-1">
                    <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} aria-hidden="true" />
                    {REGIME_DISPLAY[regime] ?? regime}
                  </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Year/month navigation */}
        {years.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedMonth(0); }}
                className="min-h-[44px] rounded-md border border-slate-800/60 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 focus:border-sky-400/60 focus:outline-none"
                aria-label="Select year"
              >
                {years.map((year) => (
                  <option key={year} value={year} className="bg-slate-950">{year}</option>
                ))}
              </select>
            </div>
            {months.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {months.map((month) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => navigateTo(selectedYear, month)}
                    className={`min-h-[44px] rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      selectedYear === urlYear && month === urlMonth
                        ? "bg-sky-500/18 text-sky-100 border border-sky-400/40"
                        : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"
                    }`}
                  >{new Date(selectedYear, month - 1).toLocaleString("en", { month: "short" })}</button>
                ))}
              </div>
            ) : null}
            {selectedMonth > 0 ? (
              <button
                type="button"
                onClick={clearSelection}
                className="text-fluid-micro text-sky-200 hover:text-sky-100 underline decoration-sky-600"
              >Clear selection</button>
            ) : null}
          </div>
        ) : <p className="text-xs text-slate-500">Loading historical data...</p>}

        {regimeForPeriod ? (
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 space-y-3">
            <div className="space-y-1">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Selected period</p>
              <p className="text-sm text-slate-100">{selectedMonth}/{selectedYear}</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.08em] ${
                regimeForPeriod === "EXPANSION" ? "text-emerald-200 bg-emerald-500/10" :
                regimeForPeriod === "SCARCITY" ? "text-rose-200 bg-rose-500/10" :
                regimeForPeriod === "DEFENSIVE" ? "text-amber-200 bg-amber-500/10" :
                "text-slate-200 bg-slate-500/10"
              }`}>{regimeForPeriod}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/60">
              <Link
                href={`/?month=${selectedMonth}&year=${selectedYear}`}
                className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] no-underline w-full sm:w-auto"
              >
                View Weekly Brief for this period &rarr;
              </Link>
            </div>
          </div>
        ) : null}

        <RegimeStats />

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Tightness</p>
            <HistoricalTrendChart metric="tightness" label="Tightness" color="#f87171" />
          </div>
          <div className="space-y-2">
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Risk appetite</p>
            <HistoricalTrendChart metric="riskAppetite" label="Risk appetite" color="#34d399" />
          </div>
        </div>
      </section>

      {history.length > 0 ? (
        <section className="weather-panel space-y-4 px-5 py-5">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Decision archive</h2>
          <p className="text-sm text-slate-300">Past weekly decisions recorded from your visits.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/60 text-left text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">
                  <th className="pb-2 pr-4">Week</th>
                  <th className="pb-2 pr-4">Decision</th>
                  <th className="pb-2 pr-4">Regime</th>
                  <th className="pb-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 24).map((record) => (
                  <tr key={record.recordDate} className="border-b border-slate-800/40">
                    <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">{record.recordDate}</td>
                    <td className="py-2.5 pr-4 text-slate-200">{record.action}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-fluid-micro ${
                        record.regime === "EXPANSION" ? "text-emerald-200 bg-emerald-500/10" :
                        record.regime === "SCARCITY" ? "text-rose-200 bg-rose-500/10" :
                        record.regime === "DEFENSIVE" ? "text-amber-200 bg-amber-500/10" :
                        "text-slate-200 bg-slate-500/10"
                      }`}>{record.regime}</span>
                    </td>
                    <td className="py-2.5 text-slate-400">{record.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length > 24 ? (
            <p className="text-fluid-micro text-slate-500">Showing last 24 of {history.length} recorded weeks.</p>
          ) : null}
        </section>
      ) : null}
    </ReportShell>
  );
}
