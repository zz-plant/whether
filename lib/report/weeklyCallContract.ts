import type { RegimeAssessment } from "../regimeEngine";
import type { buildHomeBriefModel } from "./homeBriefModel";
import type { CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import { buildFlipConditionsWithoutTriggerDuplication } from "./canonicalDecisionCopy";
import {
  buildScopedVariantDecisionAdjustment,
  type StartupVariantMode,
} from "./boundedDecisionRules";
import { DECISION_CONTRACT_LABELS, NO_LIVE_READING_CALL } from "./reportCopy";
import { describePolicyHold } from "./regimeDescription";

import { resolveRunwayBand, type RunwayBand } from "./operatorRunway";

type StageScopedAdjustment = {
  mode: StartupVariantMode;
  label: string;
  actionNow: string;
  pauseIf: string;
  /** The stage's resume discipline: when a hold this stage took may lift. Not a call change. */
  resumeWhen: string;
  doNowBullets: string[];
  thresholdEmphasis: string;
  /** Set only when the adjustment was scaled by a runway band; the hero badge reads it. */
  runwayLabel?: string;
};

export type WeeklyCallContract = {
  regimeStage: string;
  currentCall: string;
  actionNow: string;
  pauseIf: string;
  /**
   * Where the call itself changes: the regime flip trigger. Printed under
   * `DECISION_CONTRACT_LABELS.watch.postureFlips`. A stage never replaces it —
   * the macro call is company-agnostic.
   */
  callChangesIf: string;
  /**
   * Set only when a stage (or runway) is calibrated: that stage's discipline
   * for lifting a hold. Printed under `DECISION_CONTRACT_LABELS.reversal.resumeWhen`,
   * beside `callChangesIf`, never in its place. They used to share one field, so
   * setting a stage swapped the flip trigger out for a resume condition while
   * every surface kept labelling it "Call changes if".
   */
  resumeWhen?: string;
  doNowBullets: string[];
  flipConditionLabels: string[];
  whyCouldBeWrong: string;
  policyOverrideActive: boolean;
  policyOverrideReason: string | null;
  runwayBand?: RunwayBand;
  runwayLabel?: string;
  stageScopedAdjustments?: Record<StartupVariantMode, StageScopedAdjustment>;
};

type HomeBriefModel = ReturnType<typeof buildHomeBriefModel>;

/**
 * The call-change line and, when a stage set one, the resume line — each under
 * its own label. Every surface that prints the contract's reversal side reads
 * this, so the two cannot be merged back under one name by a renderer.
 */
export const weeklyCallChangeLines = (
  weeklyCall: Pick<WeeklyCallContract, "callChangesIf" | "resumeWhen">,
): Array<{ label: string; value: string }> => [
  { label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: weeklyCall.callChangesIf },
  ...(weeklyCall.resumeWhen
    ? [{ label: DECISION_CONTRACT_LABELS.reversal.resumeWhen, value: weeklyCall.resumeWhen }]
    : []),
];

const FALLBACK_CURRENT_CALL = NO_LIVE_READING_CALL.currentCall;
const FALLBACK_PAUSE_IF = NO_LIVE_READING_CALL.pauseIf;
const FALLBACK_CALL_CHANGES_IF = NO_LIVE_READING_CALL.callChangesIf;

const dedupeLines = (lines: Array<string | undefined>, maxItems = 4) =>
  lines
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line && line.length > 0))
    .filter((line, index, values) => values.indexOf(line) === index)
    .slice(0, maxItems);

const buildPolicyOverrideActionLines = (assessment: RegimeAssessment) => {
  const governance = assessment.policyAssessment.governanceParameters;
  const lines = [
    governance.approvalVelocity === "SLOWER_STRUCTURED"
      ? "Route approvals through slower structured review."
      : undefined,
    governance.rollbackRequirement === "REVERSIBLE_ONLY"
      ? "Keep new commitments reversible only."
      : governance.rollbackRequirement === "EXPLICIT_KILL_CRITERIA"
        ? "Require explicit kill criteria before scaling commitments."
        : undefined,
    governance.experimentationTolerance === "LOW"
      ? "Limit experiments to low-cost tests with fast feedback."
      : undefined,
    governance.hiringThreshold === "VERY_HIGH"
      ? "Hold net-new hiring unless the role is mission-critical."
      : undefined,
  ];

  return dedupeLines(lines, 3);
};

