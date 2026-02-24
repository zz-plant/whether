"use client";

import { useEffect, useMemo, useState } from "react";

type OnboardingStep = {
  title: string;
  detail: string;
  href: string;
  cta: string;
  emphasis: string;
};

const STORAGE_KEY = "whether.onboardingChecklist.v1";

export const OnboardingChecklistProgress = ({ steps }: { steps: OnboardingStep[] }) => {
  const [completedTitles, setCompletedTitles] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCompletedTitles(parsed.filter((item): item is string => typeof item === "string"));
        }
      } catch {
        setCompletedTitles([]);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completedTitles));
  }, [completedTitles, isHydrated]);

  const completedSet = useMemo(() => new Set(completedTitles), [completedTitles]);
  const completedCurrentStepCount = steps.filter((step) => completedSet.has(step.title)).length;
  const completionText = `${completedCurrentStepCount}/${steps.length} complete`;
  const completionPercent = steps.length === 0 ? 0 : Math.round((completedCurrentStepCount / steps.length) * 100);
  const nextIncompleteStep = steps.find((step) => !completedSet.has(step.title));
  const nextIncompleteIndex = nextIncompleteStep
    ? steps.findIndex((step) => step.title === nextIncompleteStep.title)
    : -1;
  const remainingSteps = Math.max(steps.length - completedCurrentStepCount, 0);
  const allComplete = steps.length > 0 && remainingSteps === 0;

  const toggleStep = (title: string) => {
    setCompletedTitles((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    );
  };

  const resetChecklist = () => {
    setCompletedTitles([]);
  };

  const markAllComplete = () => {
    setCompletedTitles(steps.map((step) => step.title));
  };

  return (
    <>
      <div className="space-y-2 rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-3 text-xs text-slate-300">
        <div className="flex items-center justify-between gap-2 font-semibold tracking-[0.16em]">
          <span>Progress</span>
          <span role="status" aria-live="polite" aria-atomic="true">
            {completionText}
          </span>
        </div>
        <progress
          value={completedCurrentStepCount}
          max={Math.max(steps.length, 1)}
          className="cadence-progress h-2 w-full"
          aria-label="Onboarding checklist completion"
        />
        <p className="text-xs text-slate-400" aria-hidden="true">
          {completionPercent}% complete · {remainingSteps} step{remainingSteps === 1 ? "" : "s"} left
        </p>
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-400" role="status" aria-live="polite" aria-atomic="true">
          {nextIncompleteStep
            ? `Next action: Step ${nextIncompleteIndex + 1} — ${nextIncompleteStep.cta}`
            : "Next action: All steps complete. Open signal evidence to validate your current call."}
        </p>
        <div className="flex flex-wrap gap-2">
          {nextIncompleteStep ? (
            <a
              href={`#onboarding-step-${nextIncompleteIndex + 1}`}
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
            >
              Jump to next step
            </a>
          ) : null}
          {!allComplete && steps.length > 0 ? (
            <button
              type="button"
              onClick={markAllComplete}
              className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-emerald-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 touch-manipulation"
            >
              Mark all complete
            </button>
          ) : null}
          {completedTitles.length > 0 ? (
            <button
              type="button"
              onClick={resetChecklist}
              className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
            >
              Reset progress
            </button>
          ) : null}
        </div>
      </div>
      {allComplete ? (
        <p className="weather-surface px-3 py-2 text-xs font-semibold tracking-[0.14em] text-emerald-200" role="status" aria-live="polite">
          Nice work — onboarding checklist complete. Continue to live signal evidence to validate your weekly call.
        </p>
      ) : null}
      <ol className="grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => {
          const isCompleted = completedSet.has(step.title);
          const checkboxId = `onboarding-step-checkbox-${index + 1}`;
          const detailId = `${checkboxId}-detail`;
          const stepState = isCompleted ? "Completed" : "Incomplete";
          const isNextStep = nextIncompleteStep?.title === step.title;

          return (
            <li key={step.title} className="list-none">
              <article
                id={`onboarding-step-${index + 1}`}
                data-completed={isCompleted ? "true" : "false"}
                className="weather-surface onboarding-step-card flex h-full scroll-mt-28 flex-col gap-3 p-4"
              >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Step {index + 1} of {steps.length}
                  </p>
                  <span
                    key={stepState}
                    className={`weather-chip onboarding-step-state inline-flex min-h-[32px] items-center px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${isCompleted ? "text-emerald-200" : "text-amber-200"}`}
                  >
                    {stepState}
                  </span>
                </div>
                <label htmlFor={checkboxId} className="inline-flex min-h-[44px] items-center gap-2 text-xs text-emerald-300">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => toggleStep(step.title)}
                    aria-describedby={detailId}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-900 text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  />
                  Mark complete after reviewing this step.
                </label>
                <p className="text-sm font-semibold text-slate-100" aria-current={isNextStep ? "step" : undefined}>{step.title}</p>
                <p id={detailId} className="text-sm text-slate-300">{step.detail}</p>
                {isNextStep ? (
                  <p className="text-xs font-semibold tracking-[0.14em] text-sky-200">Recommended next step</p>
                ) : null}
              </div>
              {step.emphasis === "primary" ? (
                <a
                  href={step.href}
                  aria-label={`${step.cta}: ${step.title}`}
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {step.cta}
                </a>
              ) : (
                <a
                  href={step.href}
                  aria-label={`${step.cta}: ${step.title}`}
                  className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-300/80 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {step.cta}
                </a>
              )}
            </article>
            </li>
          );
        })}
      </ol>
    </>
  );
};
