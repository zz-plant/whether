"use client";

import { useEffect, useState, type ReactNode } from "react";

type OperationsExecutionStep = {
  id: string;
  label: string;
  title: string;
  description: string;
  summary?: string;
  owner?: string;
  approvalStatus?: string;
  changeSignal?: string;
  hashAliases?: string[];
  /** Expanded on arrival, without a click. Reserved for the steps a reader has
   *  to act on this week — see resolveInitialOpenStepIds. */
  defaultOpen?: boolean;
  children: ReactNode;
};

export const buildOperationsExecutionStepHref = (stepId: string) => `#${stepId}`;

export const resolveOperationsExecutionStepActionLabel = (isActive: boolean) =>
  isActive ? "Current step" : "Open step";


export const resolveOperationsExecutionStepId = ({
  hashId,
  firstStepId,
  steps,
}: {
  hashId: string;
  firstStepId: string;
  steps: OperationsExecutionStep[];
}) => {
  const matchingStep = steps.find((step) => step.id === hashId || step.hashAliases?.includes(hashId));
  return matchingStep?.id ?? firstStepId;
};

/**
 * Which steps are expanded on arrival.
 *
 * The panel used to render exactly one body — whichever step was active — so
 * every other section on this page was a header until clicked. That is right
 * for a checklist you work top to bottom, and wrong for the rules you have to
 * read before committing: those were two interactions deep on the page that
 * owns them. Steps opt in with defaultOpen, and a deep link opens its target
 * without closing anything.
 */
