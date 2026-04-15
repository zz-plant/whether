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

export function ActionStripSection({ items }: ActionStripSectionProps) {
  const prioritizedItems = [...items].sort(compareActionStripPriority);
  const visibleItems = prioritizedItems.slice(0, 2);
  const deferredItems = prioritizedItems.slice(2);

  return (
    <section className={`${tierTwoPanel} ${sectionSpacing} border-slate-800/80 bg-[linear-gradient(180deg,rgba(6,11,20,0.92),rgba(3,8,16,0.98))]`} aria-label="Action strip">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className={tierTwoHeading}>Rules by area</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Start with the two most decision-relevant areas. Open the rest only when you need more detailed operating rules.
          </p>
        </div>
      </div>
      <ul className="mt-4 overflow-hidden rounded-[1rem] border border-slate-800/75 bg-slate-950/35 divide-y divide-slate-800/75">
        {visibleItems.map((item) => {
          const currentStep = item.currentStateStep ?? 1;
          const currentLabel = item.currentStateLabel ?? leverScaleLabels[currentStep];

          return (
            <li key={item.lever} className="px-4 py-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-400">Area</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">{item.label}</p>
                    </div>
                    <span className="rounded-[0.7rem] border border-slate-700/70 bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold text-slate-200">
                      {currentLabel}
                    </span>
                  </div>
                  {(item.tightenDistanceLabel || item.reopenDistanceLabel) ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-300">
                      {item.tightenDistanceLabel ? (
                        <span className="rounded-[0.65rem] border border-amber-400/25 bg-amber-500/8 px-2 py-1">
                          {item.tightenDistanceLabel}
                        </span>
                      ) : null}
                      {item.reopenDistanceLabel ? (
                        <span className="rounded-[0.65rem] border border-sky-400/25 bg-sky-500/8 px-2 py-1">
                          {item.reopenDistanceLabel}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <dl className="grid gap-3 sm:grid-cols-3 text-[11px] leading-5">
                  <div className="border-l-2 border-emerald-400/40 pl-3">
                    <dt className="font-semibold text-emerald-200">Do now</dt>
                    <dd className="mt-1 text-slate-100">{item.actionNow}</dd>
                  </div>
                  <div className="border-l-2 border-amber-400/40 pl-3">
                    <dt className="font-semibold text-amber-200">Tighten if</dt>
                    <dd className="mt-1 text-slate-100">{item.triggerThreshold}</dd>
                  </div>
                  <div className="border-l-2 border-sky-400/40 pl-3">
                    <dt className="font-semibold text-sky-200">Re-open when</dt>
                    <dd className="mt-1 text-slate-100">{item.reversalCondition}</dd>
                  </div>
                </dl>
              </div>
            </li>
          );
        })}
      </ul>
      {deferredItems.length > 0 ? (
        <details className="mt-3 rounded-xl border border-slate-800/75 bg-slate-950/35 px-4 py-3">
          <summary className="min-h-[44px] cursor-pointer list-none text-[11px] font-semibold text-slate-300">
            Show {deferredItems.length} more operating area{deferredItems.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-3 divide-y divide-slate-800/70 overflow-hidden rounded-[1rem] border border-slate-800/70 bg-slate-950/40">
            {deferredItems.map((item) => {
              const currentStep = item.currentStateStep ?? 1;
              const currentLabel = item.currentStateLabel ?? leverScaleLabels[currentStep];

              return (
                <li key={item.lever} className="px-4 py-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400">Area</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">{item.label}</p>
                      </div>
                      <span className="rounded-[0.7rem] border border-slate-700/70 bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold text-slate-200">
                        {currentLabel}
                      </span>
                    </div>
                    <dl className="grid gap-3 sm:grid-cols-3 text-[11px] leading-5">
                      <div className="border-l-2 border-emerald-400/40 pl-3">
                        <dt className="font-semibold text-emerald-200">Do now</dt>
                        <dd className="mt-1 text-slate-100">{item.actionNow}</dd>
                      </div>
                      <div className="border-l-2 border-amber-400/40 pl-3">
                        <dt className="font-semibold text-amber-200">Tighten if</dt>
                        <dd className="mt-1 text-slate-100">{item.triggerThreshold}</dd>
                      </div>
                      <div className="border-l-2 border-sky-400/40 pl-3">
                        <dt className="font-semibold text-sky-200">Re-open when</dt>
                        <dd className="mt-1 text-slate-100">{item.reversalCondition}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
