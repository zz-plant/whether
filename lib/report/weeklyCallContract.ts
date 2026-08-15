import type { RegimeAssessment } from "../regimeEngine";
import type { buildHomeBriefModel } from "./homeBriefModel";
import type { CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import { buildFlipConditionsWithoutTriggerDuplication } from "./canonicalDecisionCopy";

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
}: {
  assessment: RegimeAssessment;
  homeBriefModel: HomeBriefModel;
  canonicalDecisionCopy?: CanonicalDecisionCopy | null;
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

  const currentCall = policyOverrideActive
    ? "Hold posture changes and keep approvals reversible until policy signals reconcile."
    : defaultCurrentCall;
  const actionNow = policyOverrideActive
    ? "Slow approvals, require reversible bets, and cap new experiments until disagreement clears."
    : defaultActionNow;
  const pauseIf = policyOverrideActive
    ? "Pause irreversible approvals while the policy override remains active."
    : defaultPauseIf;
  const changeCourseIf = policyOverrideActive
    ? "Resume normal posture changes only after policy disagreement clears and the weekly flip thresholds recover."
    : defaultChangeCourseIf;
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
  };
};
