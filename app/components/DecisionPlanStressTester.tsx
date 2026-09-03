"use client";

import { useRef, useState } from "react";
import { ShieldAlert, ShieldCheck, Zap, ArrowRight, Bookmark, CheckCircle2 } from "lucide-react";
import { stressTestDecisionPlan, type PlanStressTestResult, type LifecycleStage, type DecisionVerdict } from "../../lib/decisionShield";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { usePersistentClientId } from "./clientIdentity";

const isLifecycleStage = (value: unknown): value is LifecycleStage =>
  value === "DISCOVERY" || value === "GROWTH" || value === "SCALE" || value === "MATURE";

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

export function DecisionPlanStressTester({
  assessment,
  recordDate,
  className = "",
}: DecisionPlanStressTesterProps) {
  const [planText, setPlanText] = useState("");
  const [lifecycle, setLifecycle] = useState<LifecycleStage>("GROWTH");
  const [runwayMonths, setRunwayMonths] = useState<string>("16");
  const [result, setResult] = useState<PlanStressTestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const clientId = usePersistentClientId();

  const handleTest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!planText.trim()) {
      setError("Describe the commitment first — a hire, a contract, or an expansion.");
      planInputRef.current?.focus();
      return;
    }
    setError(null);

    const runway = parseInt(runwayMonths, 10);
    const evaluation = stressTestDecisionPlan(assessment, {
      planText,
      lifecycle,
      companyProfile: {
        runwayMonths: Number.isFinite(runway) ? runway : 16,
      },
    });

    setResult(evaluation);
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
          Test a planned hire, cloud commitment, or expansion against live capital tightness ({assessment.scores.tightness.toFixed(0)}/100).
        </p>
      </div>

      <form onSubmit={handleTest} className="space-y-3">
        <div className="relative">
          <label htmlFor="stress-test-plan" className="sr-only">
            The plan to stress-test
          </label>
          {/* .weather-input carries the 44px target and the 16px font size that
              stops mobile Safari zooming on focus. The hand-rolled chain that
              used to be here was text-xs, so it did neither. */}
          <input
            id="stress-test-plan"
            ref={planInputRef}
            type="text"
            value={planText}
            onChange={(e) => {
              setPlanText(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "stress-test-error" : undefined}
            placeholder="e.g. Hiring 3 senior engineers @ $180k, or signing a $50k annual cloud commit..."
            className="weather-input w-full px-3.5 py-2.5"
          />
          {error ? (
            <p id="stress-test-error" role="alert" className="mt-1.5 text-fluid-xs text-amber-300">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <label className="flex items-center gap-1.5">
              <span>Stage:</span>
              <select
                value={lifecycle}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isLifecycleStage(next)) setLifecycle(next);
                }}
                className="weather-control w-auto px-2 py-1"
              >
                {/* Same four names as the stage selector in the hero. This list
                    used to call them Discovery / Growth / Scale / Mature, a second
                    taxonomy for the same question on the same screen. */}
                <option value="DISCOVERY">Seed</option>
                <option value="GROWTH">Series A</option>
                <option value="SCALE">Series B+</option>
                <option value="MATURE">Bootstrapped</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span>Runway:</span>
              <select
                value={runwayMonths}
                onChange={(e) => setRunwayMonths(e.target.value)}
                className="weather-control w-auto px-2 py-1"
              >
                <option value="6">&lt; 9 months (Tight)</option>
                <option value="12">12 months</option>
                <option value="18">18 months (Standard)</option>
                <option value="24">24+ months (Strong)</option>
              </select>
            </label>
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
        </div>
      </form>

      {result ? (
        <div className={`mt-4 rounded-lg border p-4 transition-colors ${verdictStyles[result.verdict].border} ${verdictStyles[result.verdict].bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {verdictStyles[result.verdict].icon}
              <div>
                <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${verdictStyles[result.verdict].badge}`}>
                  {result.verdict}
                </span>
                <span className="ml-2 text-xs font-semibold text-white">{result.headline}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveToMemory}
              disabled={isSaved || isSaving}
              className="weather-button shrink-0 inline-flex min-h-[44px] items-center gap-1 text-fluid-xs font-medium"
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

          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {result.reversibleAlternative ? (
              <div className="rounded border border-sky-500/20 bg-sky-950/30 p-2.5 text-sky-200">
                <span className="font-semibold text-sky-400">Reversible Alternative: </span>
                {result.reversibleAlternative}
              </div>
            ) : null}

            {result.fragileAssumptions && result.fragileAssumptions.length > 0 ? (
              <div className="pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Fragile Macro Assumptions:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                  {result.fragileAssumptions.map((assump, idx) => (
                    <li key={idx}>{assump}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
