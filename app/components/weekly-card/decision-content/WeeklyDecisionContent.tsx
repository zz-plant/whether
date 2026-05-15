import { type ReactNode, useId } from "react";

type WeeklyDecisionContentProps = {
  modePanel: ReactNode;
  actionStripSection: ReactNode;
  /** The top-priority bounded rule to surface above the fold (action + threshold + reversal). */
  topPinnedRule?: {
    label: string;
    actionNow: string;
    triggerThreshold: string;
    reversalCondition: string;
  };
};

export function WeeklyDecisionContent({
  modePanel,
  actionStripSection,
  topPinnedRule,
}: WeeklyDecisionContentProps) {
  const pinnedRuleId = useId();

  return (
    <div className="space-y-4">
      <section className="space-y-5" aria-label="Weekly decision order">
        {modePanel}
      </section>

      {topPinnedRule ? (
        <section
          aria-labelledby={pinnedRuleId}
          className="rounded-[1rem] border border-sky-400/20 bg-[linear-gradient(180deg,rgba(10,18,32,0.55),rgba(2,6,23,0.45))] px-4 py-3 sm:px-5 sm:py-4"
        >
          <p id={pinnedRuleId} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">
            {topPinnedRule.label}
          </p>
          <dl className="mt-3 grid gap-3 text-[11px] leading-5 sm:grid-cols-3">
            <div className="border-l-2 border-emerald-400/40 pl-3">
              <dt className="font-semibold text-emerald-200">Action</dt>
              <dd className="mt-1 text-slate-100">{topPinnedRule.actionNow}</dd>
            </div>
            <div className="border-l-2 border-amber-400/40 pl-3">
              <dt className="font-semibold text-amber-200">Threshold</dt>
              <dd className="mt-1 text-slate-100">{topPinnedRule.triggerThreshold}</dd>
            </div>
            <div className="border-l-2 border-sky-400/40 pl-3">
              <dt className="font-semibold text-sky-200">Reversal</dt>
              <dd className="mt-1 text-slate-100">{topPinnedRule.reversalCondition}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {actionStripSection ? (
        <details className="group rounded-[1rem] border border-slate-800/80 bg-slate-950/35 px-4 py-3 sm:px-5 sm:py-4">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
            <span className="min-w-0">
              <span className="block text-slate-100">Decision details</span>
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">
                Rules by area and what would change the call
              </span>
            </span>
            <span aria-hidden="true" className="rounded-[0.65rem] border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-400 transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-4">
            {actionStripSection}
          </div>
        </details>
      ) : null}
    </div>
  );
}
