import { sectionSpacing, tierTwoHeading, tierTwoPanel } from "./shared";
import type { ActionStripSectionProps } from "./types";

const leverScaleLabels = ["Closed", "Guarded", "Staged", "Open"] as const;

const StepRail = ({ currentStep }: { currentStep: number }) => (
  <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
    {leverScaleLabels.map((stepLabel, index) => {
      const isActive = index === currentStep;
      const isOpenAhead = index > currentStep;

      return (
        <span key={stepLabel} className="space-y-1">
          <span
            className={`block h-2 rounded-full ${
              isActive
                ? "bg-sky-300"
                : isOpenAhead
                  ? "bg-slate-800/90"
                  : "bg-sky-500/35"
            }`}
          />
          <span className={`block text-center text-[9px] font-semibold uppercase tracking-[0.1em] ${isActive ? "text-sky-100" : "text-slate-500"}`}>
            {stepLabel}
          </span>
        </span>
      );
    })}
  </div>
);

export function ActionStripSection({ items }: ActionStripSectionProps) {
  return (
    <section className={`${tierTwoPanel} ${sectionSpacing} border-slate-800/80 bg-[linear-gradient(180deg,rgba(6,11,20,0.92),rgba(3,8,16,0.98))]`} aria-label="Action strip">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className={tierTwoHeading}>Operating levers this week</h3>
        </div>
      </div>
      <ul className="mt-4 overflow-hidden rounded-[1rem] border border-slate-800/75 bg-slate-950/35 divide-y divide-slate-800/75">
        {items.map((item) => {
          const currentStep = item.currentStateStep ?? 1;
          const currentLabel = item.currentStateLabel ?? leverScaleLabels[currentStep];

          return (
            <li key={item.lever} className="px-4 py-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">{currentLabel}</p>
                    </div>
                    <span className="rounded-full border border-slate-700/70 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">
                      Current
                    </span>
                  </div>
                  <div className="mt-3">
                    <StepRail currentStep={currentStep} />
                  </div>
                  {(item.tightenDistanceLabel || item.reopenDistanceLabel) ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                      {item.tightenDistanceLabel ? (
                        <span className="rounded-full border border-amber-400/25 bg-amber-500/8 px-2 py-1">
                          {item.tightenDistanceLabel}
                        </span>
                      ) : null}
                      {item.reopenDistanceLabel ? (
                        <span className="rounded-full border border-sky-400/25 bg-sky-500/8 px-2 py-1">
                          {item.reopenDistanceLabel}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <dl className="grid gap-3 sm:grid-cols-3 text-[11px] leading-5">
                  <div className="border-l-2 border-emerald-400/40 pl-3">
                    <dt className="font-semibold uppercase tracking-[0.08em] text-emerald-200">Open now</dt>
                    <dd className="mt-1 text-slate-100">{item.actionNow}</dd>
                  </div>
                  <div className="border-l-2 border-amber-400/40 pl-3">
                    <dt className="font-semibold uppercase tracking-[0.08em] text-amber-200">Tighten if</dt>
                    <dd className="mt-1 text-slate-100">{item.triggerThreshold}</dd>
                  </div>
                  <div className="border-l-2 border-sky-400/40 pl-3">
                    <dt className="font-semibold uppercase tracking-[0.08em] text-sky-200">Re-open when</dt>
                    <dd className="mt-1 text-slate-100">{item.reversalCondition}</dd>
                  </div>
                </dl>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
