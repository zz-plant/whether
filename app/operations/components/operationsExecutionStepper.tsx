"use client";

import { useEffect, useState, type ReactNode } from "react";

type OperationsExecutionStep = {
  id: string;
  label: string;
  title: string;
  description: string;
  summary: string;
  hashAliases?: string[];
  children: ReactNode;
};

const stepStateLabel = (index: number, activeIndex: number) => {
  if (index < activeIndex) return "Reviewed";
  if (index === activeIndex) return "Current";
  return "Up next";
};

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

export function OperationsExecutionStepper({
  steps,
}: {
  steps: OperationsExecutionStep[];
}) {
  const firstStepId = steps[0]?.id ?? "";
  const [activeStepId, setActiveStepId] = useState(firstStepId);

  useEffect(() => {
    if (!firstStepId) {
      return;
    }

    const syncFromHash = () => {
      const hashId = window.location.hash.replace(/^#/, "");
      if (!hashId) {
        setActiveStepId(firstStepId);
        return;
      }

      setActiveStepId(resolveOperationsExecutionStepId({ hashId, firstStepId, steps }));
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [firstStepId, steps]);

  const setActiveStep = (stepId: string) => {
    setActiveStepId(stepId);
    const nextHash = `#${stepId}`;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.history.replaceState(null, "", nextUrl);
  };

  const activeIndex = Math.max(steps.findIndex((step) => step.id === activeStepId), 0);

  return (
    <section className="space-y-4" aria-label="Operations execution stepper">
      <div className="weather-panel space-y-3 px-4 py-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Execution flow</p>
          <h2 className="text-sm font-semibold text-slate-100">Use Operations in one linear pass</h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => {
            const isActive = step.id === activeStepId;
            const cardTone = isActive
              ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
              : "border-slate-800/80 text-slate-200 hover:border-sky-400/70";

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  className={`weather-surface flex min-h-[112px] w-full flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${cardTone}`}
                >
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${
                      isActive
                        ? "border-sky-300/80 bg-sky-500/35 text-sky-50"
                        : "border-slate-600/80 text-slate-300"
                    }`}>
                      {index + 1}
                    </span>
                    {step.label}
                  </span>
                  <span className="text-sm font-semibold tracking-[0.08em]">{step.title}</span>
                  <span className="text-xs text-slate-300">{stepStateLabel(index, activeIndex)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = step.id === activeStepId;

          if (isActive) {
            return (
              <section key={step.id} id={step.id} className="space-y-4">
                <div className="weather-panel flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
                    <h3 className="text-lg font-semibold text-slate-100">{step.title}</h3>
                    <p className="text-sm text-slate-300">{step.description}</p>
                  </div>
                  <span className="rounded-full border border-sky-300/80 bg-sky-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                    Current step
                  </span>
                </div>
                {step.children}
              </section>
            );
          }

          return (
            <section key={step.id} id={step.id} className="weather-panel flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
                <h3 className="text-base font-semibold text-slate-100">{step.title}</h3>
                <p className="text-sm text-slate-300">{step.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(step.id)}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
              >
                Open step
              </button>
            </section>
          );
        })}
      </div>
    </section>
  );
}
