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

  const completionText = `${completedTitles.length}/${steps.length} complete`;

  const completedSet = useMemo(() => new Set(completedTitles), [completedTitles]);
  const nextIncompleteStep = steps.find((step) => !completedSet.has(step.title));

  const toggleStep = (title: string) => {
    setCompletedTitles((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    );
  };

  return (
    <>
      <div className="space-y-2 rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-3 text-xs text-slate-300">
        <div className="flex items-center justify-between font-semibold tracking-[0.16em]">
          <span>Progress</span>
          <span>{completionText}</span>
        </div>
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">
          {nextIncompleteStep
            ? `Next action: Step ${steps.findIndex((step) => step.title === nextIncompleteStep.title) + 1} — ${nextIncompleteStep.cta}`
            : "Next action: All steps complete. Open signal evidence to validate your current call."}
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => {
          const isCompleted = completedSet.has(step.title);
          return (
            <article key={step.title} className="weather-surface flex h-full flex-col gap-3 p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Step {index + 1} of {steps.length}
                </p>
                <label className="inline-flex min-h-[44px] items-center gap-2 text-xs text-emerald-300">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => toggleStep(step.title)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  />
                  Mark complete after reviewing this step.
                </label>
                <p className="text-sm font-semibold text-slate-100">{step.title}</p>
                <p className="text-sm text-slate-300">{step.detail}</p>
              </div>
              {step.emphasis === "primary" ? (
                <a
                  href={step.href}
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {step.cta}
                </a>
              ) : (
                <a
                  href={step.href}
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-slate-300 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {step.cta} →
                </a>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
};
