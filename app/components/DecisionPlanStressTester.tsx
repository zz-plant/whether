"use client";

import { useId, useRef, useState } from "react";
import { ShieldAlert, ShieldCheck, Zap, ArrowRight, Bookmark, CheckCircle2, Copy } from "lucide-react";
import {
  stressTestDecisionPlan,
  type PlanStressTestResult,
  type LifecycleStage,
  type DecisionCategory,
  type DecisionVerdict,
} from "../../lib/decisionShield";
import { parseMoneyInput } from "../../lib/planCommitment";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { usePersistentClientId } from "./clientIdentity";
import { useClipboardCopy, getClipboardUiState } from "./useClipboardCopy";
import { ClipboardActionRow } from "./clipboardActionRow";

const isLifecycleStage = (value: unknown): value is LifecycleStage =>
  value === "DISCOVERY" || value === "GROWTH" || value === "SCALE" || value === "MATURE";

/** "Detect" is the absence of an override, so it is not a `DecisionCategory`. */
type CategoryChoice = DecisionCategory | "AUTO";

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

/** Runway options carry the number they send. The old list labelled one option
 *  "< 9 months" while sending 6, and the engine then quoted "6 months" back at an
 *  operator who had never typed a 6. */
const RUNWAY_OPTIONS: { value: string; label: string }[] = [
  { value: "6", label: "6 months (critical)" },
  { value: "9", label: "9 months (tight)" },
  { value: "12", label: "12 months" },
  { value: "18", label: "18 months (standard)" },
  { value: "24", label: "24+ months (strong)" },
];

export interface DecisionPlanStressTesterProps {
  assessment: RegimeAssessment;
  recordDate: string;
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
  className = "",
}: DecisionPlanStressTesterProps) {
  const [planText, setPlanText] = useState("");
  const [lifecycle, setLifecycle] = useState<LifecycleStage>("GROWTH");
  const [category, setCategory] = useState<CategoryChoice>("AUTO");
  const [runwayMonths, setRunwayMonths] = useState<string>("18");
  const [burnInput, setBurnInput] = useState("");
  const [result, setResult] = useState<PlanStressTestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const clientId = usePersistentClientId();
  const clipboard = useClipboardCopy();
  const fieldId = useId();

  const runTest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!planText.trim()) {
      setError("Describe the commitment first — a hire, a contract, or an expansion.");
      planInputRef.current?.focus();
      return;
    }
    setError(null);

    const runway = Number.parseInt(runwayMonths, 10);
    setResult(
      stressTestDecisionPlan(assessment, {
        planText,
        lifecycle,
        category: category === "AUTO" ? undefined : category,
        companyProfile: {
          runwayMonths: Number.isFinite(runway) ? runway : 18,
          // Left undefined when the box is empty or unreadable, which is what
          // makes the engine say it cannot size the plan instead of guessing.
          monthlyBurnUsd: parseMoneyInput(burnInput) ?? undefined,
        },
      }),
    );
    setIsSaved(false);
  };

  const handleSaveToMemory = async () => {
    if (!result || isSaving || isSaved || !clientId) return;
    setIsSaving(true);

    try {
      await fetch("/api/decision-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-whether-client-id": clientId },
        body: JSON.stringify({
          kind: "plan-evaluation",
          clientId,
          recordDate,
          planText,
          verdict: result.verdict,
          primaryCall: result.headline,
          guardrail: result.boundedGuardrail,
          reversalTrigger: result.reversalTrigger,
          tightness: assessment.scores.tightness,
          riskAppetite: assessment.scores.riskAppetite,
        }),
      });
      setIsSaved(true);
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
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
          Describe a hire, a commitment, or an expansion. It is graded against this week&rsquo;s
          funding pressure ({assessment.scores.tightness.toFixed(0)}/100) and, if you give a burn
          rate, against the cash you have to absorb it.
        </p>
      </div>

      <form onSubmit={runTest} className="space-y-3">
        <div>
          <label htmlFor={`${fieldId}-plan`} className="sr-only">
            The plan to stress-test
          </label>
          {/* .weather-input carries the 44px target and the 16px font size that
              stops mobile Safari zooming on focus. The hand-rolled chain that
              used to be here was text-xs, so it did neither. */}
          <input
            id={`${fieldId}-plan`}
            ref={planInputRef}
            type="text"
            value={planText}
            onChange={(e) => {
              setPlanText(e.target.value);
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={`${fieldId}-stage`} className="block text-fluid-nano text-slate-400">
              Stage
            </label>
            <select
              id={`${fieldId}-stage`}
              value={lifecycle}
              onChange={(e) => {
                if (isLifecycleStage(e.target.value)) setLifecycle(e.target.value);
              }}
              className="weather-control mt-1"
            >
              {/* Same four names as the stage selector in the hero. This list
                  used to call them Discovery / Growth / Scale / Mature, a second
                  taxonomy for the same question on the same screen. */}
              <option value="DISCOVERY">Seed</option>
              <option value="GROWTH">Series A</option>
              <option value="SCALE">Series B+</option>
              <option value="MATURE">Bootstrapped</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${fieldId}-runway`} className="block text-fluid-nano text-slate-400">
              Runway
            </label>
            <select
              id={`${fieldId}-runway`}
              value={runwayMonths}
              onChange={(e) => setRunwayMonths(e.target.value)}
              className="weather-control mt-1"
            >
              {RUNWAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${fieldId}-burn`} className="block text-fluid-nano text-slate-400">
              Monthly burn <span className="text-slate-500">(optional)</span>
            </label>
            {/* Optional on purpose, and the result says what its absence costs.
                Without it there is no denominator, and a size verdict computed
                from a burn rate nobody supplied would be invention. */}
            <input
              id={`${fieldId}-burn`}
              type="text"
              inputMode="decimal"
              value={burnInput}
              onChange={(e) => setBurnInput(e.target.value)}
              placeholder="$150k"
              aria-describedby={`${fieldId}-burn-hint`}
              className="weather-input mt-1 w-full px-3.5 py-2.5"
            />
            <p id={`${fieldId}-burn-hint`} className="sr-only">
              Net cash burn per month. Used with runway to size the plan against available cash.
            </p>
          </div>

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
          across whatever they are reading. Without this the form submitted and a
          screen-reader user was told nothing at all. */}
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
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveToMemory}
                disabled={isSaved || isSaving}
                className="weather-button inline-flex min-h-[44px] shrink-0 items-center gap-1 text-fluid-xs font-medium"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-400" />
                    <span className="text-emerald-300">Tracked in Memory</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="size-3 text-slate-400" />
                    <span>{isSaving ? "Saving..." : "Track in Memory"}</span>
                  </>
                )}
              </button>
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
              {/* Computed since this feature shipped and never rendered here, while
                  /operate showed both. The bounded rule is the product; a verdict
                  without it is an opinion. */}
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
