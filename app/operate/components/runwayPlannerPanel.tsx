"use client";

import { useCallback, useMemo, useState } from "react";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { OperatorProfileNumberField } from "../../components/operatorProfileFields";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";
import { useOperatorProfile } from "../../components/useOperatorProfile";
import { useOperatorStage } from "../../components/useOperatorStage";
import { useHydrated } from "../../components/browserSource";
import { isPlannerSector, resolveProfileRunway, setOperatorProfileField } from "../../../lib/operatorProfile";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildSharedRunwayPlanQuery,
  plannerEditStands,
  readSharedRunwayPlan,
  resolveSharedRunwayProfile,
} from "./runwayPlanLink";
import { buildBudgetMemoMarkdown } from "./budgetMemo";
import { toRoute } from "../../../lib/navigation/routeType";
import { isOperatorStage, OPERATOR_STAGE_OPTIONS, operatorStageLabel } from "../../../lib/report/operatorStage";
import {
  buildRunwayPlan,
  describeRunwayPlanInYourNumbers,
  formatRunwayPlanCompactBlock,
  type PlannerPosture,
  type PlannerSector,
} from "../../../lib/report/runwayPlanner";
import {
  CASH_FLOW_POSITIVE_PLANNER_NOTE,
  describeMissingRunwayInputs,
  resolveRunwayPlannerRequest,
} from "../../../lib/report/runwayPlannerInputs";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import type { ReportData } from "../../../lib/report/reportData";
import { ScoreCell } from "../../components/ui/scoreCell";
import { buildEngineeringPaybackLines, buildProjectPaybacks, resolvePaybackBar } from "../../../lib/report/projectPayback";
import { runwayBandForMonths } from "../../../lib/report/operatorRunway";
import { ProjectPaybackSection } from "./projectPaybackSection";

const sectorOptions: Array<{ value: PlannerSector; label: string }> = [
  { value: "b2b-saas", label: "B2B SaaS" },
  { value: "consumer", label: "Consumer" },
  { value: "infrastructure", label: "Infrastructure" },
];

