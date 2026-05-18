import { PageShell } from "../components/pageShell";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";

export const runtime = "edge";
export const revalidate = 3600;

type Transition = {
  from: string;
  to: string;
  date: string;
  precededBy: string;
};

export default function RegimeChangesPage() {
  const series = getTimeMachineRegimeSeries();

  /* Detect transitions */
  const transitions: Transition[] = [];
  for (let i = 1; i < series.length; i++) {
    if (series[i].regime !== series[i - 1].regime) {
      const prevDesc = series[i - 1]?.summary ?? "";
      transitions.push({
        from: series[i - 1].regime,
        to: series[i].regime,
        date: series[i].recordDate,
        precededBy: prevDesc,
      });
    }
  }

  /* Count transitions by type */
  const typeCount: Record<string, number> = {};
  transitions.forEach((t) => {
    const key = `${t.from} → ${t.to}`;
    typeCount[key] = (typeCount[key] ?? 0) + 1;
  });
  const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);

  return (
    <PageShell backdropVariant="default" showFooter>
      <article className="weather-panel space-y-6 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">Regime Change Log</h1>
        <p className="text-sm text-slate-300">
          Every regime transition detected in the historical record. {transitions.length} transitions recorded.
        </p>

        <section className="space-y-3">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Most common transitions</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedTypes.slice(0, 6).map(([key, count]) => (
              <div key={key} className="weather-surface px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-200">{key.replace("→", " → ")}</span>
                <span className="text-xs font-semibold text-slate-400">{count}x</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">All transitions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/60 text-left text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">From</th>
                  <th className="pb-2 pr-3">To</th>
                  <th className="pb-2">Context</th>
                </tr>
              </thead>
              <tbody>
                {transitions.slice().reverse().map((t, i) => (
                  <tr key={i} className="border-b border-slate-800/40">
                    <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{t.date}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-fluid-micro ${
                        t.from === "EXPANSION" ? "text-emerald-200 bg-emerald-500/10" :
                        t.from === "SCARCITY" ? "text-rose-200 bg-rose-500/10" :
                        t.from === "DEFENSIVE" ? "text-amber-200 bg-amber-500/10" :
                        "text-slate-200 bg-slate-500/10"
                      }`}>{t.from}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-fluid-micro ${
                        t.to === "EXPANSION" ? "text-emerald-200 bg-emerald-500/10" :
                        t.to === "SCARCITY" ? "text-rose-200 bg-rose-500/10" :
                        t.to === "DEFENSIVE" ? "text-amber-200 bg-amber-500/10" :
                        "text-slate-200 bg-slate-500/10"
                      }`}>{t.to}</span>
                    </td>
                    <td className="py-2 text-slate-400 max-w-xs truncate">{t.precededBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-fluid-micro text-slate-500">
          {transitions.length} transitions recorded from {series[0]?.recordDate ?? "unknown"} to {series[series.length - 1]?.recordDate ?? "present"}.
          <br />Data sourced from the time machine cache. Updated automatically when new data is available.
        </p>
      </article>
    </PageShell>
  );
}
