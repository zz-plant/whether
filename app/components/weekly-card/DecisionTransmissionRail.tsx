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
      className={`${tierOnePanel} ${sectionSpacing}`}
      aria-label="Decision transmission rail"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className={tierOneHeading}>Transmit this call</h2>
        <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Share-ready
        </span>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Default share path
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-100">
          Share the operator brief first. Keep Planning as the approval surface and use citation only when someone asks for proof.
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          Current call: {actionNow}
        </p>
        <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-3">
          <div className="grid gap-2 text-xs text-slate-200">
            <p><span className="font-semibold text-amber-100">Pause if:</span> {guardrail}</p>
            <p><span className="font-semibold text-sky-100">Change course if:</span> {flipWhen}</p>
          </div>
        </div>
        {actions ? (
          <details className="group weather-auto-chevron mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2">
            <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              Share actions
            </summary>
            <div className="weather-disclosure-panel animate-collapsible-in mt-2 flex flex-wrap gap-2">
              {actions}
            </div>
          </details>
        ) : null}
        <details className="group weather-auto-chevron mt-3 rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2">
          <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Cite this call
          </summary>
          <div className="weather-disclosure-panel animate-collapsible-in mt-2">
            <p className="text-xs leading-5 text-slate-300">{citationMetaLine}</p>
            <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2 font-mono whitespace-pre-wrap text-xs text-slate-300">
              {citation}
            </pre>
          </div>
        </details>
      </div>
    </article>
  );
}
