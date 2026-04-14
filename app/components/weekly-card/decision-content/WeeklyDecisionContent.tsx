import type { ReactNode } from "react";

type WeeklyDecisionContentProps = {
  modePanel: ReactNode;
  actionStripSection: ReactNode;
};

export function WeeklyDecisionContent({
  modePanel,
  actionStripSection,
}: WeeklyDecisionContentProps) {
  return (
    <div className="space-y-4">
      <section className="space-y-5" aria-label="Weekly decision transmission order">
        {modePanel}
      </section>

      {actionStripSection ? (
        <details className="group rounded-[1.35rem] border border-slate-800/80 bg-slate-950/35 px-4 py-3 sm:px-5 sm:py-4">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
            <span className="min-w-0">
              <span className="block text-slate-100">Decision details</span>
              <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-slate-400">
                Area rules and flip conditions
              </span>
            </span>
            <span aria-hidden="true" className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400 transition group-open:rotate-180">
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
