import type { RegimeAssessment } from "../regimeEngine";
import type { buildHomeBriefModel } from "./homeBriefModel";
import type { CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import { buildFlipConditionsWithoutTriggerDuplication } from "./canonicalDecisionCopy";
import {
  buildScopedVariantDecisionAdjustment,
  type StartupVariantMode,
} from "./boundedDecisionRules";
import { POLICY_OVERRIDE_CALL } from "./reportCopy";

export type StageScopedAdjustment = {
  mode: StartupVariantMode;
  label: string;
  actionNow: string;
  pauseIf: string;
  changeCourseIf: string;
  doNowBullets: string[];
  thresholdEmphasis: string;
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
  stageScopedAdjustments?: Record<StartupVariantMode, StageScopedAdjustment>;
};

type HomeBriefModel = ReturnType<typeof buildHomeBriefModel>;

const FALLBACK_CURRENT_CALL = "Hold bounded operating discipline.";
const FALLBACK_PAUSE_IF = "Hold irreversible approvals until a live threshold is available; reversible approvals may continue.";
const FALLBACK_CHANGE_COURSE_IF = "Re-open approvals when confidence and trend stabilize.";

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
}: {
  assessment: RegimeAssessment;
  homeBriefModel: HomeBriefModel;
  canonicalDecisionCopy?: CanonicalDecisionCopy | null;
  startupVariantMode?: StartupVariantMode;
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

  // Build stage-scoped adjustment copy for every stage up front. These swap the
  // brief's decision bullets per selected stage; the macro regime call stays
  // stage-agnostic. Only the selected stage's copy feeds the primary contract.
  const buildStageAdjustment = (mode: StartupVariantMode, label: string): StageScopedAdjustment => {
    const adj = buildScopedVariantDecisionAdjustment({
      mode,
      thresholds: assessment.thresholds,
      scores: assessment.scores,
    });
    return {
      mode,
      label,
      actionNow: adj.doNowAdjustments[0] ?? FALLBACK_CURRENT_CALL,
      pauseIf: adj.watchAdjustments[0] ?? FALLBACK_PAUSE_IF,
      changeCourseIf: adj.reversalTriggerDiscipline ?? FALLBACK_CHANGE_COURSE_IF,
      doNowBullets: dedupeLines([...adj.doNowAdjustments, ...adj.avoidAdjustments], 3),
      thresholdEmphasis: adj.thresholdEmphasis,
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

  // Stage-scoped scaling: when an operator has picked a startup stage, swap the
  // brief's decision bullets for that stage's calibrated language while keeping
  // the macro regime call itself stage-agnostic. The adjustment lives on the
  // same contract and only changes what an operator can act on, not the signals.
  const stageAdj = startupVariantMode
    ? stageScopedAdjustments[startupVariantMode] ?? stageScopedAdjustments["series-a"]
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
          policyOverrideReason ? `Override reason: ${policyOverrideReason}` : undefined,
          "Keep approvals staged until policy disagreement clears.",
          ...defaultFlipConditionLabels,
        ],
        4,
      )
    : defaultFlipConditionLabels;
  const whyCouldBeWrong = policyOverrideActive
    ? "Policy composites disagree or signal coverage is incomplete; this week’s directional call may overstate conviction."
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
    stageScopedAdjustments,
  };
};
