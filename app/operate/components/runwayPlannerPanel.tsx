"use client";

import { useCallback, useMemo, useState } from "react";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { paceLabel } from "../../../lib/report/paceLabels";
import { OperatorProfileNumberField } from "../../components/operatorProfileFields";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";
import { useOperatorProfile } from "../../components/useOperatorProfile";
import { useOperatorStage } from "../../components/useOperatorStage";
import { isPlannerSector } from "../../../lib/operatorProfile";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildSharedRunwayPlanQuery,
  readSharedRunwayPlan,
  resolveSharedRunwayProfile,
} from "./runwayPlanLink";
import { toRoute } from "../../../lib/navigation/routeType";
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

/**
 * A number against its scale, drawn.
 *
 * Every card in the planner is one of three shapes — a point on a 0–100 gauge,
 * a min–max band with the operator's own figure marked, or a point inside a
 * floor–ceiling range — and each used to be a sentence carrying three to five
 * numbers. The sentence stays under the bar as its caption.
 */
const RangeBar = ({
  min,
  max,
  band,
  point,
  marker,
  unit = "",
  tone = "sky",
  label,
}: {
  min: number;
  max: number;
  /** A shaded span, e.g. the safe runway band or the raise window. */
  band?: { from: number; to: number };
  /** The recommended or current value. */
  point?: number;
  /** A second value to compare against, e.g. the operator's own runway. */
  marker?: { value: number; label: string };
  unit?: string;
  tone?: "sky" | "emerald" | "amber" | "rose";
  label: string;
}) => {
  const span = max - min || 1;
  const pct = (value: number) => `${Math.min(100, Math.max(0, ((value - min) / span) * 100))}%`;
  const bandColor = { sky: "bg-sky-400/25", emerald: "bg-emerald-400/25", amber: "bg-amber-400/25", rose: "bg-rose-400/25" }[tone];
  const pointColor = { sky: "bg-sky-300", emerald: "bg-emerald-300", amber: "bg-amber-300", rose: "bg-rose-300" }[tone];
  const fmt = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`;
  return (
    <div className="mt-3" aria-label={label}>
      <div className="relative h-2 w-full rounded-full bg-slate-800/80">
        {band ? (
          <span
            className={`absolute inset-y-0 rounded-full ${bandColor}`}
            style={{ left: pct(band.from), width: `calc(${pct(band.to)} - ${pct(band.from)})` }}
          />
        ) : null}
        {typeof point === "number" ? (
          <span
            className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${pointColor} ring-2 ring-slate-950`}
            style={{ left: pct(point) }}
          />
        ) : null}
        {marker ? (
          <span
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 bg-slate-100"
            style={{ left: pct(marker.value) }}
          />
        ) : null}
      </div>
      <div className="mt-1 flex justify-between text-fluid-nano tabular-nums text-slate-500">
        <span>{fmt(min)}</span>
        {band ? <span className="text-slate-300">{fmt(band.from)}–{fmt(band.to)}</span> : null}
        {marker ? <span className="text-slate-100">{marker.label} {fmt(marker.value)}</span> : null}
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
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
  const { profile: storedProfile, setProfileField } = useOperatorProfile();
  const { stage: storedStage, setStage } = useOperatorStage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /*
   * Precedence stated once, in render, rather than resolved by whichever effect
   * runs last — the rule `thresholdsPanel` paid for. The link wins where it
   * speaks and the stored profile fills the rest, so following someone's plan
   * shows their figures without overwriting yours.
   */
  const shared = useMemo(() => readSharedRunwayPlan(searchParams), [searchParams]);
  const profile = useMemo(() => resolveSharedRunwayProfile(storedProfile, shared.profile), [storedProfile, shared.profile]);
  const stage = shared.stage ?? storedStage;

  /* Every edit writes both, so the address bar is always the plan on screen and
     "copy link" needs no separate button to keep in sync. */
  const syncPlanLink = useCallback(
    (nextProfile: typeof profile, nextStage: typeof stage) => {
      const query = buildSharedRunwayPlanQuery(nextProfile, nextStage);
      router.replace(toRoute(query ? `${pathname}?${query}` : pathname), { scroll: false });
    },
    [pathname, router],
  );

  const commitProfileField = useCallback(
    <K extends keyof typeof profile>(key: K, value: (typeof profile)[K] | undefined) => {
      setProfileField(key, value);
      syncPlanLink({ ...profile, [key]: value }, stage);
    },
    [profile, setProfileField, stage, syncPlanLink],
  );
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
    const conditions = getRegimePublicLabel(assessment.regime);
    const pace = paceLabel(assessment.policyAssessment.posture).toLowerCase();
    const { request, growthAssumedFlat } = resolution;

    return `
# Budget memo: planning against this week's call
**Date**: ${recordDateLabel}
**Conditions**: ${conditions} · Pace: ${pace}

## 1. Summary
Whether reads current conditions as **${conditions}**. On U.S. credit conditions and investor appetite, the pace this sets is **${pace}**.

This memo lines the budget and spending limits up with those conditions:
- **Runway risk**: ${output.runwayRisk.summary}
- **When to raise**: ${output.raiseTimingWindow.summary}
- **How far burn can move**: ${output.burnAdjustmentRange.summary}
- **Payback bar**: ${paybackStrictnessState.label.toLowerCase()} (${paybackStrictnessLevel} of 3).

## 2. Our Inputs
- **Runway**: ${request.runway} months
- **Monthly burn**: ${usd.format(request.burn)}
- **Monthly revenue**: ${usd.format(request.revenue)}
- **Monthly revenue growth**: ${growthAssumedFlat ? "not entered; assumed flat" : `${request.growthRate}%`}
- **Stage / sector**: ${stage ? operatorStageLabel(stage) : "Series A (default)"} · ${sectorOptions.find((option) => option.value === request.sector)?.label ?? request.sector}

## 3. The rules this sets
- **Fundraising**: ${output.boundedRules.capitalRaising}
- **Spending**: ${output.boundedRules.burnDiscipline}

## 4. Sources
- **Short-term borrowing rate**: ${baseRateVal}% (Source: US Treasury)
- **Recession warning gauge (10-year minus 2-year)**: ${slopeVal} (Source: US Treasury)
- **BBB Credit Spreads**: ${bbbVal}% (Source: FRED Moody's BBB Corporate Bond Yield Relative to 10Y Treasury)
- **CPI Inflation (YoY)**: ${cpiVal}% (Source: Bureau of Labor Statistics)
- **Unemployment Rate**: ${unempVal}% (Source: Bureau of Labor Statistics)

---
*Generated by Whether from the figures entered in the runway planner. Check the inputs above before circulating.*
`.trim();
  }, [assessment, sensors, macroSeries, recordDateLabel, output, paybackStrictnessLevel, paybackStrictnessState.label, resolution, stage]);

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

      <div id="ops-runway-inputs" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <OperatorProfileNumberField
          field="runwayMonths"
          label="Runway (months)"
          placeholder="e.g. 14"
          value={profile.runwayMonths}
          onCommit={(value) => commitProfileField("runwayMonths", value)}
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <OperatorProfileNumberField
          field="monthlyBurnUsd"
          label="Monthly burn ($)"
          placeholder="e.g. $450k"
          value={profile.monthlyBurnUsd}
          onCommit={(value) => commitProfileField("monthlyBurnUsd", value)}
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <OperatorProfileNumberField
          field="monthlyRevenueUsd"
          label="Monthly revenue ($)"
          placeholder="e.g. $300k, or 0"
          value={profile.monthlyRevenueUsd}
          onCommit={(value) => commitProfileField("monthlyRevenueUsd", value)}
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <OperatorProfileNumberField
          field="monthlyGrowthPct"
          label="Monthly revenue growth (%)"
          hint="Month over month. Blank reads as flat."
          placeholder="e.g. 6"
          value={profile.monthlyGrowthPct}
          onCommit={(value) => commitProfileField("monthlyGrowthPct", value)}
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
              if (isPlannerSector(event.target.value)) commitProfileField("sector", event.target.value);
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
            onChange={(event) => {
              const next = isOperatorStage(event.target.value) ? event.target.value : null;
              setStage(next);
              syncPlanLink(profile, next);
            }}
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

      {/* The same id on both branches, because exactly one of them is ever in the
          DOM and the nav chip that points here has to land somewhere either way.
          Before this, "Runway analysis" did nothing until figures were entered —
          which is the visit where a reader most needs to be told what is missing. */}
      {!resolution.ready || !output ? (
        <div id="ops-runway-risk" className="weather-surface border-dashed p-4" aria-live="polite">
          <p className="text-sm text-slate-100">
            {resolution.ready ? "Sizing the plan…" : describeMissingRunwayInputs(resolution.missing)}
          </p>
          <p className="mt-1 text-fluid-xs text-slate-400">
            Your figures stay in this browser and are shared with the plan stress test. Nothing is sized until you enter them.
          </p>
        </div>
      ) : (
        <>
          <div id="ops-runway-risk" className="grid gap-3 md:grid-cols-2">
            <article className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Runway risk</p>
              <p className="mt-2 flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl font-semibold text-slate-100">{output.runwayRisk.score}</span>
                <span className="text-sm text-slate-500">/100</span>
                <span className="text-sm text-slate-300">{output.runwayRisk.level}</span>
                <span className="ml-auto text-fluid-nano text-slate-400">
                  downside flip <span className="text-slate-200">{output.runwayRisk.macroRiskDownsideFlip}</span>
                </span>
              </p>
              <RangeBar
                min={0}
                max={100}
                band={{ from: output.runwayRisk.macroRiskBase, to: output.runwayRisk.macroRiskDownsideFlip }}
                point={output.runwayRisk.score}
                tone={output.runwayRisk.score >= 60 ? "rose" : output.runwayRisk.score >= 35 ? "amber" : "emerald"}
                label="Runway risk now and on a downside flip"
              />
              <p className="mt-2 text-fluid-xs text-slate-400">{output.runwayRisk.summary}</p>
            </article>
            <article className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Safe runway band</p>
              <p className="mt-2 flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl font-semibold text-slate-100">{output.safeRunwayBand.minMonths}–{output.safeRunwayBand.maxMonths}</span>
                <span className="text-sm text-slate-500">months</span>
                <span className={`ml-auto text-fluid-nano ${resolution.request.runway < output.safeRunwayBand.minMonths ? "text-semantic-caution-fg" : "text-slate-400"}`}>
                  yours <span className="text-slate-100">{resolution.request.runway}</span>
                </span>
              </p>
              <RangeBar
                min={0}
                max={Math.max(output.safeRunwayBand.maxMonths, resolution.request.runway) + 6}
                band={{ from: output.safeRunwayBand.minMonths, to: output.safeRunwayBand.maxMonths }}
                marker={{ value: resolution.request.runway, label: "yours" }}
                unit="mo"
                tone="emerald"
                label="Safe runway band against your runway"
              />
              <p className="mt-2 text-fluid-xs text-slate-400">{output.safeRunwayBand.summary}</p>
            </article>
            <article className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Raise timing window</p>
              <p className="mt-2 flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl font-semibold text-slate-100">
                  month {output.raiseTimingWindow.startMonth}–{output.raiseTimingWindow.endMonth}
                </span>
                <span className="ml-auto text-fluid-nano text-slate-400">
                  safe runway in <span className="text-slate-100">{output.raiseTimingWindow.timeToSafeRunwayTargetMonths} mo</span>
                </span>
              </p>
              <RangeBar
                min={0}
                max={Math.max(output.raiseTimingWindow.endMonth, output.raiseTimingWindow.timeToSafeRunwayTargetMonths, resolution.request.runway) + 3}
                band={{ from: output.raiseTimingWindow.startMonth, to: output.raiseTimingWindow.endMonth }}
                marker={{ value: resolution.request.runway, label: "runway ends" }}
                point={output.raiseTimingWindow.timeToSafeRunwayTargetMonths}
                unit="mo"
                tone="sky"
                label="Raise window against runway"
              />
              <p className="mt-2 text-fluid-xs text-slate-400">{output.raiseTimingWindow.summary}</p>
            </article>
            <article className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Burn adjustment range</p>
              <p className="mt-2 flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl font-semibold text-slate-100">
                  {output.burnAdjustmentRange.recommendedDeltaPercent > 0 ? "+" : ""}
                  {output.burnAdjustmentRange.recommendedDeltaPercent}%
                </span>
                <span className="text-sm text-slate-500">
                  within {output.burnAdjustmentRange.floorPercent}% to {output.burnAdjustmentRange.ceilingPercent > 0 ? "+" : ""}{output.burnAdjustmentRange.ceilingPercent}%
                </span>
              </p>
              <RangeBar
                min={-Math.max(Math.abs(output.burnAdjustmentRange.floorPercent), Math.abs(output.burnAdjustmentRange.ceilingPercent), 10) - 5}
                max={Math.max(Math.abs(output.burnAdjustmentRange.floorPercent), Math.abs(output.burnAdjustmentRange.ceilingPercent), 10) + 5}
                band={{ from: output.burnAdjustmentRange.floorPercent, to: output.burnAdjustmentRange.ceilingPercent }}
                point={output.burnAdjustmentRange.recommendedDeltaPercent}
                marker={{ value: 0, label: "hold" }}
                unit="%"
                tone={output.burnAdjustmentRange.recommendedDeltaPercent < 0 ? "amber" : "sky"}
                label="Recommended burn change inside its range"
              />
              <p className="mt-2 text-fluid-xs text-slate-400">{output.burnAdjustmentRange.summary}</p>
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
            <div id="ops-board-memo" className="weather-surface border-sky-500/25 bg-slate-950/60 p-5 space-y-4">
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
              <pre className="max-h-72 overflow-y-auto overscroll-contain whitespace-pre-wrap rounded bg-slate-950/90 p-3 font-mono text-[11px] leading-relaxed text-slate-300 border border-slate-900">
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
