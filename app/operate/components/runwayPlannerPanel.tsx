"use client";

import { useMemo, useState } from "react";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { OperatorProfileNumberField } from "../../components/operatorProfileFields";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";
import { useOperatorProfile } from "../../components/useOperatorProfile";
import { useOperatorStage } from "../../components/useOperatorStage";
import { isPlannerSector } from "../../../lib/operatorProfile";
import { isOperatorStage, OPERATOR_STAGE_OPTIONS, operatorStageLabel } from "../../../lib/report/operatorStage";
import {
  buildRunwayPlan,
  formatRunwayPlanCompactBlock,
  type PlannerPosture,
  type PlannerSector,
} from "../../../lib/report/runwayPlanner";
import {
  describeMissingRunwayInputs,
  resolveRunwayPlannerRequest,
} from "../../../lib/report/runwayPlannerInputs";
import type { RegimeAssessment } from "../../../lib/regimeEngine";

const sectorOptions: Array<{ value: PlannerSector; label: string }> = [
  { value: "b2b-saas", label: "B2B SaaS" },
  { value: "consumer", label: "Consumer" },
  { value: "infrastructure", label: "Infrastructure" },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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

const selectClassName =
  "mt-1 min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-base text-[var(--app-text)]";

/**
 * Runway, burn, revenue, and growth come from the operator profile shared with
 * the plan stress tests, and the stage from the same cookie the brief reads.
 * Nothing is pre-filled: the planner used to open on a fictional company and
 * offer to copy its board memo, and a reader could not tell those numbers from
 * their own. Until the three required figures are entered it says what is
 * missing instead of sizing nobody's plan.
 */
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
  const { profile, setProfileField } = useOperatorProfile();
  const { stage, setStage } = useOperatorStage();
  const [showMethodology, setShowMethodology] = useState(false);
  const [showMemo, setShowMemo] = useState(false);

  const resolution = useMemo(() => resolveRunwayPlannerRequest(profile, stage), [profile, stage]);

  const output = useMemo(
    () =>
      resolution.ready
        ? buildRunwayPlan({
            ...resolution.request,
            regime: assessment.regime,
            posture: postureForPolicyPosture(assessment.policyAssessment.posture),
            tightnessScore: assessment.scores.tightness,
            riskAppetiteScore: assessment.scores.riskAppetite,
          })
        : null,
    [assessment.policyAssessment.posture, assessment.regime, assessment.scores.tightness, assessment.scores.riskAppetite, resolution],
  );

  const shareBlock = useMemo(() => (output ? formatRunwayPlanCompactBlock(output) : ""), [output]);
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy();
  const clipboardState = getClipboardUiState("runway-plan", { status, error, activeTarget, copiedTarget });
  const memoClipboardState = getClipboardUiState("budget-memo", { status, error, activeTarget, copiedTarget });
  const paybackStrictnessLevel = output ? Number.parseInt(output.decisionKnobs.paybackStrictnessLabel, 10) || 0 : 0;
  const paybackStrictnessState = strictnessLabel(paybackStrictnessLevel);

  const memoMarkdown = useMemo(() => {
    if (!output || !resolution.ready) return "";
    const baseRateVal = sensors?.baseRate?.valueLabel ?? sensors?.baseRate?.value ?? "N/A";
    const slopeVal = sensors?.curveSlope?.valueLabel ?? sensors?.curveSlope?.value ?? "N/A";
    const cpiVal = macroSeries?.cpi?.valueLabel ?? macroSeries?.cpi?.value ?? "N/A";
    const unempVal = macroSeries?.unemployment?.valueLabel ?? macroSeries?.unemployment?.value ?? "N/A";
    const bbbVal = macroSeries?.bbbSpread?.valueLabel ?? macroSeries?.bbbSpread?.value ?? "N/A";
    const postureStr = assessment.policyAssessment.posture === "RISK_ON" ? "Risk-On (Capital-Loose)" : assessment.policyAssessment.posture === "TRANSITION" ? "Transition (Caution)" : "Safety Mode (Capital-Tight)";
    const { request, growthAssumedFlat } = resolution;

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

## 2. Our Inputs
- **Runway**: ${request.runway} months
- **Monthly burn**: ${usd.format(request.burn)}
- **Monthly revenue**: ${usd.format(request.revenue)}
- **Monthly revenue growth**: ${growthAssumedFlat ? "not entered; assumed flat" : `${request.growthRate}%`}
- **Stage / sector**: ${stage ? operatorStageLabel(stage) : "Series A (default)"} · ${sectorOptions.find((option) => option.value === request.sector)?.label ?? request.sector}

## 3. Dynamic Guardrails & Bounded Rules
- **Capital Raising**: ${output.boundedRules.capitalRaising}
- **Burn Discipline**: ${output.boundedRules.burnDiscipline}

## 4. Macro Provenance & Citations
- **Base Interest Rate**: ${baseRateVal}% (Source: US Treasury)
- **Yield Curve Slope (10Y-2Y)**: ${slopeVal} (Source: US Treasury)
- **BBB Credit Spreads**: ${bbbVal}% (Source: FRED Moody's BBB Corporate Bond Yield Relative to 10Y Treasury)
- **CPI Inflation (YoY)**: ${cpiVal}% (Source: Bureau of Labor Statistics)
- **Unemployment Rate**: ${unempVal}% (Source: Bureau of Labor Statistics)

---
*Generated by Whether from the figures entered in the runway planner. Check the inputs above before circulating.*
`.trim();
  }, [assessment, sensors, macroSeries, recordDateLabel, output, paybackStrictnessLevel, resolution, stage]);

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
          {output ? (
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
          ) : null}
        </div>
        {showMethodology ? (
          <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-950/70 p-3 text-xs text-slate-300">
            Runway risk combines runway gap, burn multiple, growth, and the current market setting. The planner turns that pressure plus regime context into practical guidance for approval pace, payback discipline, and how reversible new commitments should be. Growth compounds monthly; with revenue at zero the burn multiple is treated as 4x.
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <OperatorProfileNumberField
          field="runwayMonths"
          label="Runway (months)"
          placeholder="e.g. 14"
          value={profile.runwayMonths}
          onCommit={(value) => setProfileField("runwayMonths", value)}
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <OperatorProfileNumberField
          field="monthlyBurnUsd"
          label="Monthly burn ($)"
          placeholder="e.g. $450k"
          value={profile.monthlyBurnUsd}
          onCommit={(value) => setProfileField("monthlyBurnUsd", value)}
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <OperatorProfileNumberField
          field="monthlyRevenueUsd"
          label="Monthly revenue ($)"
          placeholder="e.g. $300k, or 0"
          value={profile.monthlyRevenueUsd}
          onCommit={(value) => setProfileField("monthlyRevenueUsd", value)}
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <OperatorProfileNumberField
          field="monthlyGrowthPct"
          label="Monthly revenue growth (%)"
          hint="Month over month. Blank reads as flat."
          placeholder="e.g. 6"
          value={profile.monthlyGrowthPct}
          onCommit={(value) => setProfileField("monthlyGrowthPct", value)}
          optional
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <label className="weather-surface p-3 text-sm text-slate-200">
          Sector
          <select
            className={selectClassName}
            style={{ colorScheme: "light dark" }}
            value={profile.sector ?? "b2b-saas"}
            onChange={(event) => {
              if (isPlannerSector(event.target.value)) setProfileField("sector", event.target.value);
            }}
          >
            {sectorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Stage
          <select
            className={selectClassName}
            style={{ colorScheme: "light dark" }}
            value={stage ?? ""}
            onChange={(event) => setStage(isOperatorStage(event.target.value) ? event.target.value : null)}
          >
            <option value="">Not set · defaults to Series A</option>
            {OPERATOR_STAGE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-fluid-nano text-slate-500">Same stage as the weekly call.</span>
        </label>
      </div>

      {!resolution.ready || !output ? (
        <div className="weather-surface border-dashed p-4" aria-live="polite">
          <p className="text-sm text-slate-100">
            {resolution.ready ? "Sizing the plan…" : describeMissingRunwayInputs(resolution.missing)}
          </p>
          <p className="mt-1 text-fluid-xs text-slate-400">
            Your figures stay in this browser and are shared with the plan stress test. Nothing is sized until you enter them.
          </p>
        </div>
      ) : (
        <>
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
            {resolution.growthAssumedFlat ? (
              <p className="mt-3 text-fluid-xs text-slate-400">Growth was left blank, so revenue is held flat for the next six months.</p>
            ) : null}
          </div>

          {showMemo ? (
            <div className="weather-surface border-sky-500/25 bg-slate-950/60 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <p className="type-eyebrow text-sky-200">Generated board memo</p>
                  <p className="text-fluid-xs text-slate-400">Built from the figures above. Review before circulating.</p>
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
          ) : null}

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
        </>
      )}
    </section>
  );
}
