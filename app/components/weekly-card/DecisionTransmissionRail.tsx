import type { ReactNode } from "react";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";

type DecisionTransmissionRailProps = {
  actionNow: string;
  guardrail: string;
  flipWhen: string;
  citationMetaLine: string;
  citation: string;
  actions?: ReactNode;
};

export function DecisionTransmissionRail({
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
      className={`${tierOnePanel} ${sectionSpacing} overflow-hidden bg-[linear-gradient(180deg,rgba(7,13,24,0.96),rgba(4,10,20,0.92))]`}
      aria-label="Decision transmission rail"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Share-ready</p>
          <h2 className={tierOneHeading}>Transmit this call</h2>
        </div>
        <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Brief first
        </span>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
          Default share path
        </p>
        <p className="mt-2 max-w-[46rem] text-sm font-semibold leading-6 text-slate-100">
          Share the operator brief first. Keep Planning as the approval surface and use citation only when someone asks for proof.
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          Current call: {actionNow}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-3">
            <p><span className="font-semibold text-amber-100">Pause if:</span> {guardrail}</p>
          </div>
          <div className="rounded-lg border border-sky-400/20 bg-sky-500/8 px-3 py-3">
            <p><span className="font-semibold text-sky-100">Change course if:</span> {flipWhen}</p>
          </div>
        </div>
        {actions ? (
          <details className="group weather-auto-chevron mt-4 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
            <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              Share actions
            </summary>
            <div className="weather-disclosure-panel animate-collapsible-in mt-3 flex flex-wrap gap-2">
              {actions}
            </div>
          </details>
        ) : null}
        <details className="group weather-auto-chevron mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2.5">
          <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Cite this call
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