const strictnessLabel = (value: number) => {
  if (value <= 0) return { label: "Relaxed", tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" };
  if (value === 1) return { label: "Cautious", tone: "border-slate-600/60 bg-slate-800/40 text-slate-100" };
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
  tone = "ink",
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
  /** "ink" for a neutral figure: the action colour is for controls (ui-ux-standards §XXVII). */
  tone?: "ink" | "emerald" | "amber" | "rose";
  label: string;
}) => {
  const span = max - min || 1;
  const pct = (value: number) => `${Math.min(100, Math.max(0, ((value - min) / span) * 100))}%`;
  const bandColor = { ink: "bg-slate-300/25", emerald: "bg-emerald-400/25", amber: "bg-amber-400/25", rose: "bg-rose-400/25" }[tone];
  const pointColor = { ink: "bg-slate-300", emerald: "bg-emerald-300", amber: "bg-amber-300", rose: "bg-rose-300" }[tone];
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
 * Cash (or runway), spend, revenue, and growth come from the operator profile shared with
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
  sensors?: ReportData["sensors"];
  macroSeries?: ReportData["macroSeries"];
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
  const linkedProfile = useMemo(() => resolveSharedRunwayProfile(storedProfile, shared.profile), [storedProfile, shared.profile]);

  /*
   * The plan as last edited here, until the address bar catches up with it.
   * `router.replace` lands a server round trip after the edit, and until then
   * the link still holds the plan before it. Read back as "the link wins", that
   * older link was the base the next edit was built on, so a second field typed
   * inside the round trip wrote the first one back to its old value — in the
   * stored profile's place, permanently, because the link wins (2026-10-13,
   * found when a project row's fields went missing one after another).
   *
   * `plannerEditStands` says when the address bar has caught up, or been
   * replaced by someone else's link.
   */
  const currentQuery = searchParams?.toString() ?? "";
  const [ownEdit, setOwnEdit] = useState<{
    profile: typeof linkedProfile;
    stage: typeof storedStage;
    queries: readonly string[];
  } | null>(null);
  if (ownEdit && !plannerEditStands(ownEdit.queries, currentQuery)) setOwnEdit(null);
  const profile = ownEdit?.profile ?? linkedProfile;
  const stage = ownEdit ? ownEdit.stage : shared.stage ?? storedStage;

  /* Every edit writes both, so the address bar is always the plan on screen and
     "copy link" needs no separate button to keep in sync. */
  const syncPlanLink = useCallback(
    (nextProfile: typeof profile, nextStage: typeof stage) => {
      const query = buildSharedRunwayPlanQuery(nextProfile, nextStage);
      setOwnEdit((previous) => ({
        profile: nextProfile,
        stage: nextStage,
        queries: [...(previous?.queries ?? [currentQuery]), query],
      }));
      router.replace(toRoute(query ? `${pathname}?${query}` : pathname), { scroll: false });
    },
    [currentQuery, pathname, router, setOwnEdit],
  );

  const commitProfileField = useCallback(
    <K extends keyof typeof profile>(key: K, value: (typeof profile)[K] | undefined) => {
      setProfileField(key, value);
      // Through the profile's own setter, so cash and a typed runway replace each other in the link too.
      syncPlanLink(setOperatorProfileField(profile, key, value), stage);
    },
    [profile, setProfileField, stage, syncPlanLink],
  );

  const resolution = useMemo(() => resolveRunwayPlannerRequest(profile, stage), [profile, stage]);
  const runway = useMemo(() => resolveProfileRunway(profile), [profile]);

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

  /* Dates count forward from today, so they wait for the browser: a shared
     link renders this panel on the server, whose today can be another month. */
  const hydrated = useHydrated();
  const inYourNumbers = useMemo(
    () =>
      output && resolution.ready && hydrated
        ? describeRunwayPlanInYourNumbers(output, resolution.request, new Date(), {
            raiseAtRunwayMonths: profile.raiseAtRunwayMonths,
            hiringPauseAtRunwayMonths: profile.hiringPauseAtRunwayMonths,
          })
        : null,
    [output, resolution, hydrated, profile.raiseAtRunwayMonths, profile.hiringPauseAtRunwayMonths],
  );

  /* The planner's projects against the bar the published rules set for this
     week's conditions and this runway. Net burn is spend less revenue, the
     figure the runway itself is counted in. */
  const projectPayback = useMemo(() => {
    if (!resolution.ready) return null;
    const { runway, burn, revenue } = resolution.request;
    const bar = resolvePaybackBar(assessment.regime, runwayBandForMonths(runway));
    const paybacks = buildProjectPaybacks(profile.paybackProjects ?? [], {
      regime: assessment.regime,
      runwayMonths: runway,
      netMonthlyBurnUsd: burn - revenue,
      engineerWeekCostUsd: profile.engineerWeekCostUsd,
    });
    return { bar, paybacks, lines: buildEngineeringPaybackLines(paybacks, bar, assessment.regime) };
  }, [assessment.regime, profile.engineerWeekCostUsd, profile.paybackProjects, resolution]);

  const shareBlock = useMemo(
    () => (output ? formatRunwayPlanCompactBlock(output, inYourNumbers, projectPayback?.lines) : ""),
    [output, inYourNumbers, projectPayback],
  );
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({ commitment: "copied_brief" });
  const clipboardState = getClipboardUiState("runway-plan", { status, error, activeTarget, copiedTarget });
  const memoClipboardState = getClipboardUiState("budget-memo", { status, error, activeTarget, copiedTarget });
  /* The level comes through as a number; the label is display copy, never something to parse back. */
  const paybackStrictnessLevel = output ? output.decisionKnobs.paybackStrictnessLevel : 0;
  const paybackStrictnessState = strictnessLabel(paybackStrictnessLevel);

  const memoMarkdown = useMemo(() => {
    if (!output || !resolution.ready) return "";
    const { request, growthAssumedFlat } = resolution;
    return buildBudgetMemoMarkdown({
      assessment,
      sensors,
      macroSeries,
      recordDateLabel,
      output,
      request,
      growthAssumedFlat,
      paybackStrictness: { level: paybackStrictnessLevel, label: paybackStrictnessState.label },
      stageLabel: stage ? operatorStageLabel(stage) : "Series A (default)",
      sectorLabel: sectorOptions.find((option) => option.value === request.sector)?.label ?? request.sector,
      inYourNumbers,
      engineering: projectPayback?.lines ?? null,
    });
  }, [assessment, sensors, macroSeries, recordDateLabel, output, paybackStrictnessLevel, paybackStrictnessState.label, resolution, stage, inYourNumbers, projectPayback]);

  return (
    <section className="weather-panel-static mt-6 space-y-4 p-6" aria-label="Runway planner">
      <div>
        {/* No heading or intro of its own: the page's h1 is "Runway planner", and
            the intro under it says what the planner sizes against. An h3 gave the
            outline the same name twice, and a "Runway and burn" paragraph said the
            intro's sentence again directly under it (2026-10-09). */}
        {/* Native disclosure: the method is evidence for the figures below,
            and its open state is nobody else's business, so no query key. */}
        <details className="weather-auto-chevron">
          <summary className="text-xs font-semibold text-slate-200">
            How is this calculated?
          </summary>
          <p className="rounded-md border border-slate-700/70 bg-slate-950/70 p-3 text-xs text-slate-300">
            Runway risk scores your runway against the safe band, your burn against revenue growth, and this week&apos;s conditions. Growth compounds monthly. The burn multiple is spend over revenue. It reads as 4x with no revenue and never goes above 4x, so earning something never scores worse than earning nothing.
          </p>
        </details>
      </div>

      {/* Cash first: it is the figure a founder can read off a bank app, and
          runway is worked out from it. A runway typed in still works, and
          typing either replaces the other (`setOperatorProfileField`). */}
      <div id="ops-runway-inputs" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <OperatorProfileNumberField
          field="cashUsd"
          label="Cash in the bank ($)"
          hint="Runway is worked out from it."
          placeholder="e.g. $2.1M"
          value={profile.cashUsd}
          onCommit={(value) => commitProfileField("cashUsd", value)}
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <OperatorProfileNumberField
          field="runwayMonths"
          label="Runway (months)"
          hint={
            runway?.basis === "cash"
              ? "Worked out: cash over spend less revenue. Typing a figure replaces the cash."
              : runway?.basis === "cash-flow-positive"
                ? "Revenue covers your spending, so no runway is counting down."
                : "Or leave blank and enter cash: it is worked out for you."
          }
          placeholder="e.g. 14"
          value={runway && runway.basis !== "cash-flow-positive" ? runway.months : undefined}
          onCommit={(value) => commitProfileField("runwayMonths", value)}
          className="weather-surface p-3"
          labelClassName="block text-sm text-slate-200"
        />
        <OperatorProfileNumberField
          field="monthlyBurnUsd"
          label="Monthly spend ($)"
          hint="Everything going out a month, before revenue."
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
          <span className="mt-1 block text-fluid-nano text-slate-500">Same stage as the weekly guidance.</span>
        </label>
      </div>

      {/* The same id on both branches, because exactly one of them is ever in the
          DOM and the nav chip that points here has to land somewhere either way.
          Before this, "Runway analysis" did nothing until figures were entered —
          which is the visit where a reader most needs to be told what is missing. */}
      {!resolution.ready || !output ? (
        <div id="ops-runway-risk" className="weather-surface !border-dashed p-4" aria-live="polite">
          <p className="text-sm text-slate-100">
            {resolution.ready
              ? "Sizing the plan…"
              : resolution.cashFlowPositive
                ? CASH_FLOW_POSITIVE_PLANNER_NOTE
                : describeMissingRunwayInputs(resolution.missing)}
          </p>
          <p className="mt-1 text-fluid-xs text-slate-400">
            Your figures stay in this browser and are shared with the plan stress test.
          </p>
        </div>
      ) : (
        <>
          <div id="ops-runway-risk" className="grid gap-3 md:grid-cols-2">
            <article className="weather-surface p-4">
              {/* The score with its reference: the line it is judged against here
                  is where it would sit if conditions worsened, which is the one
                  the planner computes. No last week — the planner has none. */}
              <ScoreCell
                label="Runway risk"
                value={output.runwayRisk.score}
                line={{ value: output.runwayRisk.macroRiskDownsideFlip, label: "If conditions worsen" }}
                previous={null}
              >
                <dt className="text-slate-400">Level</dt>
                <dd className="text-slate-300">{output.runwayRisk.level}</dd>
              </ScoreCell>
              <RangeBar
                min={0}
                max={100}
                band={{ from: output.runwayRisk.macroRiskBase, to: output.runwayRisk.macroRiskDownsideFlip }}
                point={output.runwayRisk.score}
                tone={output.runwayRisk.score >= 60 ? "rose" : output.runwayRisk.score >= 35 ? "amber" : "emerald"}
                label="Runway risk now and if conditions worsen"
              />
              <p className="mt-2 text-fluid-xs text-slate-400">{output.runwayRisk.summary}</p>
            </article>
            <article className="weather-surface p-4">
              <p className="text-xs font-semibold text-slate-400">Safe runway band</p>
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
              {inYourNumbers?.floorGap ? (
                <p data-testid="planner-floor-gap" className="mt-2 text-fluid-xs text-semantic-caution-fg">{inYourNumbers.floorGap}</p>
              ) : null}
            </article>
            <article className="weather-surface p-4">
              <p className="text-xs font-semibold text-slate-400">Raise timing window</p>
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
                tone="ink"
                label="Raise window against runway"
              />
              {inYourNumbers ? (
                <p data-testid="planner-raise-dates" className="mt-2 text-sm text-slate-100">
                  {inYourNumbers.raiseWindow}
                  {inYourNumbers.runsOut ? ` ${inYourNumbers.runsOut}` : null}
                </p>
              ) : null}
              <p className="mt-2 text-fluid-xs text-slate-400">{output.raiseTimingWindow.summary}</p>
            </article>
            <article className="weather-surface p-4">
              <p className="text-xs font-semibold text-slate-400">Burn adjustment range</p>
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
                tone={output.burnAdjustmentRange.recommendedDeltaPercent < 0 ? "amber" : "ink"}
                label="Recommended burn change inside its range"
              />
              {inYourNumbers?.burnChange ? (
                <p data-testid="planner-burn-dollars" className="mt-2 text-sm text-slate-100">{inYourNumbers.burnChange}</p>
              ) : null}
              <p className="mt-2 text-fluid-xs text-slate-400">{output.burnAdjustmentRange.summary}</p>
              <p className={`mt-3 inline-flex rounded-sm border px-2 py-1 text-xs font-semibold ${paybackStrictnessState.tone}`}>
                Payback bar: {paybackStrictnessState.label.toLowerCase()}
              </p>
            </article>
          </div>

          {/* The company's own lines on its own runway, agreed before they are
              needed. The published lines say when the market changes the plan;
              these say when the company's cash does, and the month that is. */}
          <section id="ops-runway-lines" aria-labelledby="ops-runway-lines-heading" className="weather-surface space-y-3 p-4">
            <div>
              <p id="ops-runway-lines-heading" className="text-xs font-semibold text-slate-400">Your own runway lines</p>
              <p className="mt-1 text-fluid-xs text-slate-400">
                Agree them now, while nothing is urgent. Each gets the month it arrives at today&apos;s net burn, and
                travels with the link and the memo.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <OperatorProfileNumberField
                field="raiseAtRunwayMonths"
                label="Start raising at (months of runway)"
                placeholder="e.g. 12"
                value={profile.raiseAtRunwayMonths}
                onCommit={(value) => commitProfileField("raiseAtRunwayMonths", value)}
                optional
              />
              <OperatorProfileNumberField
                field="hiringPauseAtRunwayMonths"
                label="Pause hiring at (months of runway)"
                placeholder="e.g. 9"
                value={profile.hiringPauseAtRunwayMonths}
                onCommit={(value) => commitProfileField("hiringPauseAtRunwayMonths", value)}
                optional
              />
            </div>
            {inYourNumbers && inYourNumbers.ownLines.length > 0 ? (
              <ul data-testid="planner-own-lines" aria-live="polite" className="space-y-1 text-sm text-slate-100">
                {inYourNumbers.ownLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </section>

          {projectPayback ? (
            <ProjectPaybackSection
              regime={assessment.regime}
              bar={projectPayback.bar}
              runwayMonths={resolution.request.runway}
              engineerWeekCostUsd={profile.engineerWeekCostUsd}
              entries={profile.paybackProjects ?? []}
              paybacks={projectPayback.paybacks}
              scores={{ tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite }}
              changeLines={{ tightness: assessment.thresholds.tightnessRegime, riskAppetite: assessment.thresholds.riskAppetiteRegime }}
              onEngineerWeekCostChange={(value) => commitProfileField("engineerWeekCostUsd", value)}
              onEntriesChange={(next) => commitProfileField("paybackProjects", next)}
            />
          ) : null}

          <div className="weather-surface p-4">
            <p className="text-xs font-semibold text-slate-400">The rules this sets</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>• {output.boundedRules.capitalRaising}</li>
              <li>• {output.boundedRules.burnDiscipline}</li>
            </ul>
            {resolution.growthAssumedFlat ? (
              <p className="mt-3 text-fluid-xs text-slate-400">Growth was left blank, so revenue is held flat for the next six months.</p>
            ) : null}
          </div>

          <details id="ops-board-memo" className="weather-surface weather-auto-chevron p-5">
            <summary className="text-xs font-semibold text-slate-200">
              Budget memo
            </summary>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <p className="text-fluid-xs text-slate-400">Built from the figures above. Check them before you send it.</p>
                <ClipboardActionRow
                  label="Copy memo"
                  state={memoClipboardState}
                  onClick={() => {
                    void copyToClipboard(memoMarkdown, "budget-memo");
                  }}
                  compact
                />
              </div>
              <pre className="max-h-72 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded bg-slate-950/90 p-3 font-mono text-fluid-xs leading-relaxed text-slate-300 border border-slate-900">
                {memoMarkdown}
              </pre>
            </div>
          </details>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Copy this block into Slack or a note.</p>
            <ClipboardActionRow
              label="Copy block"
              state={clipboardState}
              onClick={() => {
                void copyToClipboard(shareBlock, "runway-plan");
              }}
              compact
            />
          </div>
        </>
      )}
    </section>
  );
}
