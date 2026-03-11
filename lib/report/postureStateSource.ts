import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeDisplayLabel } from "../regimePresentation";
import { serverStore, type PostureDecisionEvent } from "../serverStore";
import type { ReportDynamics } from "./reportData";
import { buildPostureStateContract, type PostureStateContract } from "./postureStateContract";

export const recordCommittedPostureDecisionEvent = ({
  recordDate,
  assessment,
  reportDynamics,
  previousRegime,
}: {
  recordDate: string;
  assessment: RegimeAssessment;
  reportDynamics: Pick<ReportDynamics, "directionLabel">;
  previousRegime: PostureDecisionEvent["fromState"];
}) => {
  const displayRegime = getRegimeDisplayLabel({
    regime: assessment.regime,
    momentum: reportDynamics.directionLabel,
    confidence: assessment.diagnostics.confidence,
    transitionWatch: assessment.diagnostics.transitionWatch,
  });

  if (assessment.regimeTransition.committed) {
    const latest = serverStore.snapshot.postureDecisionEvents[0];
    const duplicate = latest && latest.effectiveRecordDate === recordDate && latest.toState === assessment.regime;

    if (!duplicate) {
      const entry: PostureDecisionEvent = {
        id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
        recordedAt: new Date().toISOString(),
        effectiveRecordDate: recordDate,
        fromState: previousRegime,
        toState: assessment.regime,
        reason: assessment.regimeTransition.transitionReason,
      };

      serverStore.save({
        ...serverStore.snapshot,
        postureDecisionEvents: [entry, ...serverStore.snapshot.postureDecisionEvents].slice(0, 64),
      });
    }
  }

  const postureState: PostureStateContract = buildPostureStateContract({
    assessment,
    recordDate,
    postureLabel: displayRegime.label,
    decisionEventStore: serverStore.snapshot.postureDecisionEvents,
  });

  return postureState;
};
