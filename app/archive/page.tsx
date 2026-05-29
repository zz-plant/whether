"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";

export const runtime = "edge";
export const revalidate = 3600;

const REGIME_META: Record<string, { label: string; description: string; color: string }> = {
  EXPANSION: {
    label: "Expansion",
    description: "Capital is cheap and risk appetite is healthy. Move quickly to capture share.",
    color: "text-emerald-200 bg-emerald-500/10 border-emerald-500/20",
  },
  VOLATILE: {
    label: "Volatile",
    description: "Capital is cheaper but risk appetite is weak. Build trust and resilience.",
    color: "text-amber-200 bg-amber-500/10 border-amber-500/20",
  },
  SCARCITY: {
    label: "Scarcity",
    description: "Capital is expensive and risk appetite is low. Prioritize survival over growth.",
    color: "text-rose-200 bg-rose-500/10 border-rose-500/20",
  },
  DEFENSIVE: {
    label: "Defensive",
    description: "Tight capital markets and weak demand. Focus on cash preservation and core operations.",
    color: "text-slate-200 bg-slate-500/10 border-slate-500/20",
  },
};

export default function ArchivePage() {
  const router = useRouter();
  const series = getTimeMachineRegimeSeries();

  const byRegime: Record<string, typeof series> = {};
  series.forEach((entry) => {
    if (!byRegime[entry.regime]) byRegime[entry.regime] = [];
    byRegime[entry.regime].push(entry);
  });

  const regimeCounts: Record<string, number> = {};
  series.forEach((entry) => {
    regimeCounts[entry.regime] = (regimeCounts[entry.regime] || 0) + 1;
  });

  const regimes = ["EXPANSION", "VOLATILE", "SCARCITY", "DEFENSIVE"] as const;

  return (
    <PageShell backdropVariant="default" showFooter>
      <article className="weather-panel space-y-6 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">Brief Archive</h1>
        <p className="text-sm text-slate-300">
          Historical macro regime briefs organized by regime type.
          Click any row to view the brief for that period.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {regimes.map((regime) => {
            const meta = REGIME_META[regime];
            const count = regimeCounts[regime] || 0;
            if (!meta || !count) return null;
            return (
              <div key={regime} className={`rounded-sm border p-3 ${meta.color}`}>
                <p className="text-fluid-xs font-semibold uppercase tracking-[0.08em]">{meta.label}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
                <p className="text-fluid-micro text-slate-400 mt-0.5">briefs</p>
              </div>
            );
          })}
        </div>

        {regimes.map((regime) => {
          const entries = byRegime[regime] || [];
          if (entries.length === 0) return null;
          const regimeMeta = REGIME_META[regime];
          const sortedEntries = entries.slice().reverse(); // newest first

          return (
            <section key={regime} className="space-y-3">
              <div className="sticky top-0 bg-slate-950 py-2 z-10 border-b border-slate-800/60">
                <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  {regimeMeta?.label || regime} Regime
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{regimeMeta?.description}</p>
              </div>

              <div className="rounded-sm border border-slate-700/30 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900/40 text-left text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 border-b border-slate-800">
                      <th className="px-3 py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Year</th>
                      <th className="py-2 pr-3">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEntries.map((entry) => {
                      const href = `/?month=${entry.month}&year=${entry.year}`;
                      return (
                        <tr
                          key={entry.recordDate}
                          className="border-t border-slate-800/20 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-2 px-3 pr-4 text-slate-400 whitespace-nowrap">
                            <Link href={href} className="hover:text-sky-400 transition-colors">
                              {entry.recordDate}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 text-slate-400">{entry.year}</td>
                          <td className="py-2 text-slate-400 max-w-md truncate pr-3">
                            <Link href={href} className="hover:text-sky-400 transition-colors">
                              {entry.summary}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </article>
    </PageShell>
  );
}
