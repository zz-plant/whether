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
  children: ReactNode;
};

export const buildOperationsExecutionStepHref = (stepId: string) => `#${stepId}`;

export const resolveOperationsExecutionStepActionLabel = (isActive: boolean) =>
  isActive ? "Current step" : "Open step";

export const resolveOperationsExecutionStepReturnLabel = () => "Back to steps";

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
  const [activeStepId, setActiveStepId] = useState(firstStepId);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!firstStepId) {
      return;
    }

    const syncFromLocation = () => {
      setActiveStepId(resolveOperationsExecutionStepIdFromLocation({
        hash: window.location.hash,
        firstStepId,
        steps,
      }));
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

  const completedCount = steps.filter((step) => completedSteps.has(step.id)).length;

  return (
    <section id="planning-stepper" className="space-y-4" aria-label="Planning checklist">
      <div className="weather-panel relative overflow-hidden space-y-3 px-4 py-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" aria-hidden="true" />
        <div className="max-w-3xl">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Planning</p>
              <h2 className="mt-1 text-sm font-semibold tracking-[-0.01em] text-slate-100 sm:text-base">This week&apos;s checklist</h2>
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
            const isActive = step.id === activeStepId;
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
                  className={`flex-1 min-w-0 no-underline ${isCompleted ? "opacity-60" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm font-semibold ${isActive ? "text-sky-100" : "text-slate-200"} ${isCompleted ? "line-through decoration-slate-600" : ""}`}>
                      {step.title}
                    </span>
                    <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 flex-shrink-0">
                      {step.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-fluid-xs text-slate-400">{step.description}</p>
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-4">
        {steps.map((step) => {
          const isActive = step.id === activeStepId;

          if (isActive) {
            return (
              <section key={step.id} id={step.id} className="weather-step-panel scroll-mt-28 space-y-4">
                <div className="weather-panel relative overflow-hidden flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
                    <h3 className="max-w-2xl text-lg font-semibold tracking-[-0.02em] text-slate-100">{step.title}</h3>
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
                      <a
                        href="#planning-stepper"
                        className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold text-slate-100 transition-colors hover:border-sky-400/70 hover:text-sky-100"
                      >
                        {resolveOperationsExecutionStepReturnLabel()}
                      </a>
                    </div>
                  </div>
                  <span className="rounded-full border border-sky-300/80 bg-sky-500/15 px-3 py-1 text-fluid-xs font-semibold uppercase tracking-[0.14em] text-sky-100">
                    Current
                  </span>
                </div>
                {step.children}
              </section>
            );
          }

          return (
            <section
              key={step.id}
              id={step.id}
              className="weather-panel weather-step-summary scroll-mt-28 flex flex-wrap items-start justify-between gap-3 px-5 py-4"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
                <h3 className="text-base font-semibold tracking-[-0.01em] text-slate-100">{step.title}</h3>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">{step.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold text-slate-100">
                    Owner: {step.owner}
                  </span>
                  <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold text-slate-100">
                    {step.approvalStatus}
                  </span>
                  <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold text-slate-100">
                    Check again if: {step.changeSignal}
                  </span>
                </div>
              </div>
              <a
                href={buildOperationsExecutionStepHref(step.id)}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
              >
                Open step
              </a>
            </section>
          );
        })}
      </div>
    </section>
  );
}
