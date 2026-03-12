import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeDisplayLabel } from "../regimePresentation";
import {
  buildPostureDecisionEvent,
  getPostureDecisionEventRepository,
  type PostureDecisionEvent,
  type PostureDecisionEventRepository,
} from "../storage/postureDecisionEventRepository";
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

export const appendCommittedPostureEvent = async ({
  recordDate,
  sourceIngestedAt,
  assessment,
  previousRegime,
  repository = getPostureDecisionEventRepository(),
}: {
  recordDate: string;
  sourceIngestedAt: string;
  assessment: RegimeAssessment;
  previousRegime: PostureDecisionEvent["fromState"];
  repository?: PostureDecisionEventRepository;
}) => {
  const idempotencyKey = buildIdempotencyKey({
    effectiveRecordDate: recordDate,
    toState: assessment.regime,
  });

  const duplicate = await repository.findByIdempotencyKey(idempotencyKey);
  const latest = await repository.latest();
  if (duplicate || latest?.toState === assessment.regime) {
    return { appended: false as const, backend: repository.backendStatus() };
  }

  const entry = buildPostureDecisionEvent({
    recordedAt: resolveDeterministicRecordedAt({
      recordDate,
      sourceIngestedAt,
    }),
    effectiveRecordDate: recordDate,
    idempotencyKey,
    fromState: previousRegime,
    toState: assessment.regime,
    reason: assessment.regimeTransition?.transitionReason ?? "Transition committed without explicit reason.",
  });

  await repository.append(entry);

  return { appended: true as const, event: entry, backend: repository.backendStatus() };
};

export const buildPostureState = async ({
  recordDate,
  assessment,
  reportDynamics,
  decisionEvents,
  repository = getPostureDecisionEventRepository(),
}: {
  recordDate: string;
  assessment: RegimeAssessment;
  reportDynamics: Pick<ReportDynamics, "directionLabel">;
  decisionEvents?: PostureDecisionEvent[];
  repository?: PostureDecisionEventRepository;
}) => {
  const displayRegime = getRegimeDisplayLabel({
    regime: assessment.regime,
    momentum: reportDynamics.directionLabel,
    confidence: assessment.diagnostics.confidence,
    transitionWatch: assessment.diagnostics.transitionWatch,
  });

  const listedEvents = decisionEvents
    ? decisionEvents
    : (await repository.list({ limit: 64 })).events;

  const postureState: PostureStateContract = buildPostureStateContract({
    assessment,
    recordDate,
    postureLabel: displayRegime.label,
    decisionEventStore: listedEvents,
  });

  return postureState;
};
