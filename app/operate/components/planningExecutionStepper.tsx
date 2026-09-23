"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";
import {
  EMPTY_WEEK_CHECKLIST,
  WEEK_CHECKLIST_STORAGE_KEY,
  doneStepsForWeek,
  toggleWeekStep,
  type WeekChecklist,
} from "../weekChecklist";

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
 * A step the reader has marked done is closed whatever this says — see
 * `OperationsExecutionStepper` — and undoing it hands the step back to this
 * rule rather than to a remembered state.
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
 * The done control: a checkbox drawn as a button, because it is one. The
 * state lives on `aria-pressed`, the glyph only echoes it, and the label stays
 * "Done" in both states so the accessible name does not change under the
 * reader's finger. The step's title is part of that name: six buttons all
 * announced as "Done" gave a screen reader no way to tell which step each marks.
 *
 * No button frame and no tracking: the checkbox glyph is the affordance, and
 * five bordered, letter-spaced "Done" boxes down one page were the loudest
 * thing on it (DD-029). The 44px target stays.
 */
const DoneButton = ({ pressed, onClick, stepTitle }: { pressed: boolean; onClick: () => void; stepTitle: string }) => (
  <button
    type="button"
    aria-pressed={pressed}
    aria-label={`Done: ${stepTitle}`}
    onClick={onClick}
    className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-[var(--radius-md)] px-2 py-2 text-sm font-medium text-slate-300 hover:text-slate-100"
  >
    <span
      aria-hidden="true"
      className={`inline-flex size-4 items-center justify-center rounded-sm border text-[11px] leading-none ${
        pressed ? "border-semantic-easing-border bg-semantic-easing-border text-slate-950" : "border-slate-500"
      }`}
    >
      {pressed ? "✓" : ""}
    </span>
    Done
  </button>
);

/**
 * One step. Done, it collapses to its title and one-line summary with an Undo;
 * otherwise it is the expandable panel it always was, with the done control
 * beside the title.
 */
function StepPanel({
  step,
  isOpen,
  isActive,
  isDone,
  onToggleOpen,
  onToggleDone,
}: {
  step: OperationsExecutionStep;
  isOpen: boolean;
  isActive: boolean;
  isDone: boolean;
  onToggleOpen: () => void;
  /** Absent on an archived month: its plan is for reading, not for ticking off. */
  onToggleDone?: () => void;
}) {
  if (isDone) {
    return (
      <section
        id={step.id}
        aria-current={isActive ? "step" : undefined}
        data-step-done="true"
        className="weather-step-panel space-y-4 rounded-xl border border-white/[0.04] bg-slate-950/[0.05] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="max-w-2xl text-lg font-semibold tracking-[-0.02em] text-slate-400">{step.title}</h3>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">
              {step.description}{" "}
              <button
                type="button"
                onClick={onToggleDone}
                aria-label={`Undo: ${step.title}`}
                className="inline-flex min-h-11 items-center font-semibold text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200"
              >
                Undo
              </button>
            </p>
          </div>
          {onToggleDone ? <DoneButton pressed onClick={onToggleDone} stepTitle={step.title} /> : null}
        </div>
      </section>
    );
  }

  return (
    <section
      id={step.id}
      // The current step is stated once, here, where assistive tech
      // reads it; an "Active" stamp beside the title was the same fact
      // drawn a second time for sighted readers only.
      aria-current={isActive ? "step" : undefined}
      className={`weather-step-panel space-y-4 rounded-xl border p-4 sm:p-5 ${
        isOpen ? "border-sky-500/20 bg-slate-900/10" : "border-white/[0.04] bg-slate-950/[0.05]"
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
              Deep links still arrive through the checklist above and
              through the section id, and they open a step without
              closing the others. */}
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
          {/* A "Back to steps" pill used to sit here, in all six steps,
              anchoring to the checklist a couple of hundred pixels
              above and still on screen. Six identical controls
              pointing at visible content is navigation noise. */}
        </div>
        {onToggleDone ? <DoneButton pressed={false} onClick={onToggleDone} stepTitle={step.title} /> : null}
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
 * The steps, in the order the week is worked, with a tick per step.
 *
 * Ticks are stored in this browser under one key, stamped with the record
 * date, so they belong to one week and the next Monday starts clean
 * (`app/operate/weekChecklist.ts`). Done is derived from the store on every
 * render and subtracted from the open set at render time — the open set keeps
 * following its own rule, so Undo returns a step to whatever that rule says,
 * not to a second remembered state.
 */
export function OperationsExecutionStepper({
  steps,
  recordDate,
}: {
  steps: OperationsExecutionStep[];
  /**
   * The week the ticks belong to (`weeklyRecordDate`, the week-ending date —
   * the daily record date moved every business day and reset the list). Null
   * on an archived month, which shows no checklist: a tick there would have
   * replaced this week's record.
   */
  recordDate: string | null;
}) {
  const firstStepId = steps[0]?.id ?? "";
  const [checklist, setChecklist] = useLocalStorageState<WeekChecklist>(
    WEEK_CHECKLIST_STORAGE_KEY,
    EMPTY_WEEK_CHECKLIST,
  );
  const doneStepIds = recordDate ? doneStepsForWeek(checklist, recordDate) : [];
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

  const toggleDone = (stepId: string) => {
    if (!recordDate) return;
    setChecklist((prev) => toggleWeekStep(prev, recordDate, stepId));
  };

  const doneCount = steps.filter((step) => doneStepIds.includes(step.id)).length;

  return (
    <section
      id="planning-stepper"
      className="space-y-4"
      aria-label="Planning sections"
    >
      {/* No chip row of its own. The shell's sidebar (from lg) and mobile chips
          list the same steps from `operationsSectionLinks.plan`, so this row was
          the page's second index — a third, counting the card grid that used to
          close the page. The `aria-current="step"` state lives on the panels. */}
      {recordDate ? (
        <p className="text-xs text-slate-400" aria-live="polite" data-week-progress>
          <span className="font-semibold tabular-nums text-slate-200">
            {doneCount} of {steps.length}
          </span>{" "}
          done this week
        </p>
      ) : null}
      <div className="space-y-6">
        {steps.map((step) => {
          const isDone = doneStepIds.includes(step.id);
          return (
            <StepPanel
              key={step.id}
              step={step}
              isOpen={openStepIds.has(step.id) && !isDone}
              isActive={step.id === currentStepId}
              isDone={isDone}
              onToggleOpen={() => toggleOpen(step.id)}
              onToggleDone={recordDate ? () => toggleDone(step.id) : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
