"use client";

import { useId, useRef, useState } from "react";
import { ShieldAlert, ShieldCheck, Zap, ArrowRight, Copy } from "lucide-react";
import {
  stressTestDecisionPlan,
  type PlanStressTestResult,
  type DecisionCategory,
  type DecisionVerdict,
} from "../../lib/decisionShield";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import {
  lifecycleStageForOperatorStage,
  operatorStageForVariantMode,
  operatorStageLabel,
} from "../../lib/report/operatorStage";
import { OperatorProfileNumberField } from "./operatorProfileFields";
import { useClipboardCopy, getClipboardUiState } from "./useClipboardCopy";
import { useOperatorProfile } from "./useOperatorProfile";
import { ClipboardActionRow } from "./clipboardActionRow";

/** "Detect" is the absence of an override, so it is not a `DecisionCategory`. */
type CategoryChoice = DecisionCategory | "AUTO";

/**
 * Three plans the panel opens on, already graded. A form with an empty text box
 * and no example of what a result looks like asked for effort before showing
 * value; a graded verdict on screen at load shows what the tool does, and one
 * tap swaps the example for the reader's own plan.
 */
export const EXAMPLE_PLANS: ReadonlyArray<{ label: string; text: string; category: DecisionCategory }> = [
  { label: "Hire 3 senior engineers", text: "Hire 3 senior engineers at $180k each", category: "HIRING" },
  { label: "Sign a $50k cloud commit", text: "Sign a $50k annual cloud commitment", category: "INFRASTRUCTURE" },
  { label: "Open a second market", text: "Open a second geographic market with a 4-person team", category: "GEOGRAPHIC_EXPANSION" },
];

const CATEGORY_OPTIONS: { value: CategoryChoice; label: string }[] = [
  { value: "AUTO", label: "Detect from text" },
  { value: "HIRING", label: "Hiring" },
  { value: "INFRASTRUCTURE", label: "Infrastructure / spend" },
  { value: "PRICING", label: "Pricing / discount" },
  { value: "ROADMAP", label: "Roadmap / rewrite" },
  { value: "GEOGRAPHIC_EXPANSION", label: "Market expansion" },
  { value: "M_AND_A", label: "M&A" },
  { value: "RESTRUCTURING", label: "Restructuring" },
];

const isCategoryChoice = (value: string): value is CategoryChoice =>
  CATEGORY_OPTIONS.some((option) => option.value === value);

export interface DecisionPlanStressTesterProps {
  assessment: RegimeAssessment;
  recordDate: string;
  /** The stage the hero's Calibrate stage control settled on; this panel grades for the same team. */
  activeStage?: StartupVariantMode;
  className?: string;
}

const verdictStyles: Record<
  DecisionVerdict,
  { badge: string; border: string; bg: string; icon: React.ReactNode }
> = {
  SAFE: {
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
  },
  RISKY: {
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    border: "border-amber-500/30",
    bg: "bg-amber-950/20",
    icon: <ShieldAlert className="h-5 w-5 text-amber-400" />,
  },
  DANGEROUS: {
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    border: "border-rose-500/30",
    bg: "bg-rose-950/20",
    icon: <ShieldAlert className="h-5 w-5 text-rose-400" />,
  },
};

const CATEGORY_LABELS: Record<DecisionCategory, string> = {
  HIRING: "Hiring",
  INFRASTRUCTURE: "Infrastructure / spend",
  PRICING: "Pricing / discount",
  ROADMAP: "Roadmap / rewrite",
  GEOGRAPHIC_EXPANSION: "Market expansion",
  M_AND_A: "M&A",
  RESTRUCTURING: "Restructuring",
};

/** The verdict as something you can paste into the thread where the decision is
 *  actually being argued. Ordered the way it is read: call, why, what bounds it,
 *  what would reverse it. */
const buildShareText = (
  result: PlanStressTestResult,
  planText: string,
  recordDate: string,
): string =>
  [
    `Plan stress test — ${result.verdict}`,
    `Plan: ${planText}`,
    `Read as: ${CATEGORY_LABELS[result.detectedCategory]}${result.detectionConfidence === "ASSUMED" ? " (assumed — nothing in the text named a decision type)" : ""}`,
    `Sizing: ${result.sizingNote}`,
    `Guardrail: ${result.boundedGuardrail}`,
    `Reverses when: ${result.reversalTrigger}`,
    `Conditions as of ${recordDate}.`,
  ].join("\n");

