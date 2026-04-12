import { sectionSpacing, tierTwoHeading, tierTwoPanel } from "./shared";
import type { ActionStripSectionProps } from "./types";

const leverScaleLabels = ["Closed", "Guarded", "Staged", "Open"] as const;

const compareActionStripPriority = (
  left: ActionStripSectionProps["items"][number],
  right: ActionStripSectionProps["items"][number],
) => {
  const leftStep = left.currentStateStep ?? 3;
  const rightStep = right.currentStateStep ?? 3;

  if (leftStep !== rightStep) {
    return leftStep - rightStep;
  }

  const leftDistance = left.priorityDistancePoints ?? Number.POSITIVE_INFINITY;
  const rightDistance = right.priorityDistancePoints ?? Number.POSITIVE_INFINITY;

  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  const leftOrder = left.priorityOrderIndex ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.priorityOrderIndex ?? Number.POSITIVE_INFINITY;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.label.localeCompare(right.label);
};

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
  const prioritizedItems = [...items].sort(compareActionStripPriority);

  return (
    <section className={`${tierTwoPanel} ${sectionSpacing} border-slate-800/80 bg-[linear-gradient(180deg,rgba(6,11,20,0.92),rgba(3,8,16,0.98))]`} aria-label="Action strip">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className={tierTwoHeading}>Per-lever guardrails</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Open this only when you need the domain-specific thresholds.
          </p>
        </div>
      </div>
      <ul className="mt-4 overflow-hidden rounded-[1rem] border border-slate-800/75 bg-slate-950/35 divide-y divide-slate-800/75">
        {prioritizedItems.map((item, index) => {
          const currentStep = item.currentStateStep ?? 1;
          const currentLabel = item.currentStateLabel ?? leverScaleLabels[currentStep];
          const urgencyBadge = index === 0 ? "Watch first" : index === 1 ? "Next up" : `#${index + 1}`;
          const urgencyToneClass = index === 0
            ? "border-amber-400/35 bg-[linear-gradient(90deg,rgba(245,158,11,0.12),rgba(2,6,23,0.02))]"
            : index === 1
              ? "border-sky-400/25 bg-[linear-gradient(90deg,rgba(56,189,248,0.08),rgba(2,6,23,0.02))]"
              : "border-transparent bg-transparent";
          const urgencyBadgeClass = index === 0
            ? "border-amber-300/40 bg-amber-500/10 text-amber-100"
            : index === 1
              ? "border-sky-300/35 bg-sky-500/10 text-sky-100"
              : "border-slate-700/70 bg-slate-950/80 text-slate-300";

          return (
            <li key={item.lever} className={`px-4 py-4 ${urgencyToneClass}`}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">{currentLabel}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${urgencyBadgeClass}`}>
                        {urgencyBadge}
                      </span>
                      <span className="rounded-full border border-slate-700/70 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">
                        Current
                      </span>
                    </div>
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
                    <dt className="font-semibold uppercase tracking-[0.08em] text-emerald-200">Do now</dt>
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