export const buildWeeklyCallContract = ({
  assessment,
  homeBriefModel,
  canonicalDecisionCopy,
  startupVariantMode,
  runwayMonths,
  runwayBand,
}: {
  assessment: RegimeAssessment;
  homeBriefModel: HomeBriefModel;
  canonicalDecisionCopy?: CanonicalDecisionCopy | null;
  startupVariantMode?: StartupVariantMode;
  runwayMonths?: number;
  runwayBand?: RunwayBand;
}): WeeklyCallContract => {
  const actionStripItems = homeBriefModel.actionStripItems ?? [];
  const policyOverrideActive = assessment.policyAssessment.refusal.refused;
  const policyOverrideReason = assessment.policyAssessment.refusal.reasons[0] ?? null;
  /* The held guidance for the reason this week is held, read only when it is. */
  const hold = describePolicyHold(assessment.policyAssessment.refusal);
  const regimeStage =
    canonicalDecisionCopy?.currentRegimeLabel
    ?? homeBriefModel.postureWithStageLabel
    ?? homeBriefModel.postureLabel;
  const defaultCurrentCall =
    canonicalDecisionCopy?.operatingCall
    ?? homeBriefModel.operatingStanceLine
    ?? FALLBACK_CURRENT_CALL;
  /* The week's action is the headline the page prints (`homeBriefModel.actionNowShort`,
     docs/claims-ledger.md). The lead area's rule led here until 2026-10-07, so every
     paste opened "Guidance: Limit hiring to backfills…" under a page, an embed and a
     share card that opened "Keep only the bets you can stop"; it is the first of the
     Do now lines below, where it always also was. */
  const defaultActionNow =
    homeBriefModel.actionNowShort?.trim()
    || canonicalDecisionCopy?.doNowLines[0]
    || actionStripItems[0]?.areaActionNow
    || defaultCurrentCall;
  const defaultPauseIf =
    actionStripItems[0]?.triggerThreshold
    ?? homeBriefModel.guardrailThreshold
    ?? homeBriefModel.guardrail
    ?? FALLBACK_PAUSE_IF;
  const defaultCallChangesIf =
    canonicalDecisionCopy?.flipTrigger
    ?? homeBriefModel.reversalTrigger
    ?? homeBriefModel.flipThreshold
    ?? homeBriefModel.compactFlipConditionLabels[0]
    ?? FALLBACK_CALL_CHANGES_IF;

  const currentCall = policyOverrideActive
    ? hold.currentCall
    : defaultCurrentCall;
  const actionNow = policyOverrideActive
    ? hold.actionNow
    : defaultActionNow;
  const pauseIf = policyOverrideActive
    ? hold.pauseIf
    : defaultPauseIf;
  const callChangesIf = policyOverrideActive
    ? hold.callChangesIf
    : defaultCallChangesIf;
  const doNowBullets = policyOverrideActive
    ? dedupeLines([actionNow, ...buildPolicyOverrideActionLines(assessment)], 3)
    : dedupeLines(
        canonicalDecisionCopy?.doNowLines.length
          ? canonicalDecisionCopy.doNowLines
          : [defaultActionNow, ...actionStripItems.map((item) => item.areaActionNow), homeBriefModel.guardrail],
        3,
      );
  const defaultFlipConditionLabels = canonicalDecisionCopy
    ? buildFlipConditionsWithoutTriggerDuplication({
        flipTrigger: callChangesIf,
        flipConditions: canonicalDecisionCopy.flipConditions,
      })
    : dedupeLines(
        [
          ...homeBriefModel.compactFlipConditionLabels,
        ],
        4,
      );
  const flipConditionLabels = policyOverrideActive
    ? dedupeLines(
        [
          /* Items, not sentences: the list prints joined with "; ", and a
             closing period read "the guidance.; Hold". */
          policyOverrideReason ? `Why the guidance is held: ${policyOverrideReason.replace(/\.\s*$/, "")}` : undefined,
          `Hold anything you can't undo until ${hold.holdsUntil}`,
          ...defaultFlipConditionLabels,
        ],
        4,
      )
    : defaultFlipConditionLabels;
  const whyCouldBeWrong = policyOverrideActive
    ? hold.whyCouldBeWrong
    : homeBriefModel.confidenceLabel === "HIGH"
      ? "The scores are clear of the change lines, but a signal can still reverse before next week's reading. Keep approvals staged until it confirms the guidance."
      : "A score is near its change line, so a small move could change conditions before next week's reading.";

  return applyStageToWeeklyCall(
    {
      regimeStage,
      currentCall,
      actionNow,
      pauseIf,
      callChangesIf,
      doNowBullets,
      flipConditionLabels,
      whyCouldBeWrong,
      policyOverrideActive,
      policyOverrideReason,
    },
    { assessment, startupVariantMode, runwayMonths, runwayBand },
  );
};

