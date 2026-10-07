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

export const buildOperationsExecutionStepHref = (stepId: string) =>
  `#${stepId}`;

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
  const matchingStep = steps.find(
    (step) => step.id === hashId || step.hashAliases?.includes(hashId),
  );
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
 *
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
    const target = steps.find(
      (step) => step.id === hashId || step.hashAliases?.includes(hashId),
    );
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
  return hashId
    ? resolveOperationsExecutionStepId({ hashId, firstStepId, steps })
    : firstStepId;
};

/**
 * One step: an expandable panel. The plan page used to be a checklist, with a
 * Done box on every step and a collapsed "done" state; most steps were reading,
 * not tasks, so the boxes asked the reader to tick off having read.
 */
function StepPanel({
  step,
  isOpen,
  isActive,
  onToggleOpen,
}: {
  step: OperationsExecutionStep;
  isOpen: boolean;
  isActive: boolean;
  onToggleOpen: () => void;
}) {
  return (
    <section
      id={step.id}
      // The current step is stated once, here, where assistive tech
      // reads it; an "Active" stamp beside the title was the same fact
      // drawn a second time for sighted readers only.
      aria-current={isActive ? "step" : undefined}
      className={`weather-step-panel space-y-4 rounded-xl border p-4 sm:p-5 ${
        /* A closed step's edge is the subtle border token, not white at 4%: on
           the dark ground that drew nothing, and four closed steps read as one
           run of text with checkboxes. The token keeps it visible in light too. */
        isOpen ? "border-sky-500/20 bg-slate-900/10" : "border-[var(--border-subtle)] bg-slate-950/[0.05]"
      }`}
    >
      {/* The rule divides the header from the step body, so a closed step
          drew a divider with nothing under it. */}
      <div
        className={`flex flex-wrap items-start justify-between gap-3 ${
          isOpen ? "pb-4 border-b border-white/[0.04]" : ""
        }`}
      >
        <div className="min-w-0 space-y-1">
          {/* No `step.label` eyebrow here. All six read as a word already
              in the title underneath — PLAN over "Weekly plan", RULES
              over "Rules before you commit" — so the page opened six
              sections with a near-duplicate stacked above each heading. */}
          {/* A toggle, not a link: with steps opening independently the
              title's job is expand/collapse, which §IV says is a button.
              Deep links arrive through the section id, and they open a
              step without closing the others. */}
          <h3 className="max-w-2xl text-lg font-semibold tracking-[-0.02em]">
            <button
              type="button"
              onClick={onToggleOpen}
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
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            {step.description}
          </p>
          {/* Facts about the step, not controls: a pill is a button
              shape, and three of them in a row look like three actions. */}
          {step.owner || step.approvalStatus || step.changeSignal ? (
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-fluid-xs text-slate-300">
              {step.owner ? (
                <div>
                  <dt className="inline text-slate-400">Owner: </dt>
                  <dd className="inline font-semibold text-slate-100">{step.owner}</dd>
                </div>
              ) : null}
              {step.approvalStatus ? (
                <div>
                  <dt className="sr-only">Status</dt>
                  <dd className="inline font-semibold text-slate-100">{step.approvalStatus}</dd>
                </div>
              ) : null}
              {step.changeSignal ? (
                <div>
                  <dt className="inline text-slate-400">Check again if: </dt>
                  <dd className="inline font-semibold text-slate-100">{step.changeSignal}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
      {isOpen && (
        <div id={`${step.id}-body`} className="mt-4">
          {step.children}
        </div>
      )}
    </section>
  );
}

/**
 * The plan page's sections, each expandable, in the order a reader works the
 * week: each area's rule and its lines, the do/don't lists, then the test that
 * checks one move against them.
 * Openness follows `resolveInitialOpenStepIds`, and a deep link opens its
 * target without closing anything.
 */
export function OperationsExecutionStepper({ steps }: { steps: OperationsExecutionStep[] }) {
  const firstStepId = steps[0]?.id ?? "";
  // Openness is a set; `currentStepId` stays singular because aria-current is.
  const [openStepIds, setOpenStepIds] = useState<Set<string>>(
    () => new Set(resolveInitialOpenStepIds({ steps })),
  );
  const [currentStepId, setCurrentStepId] = useState(firstStepId);

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
      setOpenStepIds((prev) =>
        prev.has(targeted) ? prev : new Set(prev).add(targeted),
      );
    };

    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [firstStepId, steps]);

  const toggleOpen = (stepId: string) => {
    setOpenStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  return (
    <section
      id="planning-stepper"
      className="mt-6 space-y-6"
      aria-label="Planning sections"
    >
      {steps.map((step) => (
        <StepPanel
          key={step.id}
          step={step}
          isOpen={openStepIds.has(step.id)}
          isActive={step.id === currentStepId}
          onToggleOpen={() => toggleOpen(step.id)}
        />
      ))}
    </section>
  );
}
