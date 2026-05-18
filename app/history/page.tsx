"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "../components/pageShell";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { useDecisionHistory } from "../components/home/useDecisionHistory";
import { getTimeMachineMonthsByYear, getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";

type Coverage = Record<number, number[]>;

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { history } = useDecisionHistory();

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

  /* Compute regime for the selected month/year */
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
    <PageShell backdropVariant="default" showFooter>
      <section className="weather-panel space-y-5 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">Historical trends</h1>
        <p className="text-sm text-slate-300">
          Tightness and risk appetite over the last 12 available periods.
        </p>

        {/* Year/month navigation */}
        {years.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => { setSelectedYear(year); setSelectedMonth(0); }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedYear === year
                      ? "bg-sky-500/12 text-sky-100 border border-sky-500/30"
                      : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"
                  }`}
                >{year}</button>
              ))}
            </div>
            {months.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {months.map((month) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => navigateTo(selectedYear, month)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
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
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 space-y-1">
            <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Selected period</p>
            <p className="text-sm text-slate-100">{selectedMonth}/{selectedYear}</p>
            <span className={`inline-block rounded-full px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.08em] ${
              regimeForPeriod === "EXPANSION" ? "text-emerald-200 bg-emerald-500/10" :
              regimeForPeriod === "SCARCITY" ? "text-rose-200 bg-rose-500/10" :
              regimeForPeriod === "DEFENSIVE" ? "text-amber-200 bg-amber-500/10" :
              "text-slate-200 bg-slate-500/10"
            }`}>{regimeForPeriod}</span>
          </div>
        ) : null}

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
                <tr className="border-b border-slate-700/60 text-left text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">
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
    </PageShell>
  );
}