export function DecisionPlanStressTester({
  assessment,
  recordDate,
  activeStage,
  className = "",
}: DecisionPlanStressTesterProps) {
  const [planText, setPlanText] = useState(EXAMPLE_PLANS[0].text);
  const [category, setCategory] = useState<CategoryChoice>(EXAMPLE_PLANS[0].category);
  const [error, setError] = useState<string | null>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const clipboard = useClipboardCopy();
  const fieldId = useId();
  const { profile, setProfileField } = useOperatorProfile();

  // One stage control on this page: the hero's. The select that used to sit
  // here was a second copy of the same question, answered separately.
  const stage = operatorStageForVariantMode(activeStage);
  const lifecycle = lifecycleStageForOperatorStage[stage];

  // Graded on first render, on the server too, so the panel never opens empty.
  // The engine is pure and the example carries no cash position, so this is a
  // real verdict about a plausible plan, marked as an example.
  const [result, setResult] = useState<PlanStressTestResult | null>(() =>
    stressTestDecisionPlan(assessment, {
      planText: EXAMPLE_PLANS[0].text,
      lifecycle,
      category: EXAMPLE_PLANS[0].category,
    }),
  );
  const [isExample, setIsExample] = useState(true);

  const runExample = (example: (typeof EXAMPLE_PLANS)[number]) => {
    setPlanText(example.text);
    setCategory(example.category);
    setError(null);
    setIsExample(true);
    setResult(
      stressTestDecisionPlan(assessment, {
        planText: example.text,
        lifecycle,
        category: example.category,
        companyProfile: { runwayMonths: profile.runwayMonths, monthlyBurnUsd: profile.monthlyBurnUsd },
      }),
    );
  };

  const runTest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!planText.trim()) {
      setError("Describe the commitment first — a hire, a contract, or an expansion.");
      planInputRef.current?.focus();
      return;
    }
    setError(null);
    setIsExample(false);

    setResult(
      stressTestDecisionPlan(assessment, {
        planText,
        lifecycle,
        category: category === "AUTO" ? undefined : category,
        // Both left undefined when not given, which is what makes the engine say
        // it cannot size the plan instead of guessing a runway or a burn rate.
        companyProfile: {
          runwayMonths: profile.runwayMonths,
          monthlyBurnUsd: profile.monthlyBurnUsd,
        },
      }),
    );
  };


  return (
    <section
      id="stress-test"
      aria-labelledby="decision-stress-test-heading"
      className={`weather-surface weather-surface-sky px-5 py-5 ${className}`}
    >
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/10 text-sky-400">
            <Zap className="size-4" />
          </span>
          <h3 id="decision-stress-test-heading" className="text-fluid-lg font-semibold tracking-tight text-white">
            Plan stress test
          </h3>
        </div>
        <p className="mt-1.5 text-fluid-sm text-slate-300">
          Describe a hire, a commitment, or an expansion. It is graded for a{" "}
          <a href="#calibrate-stage" className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
            {operatorStageLabel(stage)} team
          </a>{" "}
          against this week&rsquo;s funding pressure ({assessment.scores.tightness.toFixed(0)}/100) and, if you
          give runway and monthly burn, against the cash you have to absorb it.
        </p>
        <p className="mt-1 text-fluid-nano text-slate-500">
          Not your stage? Change it under Calibrate stage above; the default is Series A. Runway and burn stay in this browser and are shared with the runway planner.
        </p>
      </div>

      <form onSubmit={runTest} className="space-y-3">
        <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0">
          <legend className="float-left text-fluid-nano text-slate-400">Try:</legend>
          {EXAMPLE_PLANS.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => runExample(example)}
              aria-pressed={isExample && planText === example.text}
              className={`inline-flex min-h-9 items-center rounded-md border px-2.5 text-fluid-nano font-medium transition-colors ${
                isExample && planText === example.text
                  ? "border-sky-500/50 bg-sky-500/10 text-sky-100"
                  : "border-slate-700/70 text-slate-300 hover:border-sky-400/60 hover:text-white"
              }`}
            >
              {example.label}
            </button>
          ))}
        </fieldset>
        <div>
          <label htmlFor={`${fieldId}-plan`} className="sr-only">
            The plan to stress-test
          </label>
          {/* .weather-input carries the 44px target and the 16px font size that
              stops mobile Safari zooming on focus. */}
          <input
            id={`${fieldId}-plan`}
            ref={planInputRef}
            type="text"
            value={planText}
            onChange={(e) => {
              setPlanText(e.target.value);
              setIsExample(false);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            placeholder="e.g. Hiring 3 senior engineers @ $180k, or signing a $50k annual cloud commit..."
            className="weather-input w-full px-3.5 py-2.5"
          />
          {error ? (
            <p id={`${fieldId}-error`} role="alert" className="mt-1.5 text-fluid-xs text-amber-300">
              {error}
            </p>
          ) : null}
        </div>

        <details className="weather-auto-chevron rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2" open={profile.runwayMonths != null || profile.monthlyBurnUsd != null}>
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-fluid-xs font-medium text-slate-200">
            <span>Add your cash position to size the verdict{profile.runwayMonths != null || profile.monthlyBurnUsd != null ? "" : " (optional)"}</span>
          </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <OperatorProfileNumberField
            field="runwayMonths"
            label="Runway (months)"
            placeholder="e.g. 14"
            value={profile.runwayMonths}
            onCommit={(value) => setProfileField("runwayMonths", value)}
            optional
          />
          {/* Optional on purpose, and the result says what its absence costs.
              Without it there is no denominator, and a size verdict computed
              from a burn rate nobody supplied would be invention. */}
          <OperatorProfileNumberField
            field="monthlyBurnUsd"
            label="Monthly burn"
            placeholder="$150k"
            value={profile.monthlyBurnUsd}
            onCommit={(value) => setProfileField("monthlyBurnUsd", value)}
            optional
          />

          <div>
            <label htmlFor={`${fieldId}-category`} className="block text-fluid-nano text-slate-400">
              Decision type
            </label>
            <select
              id={`${fieldId}-category`}
              value={category}
              onChange={(e) => {
                if (isCategoryChoice(e.target.value)) setCategory(e.target.value);
              }}
              className="weather-control mt-1"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        </details>

        {/* Not disabled when empty: a disabled submit hides the reason. The
            click is accepted and answered by focusing the field. */}
        <button
          type="submit"
          className="weather-button-primary inline-flex items-center gap-1.5 text-fluid-xs font-semibold"
        >
          <span>Stress-Test Plan</span>
          <ArrowRight className="size-3.5" />
        </button>
      </form>

      {/* Polite, not assertive: the verdict is the answer to something the reader
          just asked for, so it should follow their own action rather than cut
          across whatever they are reading. */}
      <div aria-live="polite">
        {result ? (
          <div
            className={`mt-4 rounded-lg border p-4 transition-colors ${verdictStyles[result.verdict].border} ${verdictStyles[result.verdict].bg}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {verdictStyles[result.verdict].icon}
                <div>
                  <span
                    className={`inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${verdictStyles[result.verdict].badge}`}
                  >
                    {result.verdict}
                  </span>
                  <span className="ml-2 text-xs font-semibold text-white">{result.headline}</span>
                  {isExample ? (
                    <span className="ml-2 rounded-sm border border-white/[0.1] px-1.5 py-0.5 text-fluid-nano uppercase tracking-wider text-white/50">Example</span>
                  ) : null}
                </div>
              </div>

            </div>

            {/* What it read, before what it concluded. A misparse is the failure
                mode most likely to go unnoticed, so the reading is stated first
                and the control that corrects it sits in the form above. */}
            <dl className="mt-3 space-y-1.5 border-t border-white/[0.07] pt-3 text-fluid-xs">
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-medium text-slate-400">Read as</dt>
                <dd className="text-slate-200">
                  {CATEGORY_LABELS[result.detectedCategory]}
                  {result.commitment.basis ? (
                    <span className="text-slate-400"> · {result.commitment.basis}</span>
                  ) : null}
                  {result.detectionConfidence === "ASSUMED" ? (
                    <span className="text-amber-300">
                      {" "}
                      — assumed. Nothing in the text named a decision type; set one above if this is wrong.
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-medium text-slate-400">Sizing</dt>
                <dd className="text-slate-200">{result.sizingNote}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-medium text-semantic-caution-fg">Guardrail</dt>
                <dd className="text-slate-200">{result.boundedGuardrail}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-medium text-semantic-reversal-fg">Reverses when</dt>
                <dd className="text-slate-200">{result.reversalTrigger}</dd>
              </div>
            </dl>

            <div className="mt-3 space-y-2 text-xs text-slate-300">
              {result.reversibleAlternative ? (
                <div className="rounded border border-sky-500/20 bg-sky-950/30 p-2.5 text-sky-200">
                  <span className="font-semibold text-sky-400">Reversible alternative: </span>
                  {result.reversibleAlternative}
                </div>
              ) : null}

              {result.fragileAssumptions.length > 0 ? (
                <div className="pt-1">
                  <p className="mb-1 text-fluid-nano font-semibold uppercase tracking-wider text-slate-400">
                    Fragile macro assumptions
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-fluid-nano text-slate-300">
                    {result.fragileAssumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* The argument this settles happens in a thread, not on this page. */}
            <div className="mt-3 border-t border-white/[0.07] pt-3">
              <ClipboardActionRow
                label="Copy verdict"
                compact
                leadingIcon={<Copy className="size-3.5" />}
                state={getClipboardUiState("stress-test", clipboard)}
                onClick={() => {
                  void clipboard.copyToClipboard(
                    buildShareText(result, planText, recordDate),
                    "stress-test",
                  );
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
