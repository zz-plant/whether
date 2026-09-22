import type { RegimeAssessment } from "../regimeEngine";
import type { buildHomeBriefModel } from "./homeBriefModel";
import type { CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import { buildFlipConditionsWithoutTriggerDuplication } from "./canonicalDecisionCopy";
import {
  buildScopedVariantDecisionAdjustment,
  type StartupVariantMode,
} from "./boundedDecisionRules";
import { NO_LIVE_READING_CALL, POLICY_OVERRIDE_CALL } from "./reportCopy";

import { resolveRunwayBand, type RunwayBand } from "./operatorRunway";

type StageScopedAdjustment = {
  mode: StartupVariantMode;
  label: string;
  actionNow: string;
  pauseIf: string;
  changeCourseIf: string;
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
  changeCourseIf: string;
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

const FALLBACK_CURRENT_CALL = NO_LIVE_READING_CALL.currentCall;
const FALLBACK_PAUSE_IF = NO_LIVE_READING_CALL.pauseIf;
const FALLBACK_CHANGE_COURSE_IF = NO_LIVE_READING_CALL.changeCourseIf;

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
  const regimeStage =
    canonicalDecisionCopy?.currentRegimeLabel
    ?? homeBriefModel.postureWithStageLabel
    ?? homeBriefModel.postureLabel;
  const defaultCurrentCall =
    canonicalDecisionCopy?.operatingCall
    ?? homeBriefModel.operatingStanceLine
    ?? FALLBACK_CURRENT_CALL;
  const defaultActionNow =
    canonicalDecisionCopy?.doNowLines[0]
    ?? homeBriefModel.actionNowShort
    ?? actionStripItems[0]?.areaActionNow
    ?? defaultCurrentCall;
  const defaultPauseIf =
    actionStripItems[0]?.triggerThreshold
    ?? homeBriefModel.guardrailThreshold
    ?? homeBriefModel.guardrail
    ?? FALLBACK_PAUSE_IF;
  const defaultChangeCourseIf =
    canonicalDecisionCopy?.flipTrigger
    ?? homeBriefModel.reversalTrigger
    ?? homeBriefModel.flipThreshold
    ?? homeBriefModel.compactFlipConditionLabels[0]
    ?? FALLBACK_CHANGE_COURSE_IF;

  // Build stage-scoped adjustment copy for every stage up front, scaled by runway if given.
  // These swap the brief's decision bullets per selected stage and runway; the macro
  // regime call stays company-agnostic.
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
      changeCourseIf: adj.reversalTriggerDiscipline ?? FALLBACK_CHANGE_COURSE_IF,
      doNowBullets: dedupeLines([...adj.doNowAdjustments, ...adj.avoidAdjustments], 3),
      thresholdEmphasis: adj.thresholdEmphasis,
      // Conditional so an uncalibrated contract survives a JSON round-trip
      // unchanged: the snapshot store compares what it reads back by deep
      // equality, and a key holding `undefined` does not.
      ...(adj.runwayLabel ? { runwayLabel: adj.runwayLabel } : {}),
    };
  };
  const stageScopedAdjustments: Record<StartupVariantMode, StageScopedAdjustment> = {
    seed: buildStageAdjustment("seed", "Seed"),
    "series-a": buildStageAdjustment("series-a", "Series A"),
    "series-b": buildStageAdjustment("series-b", "Series B"),
    growth: buildStageAdjustment("growth", "Growth"),
    public: buildStageAdjustment("public", "Public"),
    bootstrapped: buildStageAdjustment("bootstrapped", "Bootstrapped"),
  };

  // Stage- and runway-scoped scaling: when an operator has calibrated stage or runway,
  // swap the brief's decision bullets for that calibrated language while keeping the
  // macro regime call itself unchanged.
  const resolvedRunwayBand = resolveRunwayBand(runwayBand, runwayMonths) ?? undefined;
  const activeMode = startupVariantMode ?? (resolvedRunwayBand ? "series-a" : undefined);
  const stageAdj = activeMode
    ? stageScopedAdjustments[activeMode] ?? stageScopedAdjustments["series-a"]
    : undefined;

  const currentCall = policyOverrideActive
    ? POLICY_OVERRIDE_CALL.currentCall
    : defaultCurrentCall;
  const actionNow = policyOverrideActive
    ? POLICY_OVERRIDE_CALL.actionNow
    : stageAdj?.actionNow ?? defaultActionNow;
  const pauseIf = policyOverrideActive
    ? POLICY_OVERRIDE_CALL.pauseIf
    : stageAdj?.pauseIf ?? defaultPauseIf;
  const changeCourseIf = policyOverrideActive
    ? POLICY_OVERRIDE_CALL.changeCourseIf
    : stageAdj?.changeCourseIf ?? defaultChangeCourseIf;
  const doNowBullets = policyOverrideActive
    ? dedupeLines([actionNow, ...buildPolicyOverrideActionLines(assessment)], 3)
    : stageAdj?.doNowBullets ? dedupeLines(stageAdj.doNowBullets, 3)
    : dedupeLines(
        canonicalDecisionCopy?.doNowLines.length
          ? canonicalDecisionCopy.doNowLines
          : [defaultActionNow, ...actionStripItems.map((item) => item.areaActionNow), homeBriefModel.guardrail],
        3,
      );
  const defaultFlipConditionLabels = canonicalDecisionCopy
    ? buildFlipConditionsWithoutTriggerDuplication({
        flipTrigger: changeCourseIf,
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
          policyOverrideReason ? `Why the call is held: ${policyOverrideReason}` : undefined,
          "Hold anything you can't undo until the two scores agree.",
          ...defaultFlipConditionLabels,
        ],
        4,
      )
    : defaultFlipConditionLabels;
  const whyCouldBeWrong = policyOverrideActive
    ? "The two scores disagree, or too many inputs are missing, so this week’s direction may be overstated."
    : homeBriefModel.confidenceLabel === "HIGH"
      ? "Even at high confidence, individual signals can reverse before the next weekly update. Keep approvals staged until the next data refresh confirms the call."
      : "Confidence is not high; near-threshold moves can reverse quickly and invalidate this week’s call.";

  return {
    regimeStage,
    currentCall,
    actionNow,
    pauseIf,
    changeCourseIf,
    doNowBullets,
    flipConditionLabels,
    whyCouldBeWrong,
    policyOverrideActive,
    policyOverrideReason,
    ...(resolvedRunwayBand ? { runwayBand: resolvedRunwayBand } : {}),
    ...(stageAdj?.runwayLabel ? { runwayLabel: stageAdj.runwayLabel } : {}),
    stageScopedAdjustments,
  };
};
