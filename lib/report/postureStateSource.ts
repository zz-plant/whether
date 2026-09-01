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

/**
 * The committed-transition log, or nothing if it cannot be read.
 *
 * This log is supplementary: `buildPostureStateContract` already has a
 * first-class path for an empty store, reporting the last change from the state
 * machine instead. Letting a read failure propagate meant a durable-store
 * outage took down every page that renders the weekly brief — nine routes at
 * once, none of which needed the log to say anything true about posture.
 *
 * Only reads degrade. `appendCommittedPostureEvent` still fails loudly, because
 * it decides whether to append by first reading; treating a failed read as "no
 * event found" there would write duplicate transitions into a durable log.
 */
const readDecisionEvents = async (
  repository: PostureDecisionEventRepository,
): Promise<PostureDecisionEvent[]> => {
  try {
    return (await repository.list({ limit: 64 })).events;
  } catch (error) {
    console.warn(
      `[postureState] Decision event store unavailable (${
        error instanceof Error ? error.message : String(error)
      }); reporting the last change from the state machine instead.`,
    );
    return [];
  }
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

  const listedEvents = decisionEvents ?? (await readDecisionEvents(repository));

  const postureState: PostureStateContract = buildPostureStateContract({
    assessment,
    recordDate,
    postureLabel: displayRegime.label,
    decisionEventStore: listedEvents,
  });

  return postureState;
};
