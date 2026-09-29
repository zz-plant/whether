import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeDisplayLabel } from "../regimePresentation";
import {
  getPostureDecisionEventRepository,
  type PostureDecisionEvent,
  type PostureDecisionEventRepository,
} from "../storage/postureDecisionEventRepository";
import { resolvePublishedConfidence, type ConfidenceRecord } from "./confidence";
import { buildPostureStateContract, type PostureStateContract } from "./postureStateContract";
import type { ReportDynamics } from "./reportData";

/**
 * The committed-transition log, or nothing if it cannot be read.
 *
 * This log is supplementary: `buildPostureStateContract` already has a
 * first-class path for an empty store, reporting the last change from the state
 * machine instead. Letting a read failure propagate meant a durable-store
 * outage took down every page that renders the weekly brief — nine routes at
 * once, none of which needed the log to say anything true about posture.
 *
 * Reads are all this module does now. The write path that lived here —
 * `appendCommittedPostureEvent`, reachable only through the unconsumed
 * `POST /api/posture-state` — appended the same committed transition that
 * `refreshOperatingState` already appends inline on every cron run, guarded by
 * the same "previous snapshot names a different regime" condition.
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
  record,
  historical = false,
  assessment,
  reportDynamics,
  decisionEvents,
  repository = getPostureDecisionEventRepository(),
}: {
  /** The treasury record the assessment was read from. */
  record: ConfidenceRecord & { record_date: string };
  historical?: boolean;
  assessment: RegimeAssessment;
  reportDynamics: Pick<ReportDynamics, "directionLabel">;
  decisionEvents?: PostureDecisionEvent[];
  repository?: PostureDecisionEventRepository;
}) => {
  /* The published confidence, as the brief's own display label reads it, so
     the two labels cannot disagree about "Guarded". */
  const displayRegime = getRegimeDisplayLabel({
    regime: assessment.regime,
    momentum: reportDynamics.directionLabel,
    confidence: resolvePublishedConfidence({ assessment, record, historical }).label,
    transitionWatch: assessment.diagnostics.transitionWatch,
  });

  const listedEvents = decisionEvents ?? (await readDecisionEvents(repository));

  const postureState: PostureStateContract = buildPostureStateContract({
    assessment,
    record,
    historical,
    postureLabel: displayRegime.label,
    decisionEventStore: listedEvents,
  });

  return postureState;
};