// Stage-scoped adjustment copy for every stage, scaled by runway if given. These
// swap the brief's decision bullets per selected stage and runway; the macro
// regime call stays company-agnostic.
const buildStageScopedAdjustments = ({
  assessment,
  runwayMonths,
  runwayBand,
}: {
  assessment: Pick<RegimeAssessment, "thresholds" | "scores">;
  runwayMonths?: number;
  runwayBand?: RunwayBand;
}): Record<StartupVariantMode, StageScopedAdjustment> => {
  const buildStageAdjustment = (mode: StartupVariantMode, label: string): StageScopedAdjustment => {
    const adj = buildScopedVariantDecisionAdjustment({
      mode,
      thresholds: assessment.thresholds,
      scores: assessment.scores,
      runwayMonths,
      runwayBand,
    });
    return {
      mode,
      label,
      actionNow: adj.doNowAdjustments[0] ?? FALLBACK_CURRENT_CALL,
      pauseIf: adj.watchAdjustments[0] ?? FALLBACK_PAUSE_IF,
      resumeWhen: adj.reversalTriggerDiscipline,
      doNowBullets: dedupeLines([...adj.doNowAdjustments, ...adj.avoidAdjustments], 3),
      thresholdEmphasis: adj.thresholdEmphasis,
      // Conditional so an uncalibrated contract survives a JSON round-trip
      // unchanged: the snapshot store compares what it reads back by deep
      // equality, and a key holding `undefined` does not.
      ...(adj.runwayLabel ? { runwayLabel: adj.runwayLabel } : {}),
    };
  };
  return {
    seed: buildStageAdjustment("seed", "Seed"),
    "series-a": buildStageAdjustment("series-a", "Series A"),
    "series-b": buildStageAdjustment("series-b", "Series B"),
    growth: buildStageAdjustment("growth", "Growth"),
    public: buildStageAdjustment("public", "Public"),
    bootstrapped: buildStageAdjustment("bootstrapped", "Bootstrapped"),
  };
};

/**
 * The reader's stage and runway, laid over a stage-agnostic call.
 *
 * Separate from `buildWeeklyCallContract` because the read path usually does
 * not build the call: it projects the stored `OperatingSnapshot`, whose call is
 * stage-agnostic by construction (the cron has no reader). Projecting it as-is
 * meant a reader who had chosen a stage got the stored action, pause and no
 * resume line whenever the store had a snapshot — every live read — and the
 * calibrated copy only when it did not. The stage adjustments depend on nothing
 * but the scores and thresholds, which the stored assessment carries, so they
 * are recomputed here and the stored call-change line is kept untouched.
 */
export const applyStageToWeeklyCall = (
  weeklyCall: WeeklyCallContract,
  {
    assessment,
    startupVariantMode,
    runwayMonths,
    runwayBand,
  }: {
    assessment: Pick<RegimeAssessment, "thresholds" | "scores">;
    startupVariantMode?: StartupVariantMode;
    runwayMonths?: number;
    runwayBand?: RunwayBand;
  },
): WeeklyCallContract => {
  const resolvedRunwayBand = resolveRunwayBand(runwayBand, runwayMonths) ?? undefined;
  const activeMode = startupVariantMode ?? (resolvedRunwayBand ? "series-a" : undefined);
  // Nothing calibrated: a stored call is returned exactly as stored, so the
  // projection stays deep-equal to what was persisted.
  if (!activeMode && weeklyCall.stageScopedAdjustments) return weeklyCall;

  const stageScopedAdjustments = buildStageScopedAdjustments({ assessment, runwayMonths, runwayBand });
  const stageAdj = activeMode
    ? stageScopedAdjustments[activeMode] ?? stageScopedAdjustments["series-a"]
    : undefined;
  const calibrated = stageAdj && !weeklyCall.policyOverrideActive
    ? {
        actionNow: stageAdj.actionNow,
        pauseIf: stageAdj.pauseIf,
        // A held call has one resume line, the override's own; a stage's
        // discipline would be a second, competing one.
        resumeWhen: stageAdj.resumeWhen,
        doNowBullets: dedupeLines(stageAdj.doNowBullets, 3),
      }
    : {};

  return {
    ...weeklyCall,
    ...calibrated,
    ...(resolvedRunwayBand ? { runwayBand: resolvedRunwayBand } : {}),
    ...(stageAdj?.runwayLabel ? { runwayLabel: stageAdj.runwayLabel } : {}),
    stageScopedAdjustments,
  };
};
