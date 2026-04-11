import type { ReactNode } from "react";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";

type DecisionTransmissionRailProps = {
  currentCall: string;
  actionNow: string;
  guardrail: string;
  flipWhen: string;
  citationMetaLine: string;
  citation: string;
  actions?: ReactNode;
};

export function DecisionTransmissionRail({
  currentCall,
  actionNow,
  guardrail,
  flipWhen,
  citationMetaLine,
  citation,
  actions,
}: DecisionTransmissionRailProps) {
  return (
    <article
      id="share-ready-artifact"
      className={`${tierOnePanel} ${sectionSpacing} overflow-hidden border-slate-800/80 bg-[linear-gradient(180deg,rgba(6,11,20,0.94),rgba(3,8,16,0.99))]`}
      aria-label="Decision transmission rail"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Share</p>
          <h2 className={tierOneHeading}>Send this brief</h2>
        </div>
        <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Best for most teams
        </span>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">Best place to start</p>
        <p className="mt-2 max-w-[46rem] text-sm font-semibold leading-6 text-slate-100">
          Start with the weekly brief. Open Planning when you need approvals, and open Citation when you need the source line.
        </p>
        <div className="space-y-1 text-xs leading-5 text-slate-300">
          <p><span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {currentCall}</p>
          <p><span className="font-semibold text-slate-100">{publicDecisionLabels.action}:</span> {actionNow}</p>
        </div>
        <dl className="overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/35 divide-y divide-slate-800/80">
          <div className="px-3 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">{publicDecisionLabels.threshold}</dt>
            <dd className="mt-1 text-xs leading-5 text-slate-100">{guardrail}</dd>
          </div>
          <div className="px-3 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">{publicDecisionLabels.reversal}</dt>
            <dd className="mt-1 text-xs leading-5 text-slate-100">{flipWhen}</dd>
          </div>
        </dl>
        {actions ? (
          <details className="group weather-auto-chevron mt-4 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
            <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              Copy or share
            </summary>
            <div className="weather-disclosure-panel animate-collapsible-in mt-3 flex flex-wrap gap-2">
              {actions}
            </div>
          </details>
        ) : null}
        <details className="group weather-auto-chevron mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
          <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Citation
          </summary>
          <div className="weather-disclosure-panel animate-collapsible-in mt-3">
            <p className="text-xs leading-5 text-slate-300">{citationMetaLine}</p>
            <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2 font-mono whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {citation}
            </pre>
          </div>
        </details>
      </div>
    </article>
  );
}
