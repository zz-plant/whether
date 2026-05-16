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

const stepStateLabel = (index: number, activeIndex: number) => {
  if (index < activeIndex) return "Reviewed";
  if (index === activeIndex) return "Current";
  return "Up next";
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

  const activeIndex = Math.max(steps.findIndex((step) => step.id === activeStepId), 0);

  return (
    <section id="planning-stepper" className="space-y-4" aria-label="Planning steps">
      <div className="weather-panel relative overflow-hidden space-y-3 px-4 py-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" aria-hidden="true" />
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Planning</p>
          <h2 className="mt-1 text-sm font-semibold tracking-[-0.01em] text-slate-100 sm:text-base">This week&apos;s sequence</h2>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Choose a step to open its detail panel. Back and forward keep your place in the sequence.
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {steps.map((step, index) => {
            const isActive = step.id === activeStepId;
            const cardTone = isActive
              ? "border-sky-300/70 bg-[linear-gradient(180deg,rgba(14,165,233,0.16),rgba(8,16,30,0.98))] text-sky-100 shadow-[0_16px_32px_-28px_rgba(14,165,233,0.45)]"
              : "border-slate-800/80 bg-slate-950/55 text-slate-200 hover:border-sky-400/70 hover:bg-slate-900/70";
            const stepHref = buildOperationsExecutionStepHref(step.id);

            return (
              <li key={step.id}>
                <a
                  href={stepHref}
                  aria-current={isActive ? "step" : undefined}
                  aria-controls={step.id}
                  data-active={isActive ? "true" : "false"}
                  data-reviewed={index < activeIndex ? "true" : "false"}
                  className={`weather-surface weather-step-card flex min-h-[112px] w-full flex-col gap-2 rounded border p-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 hover:-translate-y-0.5 ${cardTone}`}
                >
                  <span className="inline-flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${
                          isActive
                            ? "border-sky-300/80 bg-sky-500/35 text-sky-50 shadow-[0_0_0_1px_rgba(125,211,252,0.12)]"
                            : "border-slate-600/80 bg-slate-950/75 text-slate-300"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {step.label}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {resolveOperationsExecutionStepActionLabel(isActive)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tracking-[0.01em] text-slate-100">{step.title}</span>
                  <span className="text-xs text-slate-300">{stepStateLabel(index, activeIndex)}</span>
                  {step.owner ? <span className="text-[11px] text-slate-300">Owner: {step.owner}</span> : null}
                  {step.approvalStatus ? <span className="text-[11px] text-slate-300">{step.approvalStatus}</span> : null}
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-4">
        {steps.map((step) => {
          const isActive = step.id === activeStepId;
          const stepHref = buildOperationsExecutionStepHref(step.id);

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
                        <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[11px] font-semibold text-slate-100">
                          Owner: {step.owner}
                        </span>
                      ) : null}
                      {step.approvalStatus ? (
                        <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[11px] font-semibold text-slate-100">
                          {step.approvalStatus}
                        </span>
                      ) : null}
                      {step.changeSignal ? (
                        <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[11px] font-semibold text-slate-100">
                          Check again if: {step.changeSignal}
                        </span>
                      ) : null}
                      <a
                        href="#planning-stepper"
                        className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[11px] font-semibold text-slate-100 transition-colors hover:border-sky-400/70 hover:text-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                      >
                        {resolveOperationsExecutionStepReturnLabel()}
                      </a>
                    </div>
                  </div>
                  <span className="rounded-full border border-sky-300/80 bg-sky-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100 shadow-[0_10px_20px_-18px_rgba(14,165,233,0.55)]">
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
                  <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[11px] font-semibold text-slate-100">
                    Owner: {step.owner}
                  </span>
                  <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[11px] font-semibold text-slate-100">
                    {step.approvalStatus}
                  </span>
                  <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[11px] font-semibold text-slate-100">
                    Check again if: {step.changeSignal}
                  </span>
                </div>
              </div>
              <a
                href={stepHref}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
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