export const resolveInitialOpenStepIds = ({
  steps,
  hash = "",
}: {
  steps: OperationsExecutionStep[];
  hash?: string;
}): string[] => {
  const firstStepId = steps[0]?.id ?? "";
  const open = new Set<string>();
  if (firstStepId) open.add(firstStepId);
  for (const step of steps) {
    if (step.defaultOpen) open.add(step.id);
  }
  const hashId = hash.replace(/^#/, "");
  if (hashId) {
    const target = steps.find((step) => step.id === hashId || step.hashAliases?.includes(hashId));
    if (target) open.add(target.id);
  }
  return [...open];
};

export const resolveOperationsExecutionStepIdFromLocation = ({
  hash,
  firstStepId,
  steps,
}: {
  hash: string;
  firstStepId: string;
  steps: OperationsExecutionStep[];
}) => {
  const hashId = hash.replace(/^#/, "");
  return hashId ? resolveOperationsExecutionStepId({ hashId, firstStepId, steps }) : firstStepId;
};

export function OperationsExecutionStepper({
  steps,
}: {
  steps: OperationsExecutionStep[];
}) {
  const firstStepId = steps[0]?.id ?? "";
  // Openness is a set; `currentStepId` stays singular because aria-current is.
  const [openStepIds, setOpenStepIds] = useState<Set<string>>(
    () => new Set(resolveInitialOpenStepIds({ steps })),
  );
  const [currentStepId, setCurrentStepId] = useState(firstStepId);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!firstStepId) {
      return;
    }

    const syncFromLocation = () => {
      const targeted = resolveOperationsExecutionStepIdFromLocation({
        hash: window.location.hash,
        firstStepId,
        steps,
      });
      setCurrentStepId(targeted);
      // Additive: following a link to one step no longer collapses the others.
      setOpenStepIds((prev) => (prev.has(targeted) ? prev : new Set(prev).add(targeted)));
    };

    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [firstStepId, steps]);

  const toggleCompleted = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const toggleOpen = (stepId: string) => {
    setOpenStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const completedCount = steps.filter((step) => completedSteps.has(step.id)).length;

  return (
    <section id="planning-stepper" className="space-y-4" aria-label="Planning checklist">
      <div className="weather-panel relative overflow-hidden space-y-3 px-4 py-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" aria-hidden="true" />
        <div className="max-w-3xl">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-[-0.01em] text-slate-100 sm:text-base">This week&apos;s checklist</h2>
            </div>
            <span className="text-fluid-xs font-medium text-slate-400 tabular-nums">
              {completedCount}/{steps.length}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Mark each step once it is complete.
          </p>
        </div>

        <ol className="space-y-1">
          {steps.map((step) => {
            const isActive = step.id === currentStepId;
            const isCompleted = completedSteps.has(step.id);
            const stepHref = buildOperationsExecutionStepHref(step.id);

            return (
              <li key={step.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-900/40 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleCompleted(step.id)}
                  aria-label={isCompleted ? `Mark "${step.title}" as incomplete` : `Mark "${step.title}" as complete`}
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    isCompleted
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                      : "border-slate-600 hover:border-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                      <path d="M2.5 6l2.5 2.5 4.5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
                <a
                  href={stepHref}
                  aria-current={isActive ? "step" : undefined}
                  aria-labelledby={`${step.id}-nav-title`}
                  className={`flex-1 min-w-0 no-underline ${isCompleted ? "opacity-60" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span id={`${step.id}-nav-title`} className={`text-sm font-semibold ${isActive ? "text-sky-100" : "text-slate-200"} ${isCompleted ? "line-through decoration-slate-600" : ""}`}>
                      {step.title}
                    </span>
                    <span className="type-eyebrow flex-shrink-0">
                      {step.label}
                    </span>
                  </div>
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-6">
        {steps.map((step) => {
          const isOpen = openStepIds.has(step.id);
          const isActive = step.id === currentStepId;
          const activeClass = isOpen
            ? "ring-1 ring-sky-500/30 border-sky-500/20 bg-slate-900/10"
            : "border-white/[0.04] bg-slate-950/[0.05]";

          return (
            <section
              key={step.id}
              id={step.id}
              className={`weather-step-panel scroll-mt-28 space-y-4 rounded-xl border p-4 sm:p-5 transition-all ${activeClass}`}
            >
              {/* The rule divides the header from the step body, so a closed step
                  drew a divider with nothing under it. */}
              <div
                className={`relative overflow-hidden flex flex-wrap items-start justify-between gap-3 ${
                  isOpen ? "pb-4 border-b border-white/[0.04]" : ""
                }`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="type-eyebrow">{step.label}</p>
                  {/* A toggle, not a link: with steps opening independently the
                      title's job is expand/collapse, which §IV says is a button.
                      Deep links still arrive through the checklist above and
                      through the section id, and they open a step without
                      closing the others. */}
                  <h3 className="max-w-2xl text-lg font-semibold tracking-[-0.02em]">
                    <button
                      type="button"
                      onClick={() => toggleOpen(step.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${step.id}-body`}
                      className="inline-flex min-h-11 items-center gap-2 text-left text-slate-100 hover:text-sky-100"
                    >
                      <span
                        aria-hidden="true"
                        className={`text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      >
                        ›
                      </span>
                      {step.title}
                    </button>
                  </h3>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300">{step.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.owner ? (
                      <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold text-slate-100">
                        Owner: {step.owner}
                      </span>
                    ) : null}
                    {step.approvalStatus ? (
                      <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold text-slate-100">
                        {step.approvalStatus}
                      </span>
                    ) : null}
                    {step.changeSignal ? (
                      <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold text-slate-100">
                        Check again if: {step.changeSignal}
                      </span>
                    ) : null}
                    {/* A "Back to steps" pill used to sit here, in all six steps,
                        anchoring to the checklist a couple of hundred pixels
                        above and still on screen. Six identical controls
                        pointing at visible content is navigation noise. */}
                  </div>
                </div>
                {isActive && (
                  <span className="rounded-sm border border-sky-300/80 bg-sky-500/15 px-3 py-1 type-eyebrow text-sky-100">
                    Active
                  </span>
                )}
              </div>
              {isOpen && (
                <div id={`${step.id}-body`} className="mt-4">
                  {step.children}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
