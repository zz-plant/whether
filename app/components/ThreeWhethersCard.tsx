import { Users, DollarSign, Lock } from "lucide-react";
import type { ActionStripItem } from "../../lib/report/operatingCalls";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";

const ICONS = [Users, DollarSign, Lock] as const;

export function ThreeWhethersCard({ items }: { items: ActionStripItem[] }) {
  const decisions = items.slice(0, 3);
  if (decisions.length === 0) return null;

  return (
    <section className="weather-section" aria-labelledby="three-whethers-heading">
      <div className="flex items-center justify-between mb-4">
        <h3 id="three-whethers-heading" className="type-section text-white font-semibold tracking-tight">This week&apos;s bounded decisions</h3>
        <span className="text-fluid-nano font-mono text-slate-400 uppercase tracking-wider">Canonical rules</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {decisions.map((item, index) => {
          const Icon = ICONS[index] ?? Lock;
          return (
            <article key={item.lever} className="weather-card relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="weather-bar bg-sky-400" aria-hidden="true" />
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sky-400"><Icon className="w-4 h-4" aria-hidden="true" /></span>
                  <h4 className="text-sm font-semibold text-white tracking-tight">{item.label}</h4>
                </div>
                <p className="text-fluid-xs text-slate-200 leading-relaxed">{item.areaActionNow}</p>
              </div>
              <dl className="pt-2.5 border-t border-slate-800/60 space-y-1.5 text-fluid-nano text-slate-300">
                <div className="flex items-start gap-2"><dt className="font-semibold text-slate-400 shrink-0">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</dt><dd><code className="font-mono text-amber-300/90 break-words">{item.triggerThreshold}</code></dd></div>
                <div className="flex items-start gap-2"><dt className="font-semibold text-slate-400 shrink-0">{DECISION_CONTRACT_LABELS.reversal.clearsWhen}:</dt><dd><code className="font-mono text-rose-300/90 break-words">{item.reversalCondition}</code></dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
