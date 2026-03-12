import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeDisplayLabel } from "../regimePresentation";
import { serverStore, type PostureDecisionEvent } from "../serverStore";
import { buildPostureStateContract, type PostureStateContract } from "./postureStateContract";
import type { ReportDynamics } from "./reportData";

const resolveDeterministicRecordedAt = ({
  recordDate,
  sourceIngestedAt,
}: {
  recordDate: string;
  sourceIngestedAt: string;
}) => {
  const parsed = Date.parse(sourceIngestedAt);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }

  return `${recordDate}T00:00:00.000Z`;
};

const buildIdempotencyKey = ({
  effectiveRecordDate,
  toState,
}: {
  effectiveRecordDate: string;
  toState: RegimeAssessment["regime"];
}) => `${effectiveRecordDate}:${toState}`;

export const appendCommittedPostureEvent = ({
  recordDate,
  sourceIngestedAt,
  assessment,
  previousRegime,
}: {
  recordDate: string;
  sourceIngestedAt: string;
  assessment: RegimeAssessment;
  previousRegime: PostureDecisionEvent["fromState"];
}) => {
  const idempotencyKey = buildIdempotencyKey({
    effectiveRecordDate: recordDate,
    toState: assessment.regime,
  });

  const duplicate = serverStore.snapshot.postureDecisionEvents.some((event) => event.idempotencyKey === idempotencyKey);
  const latest = serverStore.snapshot.postureDecisionEvents[0];
  if (duplicate || latest?.toState === assessment.regime) {
    return { appended: false as const };
  }

  const entry: PostureDecisionEvent = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : idempotencyKey,
    recordedAt: resolveDeterministicRecordedAt({
      recordDate,
      sourceIngestedAt,
    }),
    effectiveRecordDate: recordDate,
    idempotencyKey,
    fromState: previousRegime,
    toState: assessment.regime,
    reason: assessment.regimeTransition.transitionReason,
  };

  serverStore.save({
    ...serverStore.snapshot,
    postureDecisionEvents: [entry, ...serverStore.snapshot.postureDecisionEvents].slice(0, 64),
  });

  return { appended: true as const, event: entry };
};

export const buildPostureState = ({
  recordDate,
  assessment,
  reportDynamics,
  decisionEvents = serverStore.snapshot.postureDecisionEvents,
}: {
  recordDate: string;
  assessment: RegimeAssessment;
  reportDynamics: Pick<ReportDynamics, "directionLabel">;
  decisionEvents?: PostureDecisionEvent[];
}) => {
  const displayRegime = getRegimeDisplayLabel({
    regime: assessment.regime,
    momentum: reportDynamics.directionLabel,
    confidence: assessment.diagnostics.confidence,
    transitionWatch: assessment.diagnostics.transitionWatch,
  });

  const postureState: PostureStateContract = buildPostureStateContract({
    assessment,
    recordDate,
    postureLabel: displayRegime.label,
    decisionEventStore: decisionEvents,
  });

  return postureState;
};
