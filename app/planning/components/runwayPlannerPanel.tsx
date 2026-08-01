"use client";

import { useMemo, useState } from "react";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";
import {
  buildRunwayPlan,
  formatRunwayPlanCompactBlock,
  type PlannerPosture,
  type PlannerSector,
  type PlannerStage,
} from "../../../lib/report/runwayPlanner";
import type { RegimeAssessment } from "../../../lib/regimeEngine";

const stageOptions: PlannerStage[] = ["seed", "series-a", "growth", "public"];
const sectorOptions: PlannerSector[] = ["b2b-saas", "consumer", "infrastructure"];


const strictnessLabel = (value: number) => {
  if (value <= 0) return { label: "Relaxed", tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" };
  if (value === 1) return { label: "Cautious", tone: "border-sky-400/40 bg-sky-500/10 text-sky-100" };
  if (value === 2) return { label: "Strict", tone: "border-amber-400/40 bg-amber-500/10 text-amber-100" };
  return { label: "Maximum strictness", tone: "border-rose-400/40 bg-rose-500/10 text-rose-100" };
};

const postureForPolicyPosture = (posture: RegimeAssessment["policyAssessment"]["posture"]): PlannerPosture => {
  if (posture === "RISK_ON") return "RISK_ON";
  if (posture === "TRANSITION") return "TRANSITION";
  return "SAFETY_MODE";
};

export function RunwayPlannerPanel({
  assessment,
  sensors,
  macroSeries,
  recordDateLabel = "weekly",
}: {
  assessment: RegimeAssessment;
  sensors?: any;
  macroSeries?: any;
  recordDateLabel?: string;
}) {
  const [runway, setRunway] = useState(12);
  const [burn, setBurn] = useState(700000);
  const [revenue, setRevenue] = useState(450000);
  const [growthRate, setGrowthRate] = useState(12);
  const [sector, setSector] = useState<PlannerSector>("b2b-saas");
  const [stage, setStage] = useState<PlannerStage>("growth");
  const [showMethodology, setShowMethodology] = useState(false);
  const [showMemo, setShowMemo] = useState(false);

  const output = useMemo(
    () =>
      buildRunwayPlan({
        runway,
        burn,
        revenue,
        growthRate,
        sector,
        stage,
        regime: assessment.regime,
        posture: postureForPolicyPosture(assessment.policyAssessment.posture),
        tightnessScore: assessment.scores.tightness,
        riskAppetiteScore: assessment.scores.riskAppetite,
      }),
    [assessment.policyAssessment.posture, assessment.regime, assessment.scores.tightness, assessment.scores.riskAppetite, burn, growthRate, revenue, runway, sector, stage],
  );

  const shareBlock = useMemo(() => formatRunwayPlanCompactBlock(output), [output]);
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy();
  const clipboardState = getClipboardUiState("runway-plan", { status, error, activeTarget, copiedTarget });
  const memoClipboardState = getClipboardUiState("budget-memo", { status, error, activeTarget, copiedTarget });
  const paybackStrictnessLevel = Number.parseInt(output.decisionKnobs.paybackStrictnessLabel, 10) || 0;
  const paybackStrictnessState = strictnessLabel(paybackStrictnessLevel);

  const memoMarkdown = useMemo(() => {
    const baseRateVal = sensors?.baseRate?.valueLabel ?? sensors?.baseRate?.value ?? "N/A";
    const slopeVal = sensors?.curveSlope?.valueLabel ?? sensors?.curveSlope?.value ?? "N/A";
    const cpiVal = macroSeries?.cpi?.valueLabel ?? macroSeries?.cpi?.value ?? "N/A";
    const unempVal = macroSeries?.unemployment?.valueLabel ?? macroSeries?.unemployment?.value ?? "N/A";
    const bbbVal = macroSeries?.bbbSpread?.valueLabel ?? macroSeries?.bbbSpread?.value ?? "N/A";
    const postureStr = assessment.policyAssessment.posture === "RISK_ON" ? "Risk-On (Capital-Loose)" : assessment.policyAssessment.posture === "TRANSITION" ? "Transition (Caution)" : "Safety Mode (Capital-Tight)";

    return `
# EXECUTIVE BUDGET MEMO: MACRO-ALIGNED PLANNING
**Date**: ${recordDateLabel}
**Context**: US Macro Posture - ${assessment.regime} (${postureStr})

## 1. Executive Summary
Whether's macro assessment indicates we are currently in a **${assessment.regime}** regime. Based on U.S. credit conditions and investor sentiment, our baseline operating posture is aligned to **${postureStr}**.

This memo aligns our company budget and operating guardrails with the current climate:
- **Runway Risk**: ${output.runwayRisk.summary}
- **Fundraising Timing**: ${output.raiseTimingWindow.summary}
- **Burn Adjustment Range**: ${output.burnAdjustmentRange.summary}
- **Payback Tolerance**: Level ${paybackStrictnessLevel}/3 payback strictness.

## 2. Dynamic Guardrails & Bounded Rules
- **Capital Raising**: ${output.boundedRules.capitalRaising}
- **Burn Discipline**: ${output.boundedRules.burnDiscipline}

## 3. Macro Provenance & Citations
- **Base Interest Rate**: ${baseRateVal}% (Source: US Treasury)
- **Yield Curve Slope (10Y-2Y)**: ${slopeVal} (Source: US Treasury)
- **BBB Credit Spreads**: ${bbbVal}% (Source: FRED Moody's BBB Corporate Bond Yield Relative to 10Y Treasury)
- **CPI Inflation (YoY)**: ${cpiVal}% (Source: Bureau of Labor Statistics)
- **Unemployment Rate**: ${unempVal}% (Source: Bureau of Labor Statistics)

---
*Generated by Whether Strategic Planning Suite. Safe for board presentation.*
`.trim();
  }, [assessment, sensors, macroSeries, recordDateLabel, output, paybackStrictnessLevel]);

  return (
    <section className="weather-panel-static mt-6 space-y-4 p-6" aria-label="Runway planner">
      <div>
        <p className="type-label text-slate-400">Financial implications</p>
        <h3 className="text-lg font-semibold text-slate-100">Runway planner</h3>
        <p className="mt-2 text-sm text-slate-300">
          Check your runway plan against this week&apos;s market call so burn, fundraising timing, and reopen triggers stay aligned.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowMethodology((current) => !current)}
            className="inline-flex min-h-[44px] items-center rounded-sm border border-slate-600/70 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-slate-200 hover:border-sky-400/70 focus:outline-none"
          >
            How is this calculated?
          </button>
          <button
            type="button"
            onClick={() => setShowMemo((current) => !current)}
            className={`inline-flex min-h-[44px] items-center rounded-sm border px-3 py-1.5 text-xs font-semibold tracking-[0.12em] focus:outline-none ${
              showMemo
                ? "border-sky-400/80 bg-sky-500/10 text-sky-100"
                : "border-slate-600/70 text-slate-200 hover:border-sky-400/70"
            }`}
          >
            {showMemo ? "Hide Budget Memo" : "Generate Budget Memo"}
          </button>
        </div>
        {showMethodology ? (
          <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-950/70 p-3 text-xs text-slate-300">
            Runway risk combines runway gap, burn multiple, growth, and the current market setting. The planner turns that pressure plus regime context into practical guidance for approval pace, payback discipline, and how reversible new commitments should be.
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="weather-surface p-3 text-sm text-slate-200">
          Runway (months)
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" type="number" min={1} value={runway} onChange={(event) => setRunway(Number(event.target.value))} />
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Monthly burn ($)
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" type="number" min={0} step={50000} value={burn} onChange={(event) => setBurn(Number(event.target.value))} />
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Monthly revenue ($)
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" type="number" min={0} step={50000} value={revenue} onChange={(event) => setRevenue(Number(event.target.value))} />
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Monthly growth rate (%)
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" type="number" value={growthRate} onChange={(event) => setGrowthRate(Number(event.target.value))} />
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Sector
          <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" value={sector} onChange={(event) => setSector(event.target.value as PlannerSector)}>
            {sectorOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Stage
          <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" value={stage} onChange={(event) => setStage(event.target.value as PlannerStage)}>
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Runway risk</p>
          <p className="mt-2 text-sm text-slate-100">{output.runwayRisk.summary}</p>
        </article>
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Safe runway band</p>
          <p className="mt-2 text-sm text-slate-100">{output.safeRunwayBand.summary}</p>
        </article>
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Raise timing window</p>
          <p className="mt-2 text-sm text-slate-100">{output.raiseTimingWindow.summary}</p>
        </article>
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Burn adjustment range</p>
          <p className="mt-2 text-sm text-slate-100">{output.burnAdjustmentRange.summary}</p>
          <p className={`mt-3 inline-flex rounded-sm border px-2 py-1 text-xs font-semibold tracking-[0.08em] ${paybackStrictnessState.tone}`}>
            Payback strictness: {paybackStrictnessState.label} ({paybackStrictnessLevel}/3)
          </p>
        </article>
      </div>

      <div className="weather-surface p-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Bounded guardrails</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          <li>• {output.boundedRules.capitalRaising}</li>
          <li>• {output.boundedRules.burnDiscipline}</li>
        </ul>
      </div>

      {showMemo && (
        <div className="weather-surface border-sky-500/25 bg-slate-950/60 p-5 rounded-lg space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Generated board memo</p>
              <p className="text-fluid-xs text-slate-400">Review the aligned budget structure below.</p>
            </div>
            <ClipboardActionRow
              label="Copy board memo"
              state={memoClipboardState}
              onClick={() => {
                void copyToClipboard(memoMarkdown, "budget-memo");
              }}
              compact
            />
          </div>
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950/90 p-3 font-mono text-[11px] leading-relaxed text-slate-300 border border-slate-900">
            {memoMarkdown}
          </pre>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">Copy this compact block into Slack or your weekly finance sync.</p>
        <ClipboardActionRow
          label="Copy financial block"
          state={clipboardState}
          onClick={() => {
            void copyToClipboard(shareBlock, "runway-plan");
          }}
          buttonProps={{
            "data-premium-intent": "runway_planner",
            "data-premium-cta": "copy_financial_block",
          }}
          compact
        />
      </div>
    </section>
  );
}
