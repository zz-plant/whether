import type { ReactNode } from "react";
import { shouldSplitDecisionConditionRows } from "../../../lib/report/reportFormatting";
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
  const showMicroRows = shouldSplitDecisionConditionRows({
    trigger: guardrail,
    reversal: flipWhen,
  });

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
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Artifact preview
          </p>
          <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">
            Ready to share
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/75 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Whether weekly call
          </p>
          <div className="mt-2 space-y-2 text-sm">
            <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/8 px-2.5 py-2 text-slate-100">
              <span className="mr-1 font-semibold uppercase tracking-[0.08em] text-emerald-200">
                Action
              </span>
              {actionNow}
            </p>
            {showMicroRows ? (
              <div className="space-y-2 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2.5 py-2 text-slate-100">
                <div className="rounded-md border border-amber-400/20 bg-amber-500/8 px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">
                    Trigger
                  </p>
                  <p className="mt-1 text-sm text-slate-100">{guardrail}</p>
                </div>
                <div className="rounded-md border border-sky-400/20 bg-sky-500/8 px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">
                    Reversal
                  </p>
                  <p className="mt-1 text-sm text-slate-100">{flipWhen}</p>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-2.5 py-2 text-slate-100">
                <span className="mr-1 font-semibold uppercase tracking-[0.08em] text-amber-200">
                  Trigger
                </span>
                {guardrail}
                <span className="ml-2 mr-1 font-semibold uppercase tracking-[0.08em] text-sky-200">
                  Reversal
                </span>
                {flipWhen}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Share &amp; cite
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-300">{citationMetaLine}</p>
        <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2 font-mono whitespace-pre-wrap text-xs text-slate-300">
          {citation}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
      </div>
    </article>
  );
}
