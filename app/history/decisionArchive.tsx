"use client";

import { useDecisionHistory } from "../components/home/useDecisionHistory";

export function DecisionArchive() {
  const { history } = useDecisionHistory();
  if (history.length === 0) return null;

  return (
    <section className="weather-panel space-y-4 px-5 py-5">
      <h2 className="type-eyebrow">Decision archive</h2>
      <p className="text-sm text-slate-300">Past weekly decisions recorded from your visits.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-700/60 text-left type-eyebrow"><th className="pb-2 pr-4">Week</th><th className="pb-2 pr-4">Decision</th><th className="pb-2 pr-4">Regime</th><th className="pb-2">Confidence</th></tr></thead>
          <tbody>
            {history.slice(0, 24).map((record) => (
              <tr key={record.recordDate} className="border-b border-slate-800/40">
                <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">{record.recordDate}</td>
                <td className="py-2.5 pr-4 text-slate-200">{record.action}</td>
                <td className="py-2.5 pr-4"><span className="rounded-sm bg-slate-500/10 px-2 py-0.5 type-badge text-fluid-micro text-slate-200">{record.regime}</span></td>
                <td className="py-2.5 text-slate-400">{record.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
