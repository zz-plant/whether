"use client";

import { PageShell } from "../components/pageShell";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { useDecisionHistory } from "../components/home/useDecisionHistory";

export default function HistoryPage() {
  const { history } = useDecisionHistory();

  return (
    <PageShell backdropVariant="default" showFooter>
      <section className="weather-panel space-y-5 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">Historical trends</h1>
        <p className="text-sm text-slate-300">
          Tightness and risk appetite over the last 12 available periods.
        </p>
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
                {history.slice(0, 12).map((record) => (
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
          {history.length > 12 ? (
            <p className="text-fluid-micro text-slate-500">Showing last 12 of {history.length} recorded weeks.</p>
          ) : null}
        </section>
      ) : null}
    </PageShell>
  );
}
