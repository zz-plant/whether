import { PageShell } from "../components/pageShell";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";

export const runtime = "edge";
export const revalidate = 3600;

export default function ArchivePage() {
  const series = getTimeMachineRegimeSeries();

  /* Group by year for navigation */
  const byYear: Record<number, typeof series> = {};
  series.forEach((entry) => {
    if (!byYear[entry.year]) byYear[entry.year] = [];
    byYear[entry.year].push(entry);
  });

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <PageShell backdropVariant="default" showFooter>
      <article className="weather-panel space-y-6 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">Brief Archive</h1>
        <p className="text-sm text-slate-300">
          All available historical brief periods from the time machine cache.
          Each entry shows the regime and description for that period.
        </p>

        {years.map((year) => (
          <section key={year} className="space-y-3">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400 sticky top-0 bg-slate-950 py-2">{year}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/60 text-left text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Regime</th>
                    <th className="pb-2">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {byYear[year].slice().reverse().map((entry, i) => (
                    <tr key={entry.recordDate} className="border-b border-slate-800/40">
                      <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{entry.recordDate}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-fluid-micro ${
                          entry.regime === "EXPANSION" ? "text-emerald-200 bg-emerald-500/10" :
                          entry.regime === "SCARCITY" ? "text-rose-200 bg-rose-500/10" :
                          entry.regime === "DEFENSIVE" ? "text-amber-200 bg-amber-500/10" :
                          "text-slate-200 bg-slate-500/10"
                        }`}>{entry.regime}</span>
                      </td>
                      <td className="py-2 text-slate-400 max-w-md truncate">{entry.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </article>
    </PageShell>
  );
}
