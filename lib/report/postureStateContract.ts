import type { RegimeAssessment, RegimeKey } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import type { PostureTransitionEvent } from "../storage/postureTransitionEventRepository";
import { resolvePublishedConfidence, type ConfidenceRecord } from "./confidence";
import { buildWeeklyLockCommitment } from "./decisionKnobs";
import { type RuleCondition } from "./boundedDecisionRules";
import { buildFlipThreshold } from "./reportEvidence";

export type PostureStateContract = {
  currentState: {
    regime: RegimeKey;
    postureLabel: string;
    confidenceLabel: "HIGH" | "MED" | "LOW";
    confidencePercent: number;
    transitionWatch: "ON" | "OFF";
    recordDate: string;
  };
  lastCommittedChangeEvent: {
    timestamp: string | null;
    fromState: RegimeKey | null;
    toState: RegimeKey;
    reason: string;
    source: "event-store" | "state-machine";
  };
  whatFlipsNext: {
    flipTrigger: string;
    thresholds: readonly string[];
    /** Numeric lines behind each `thresholds` entry, index-aligned. Absent on older fixtures. */
    thresholdLines?: readonly (readonly RuleCondition[])[];
    reversalConditions: readonly string[];
  };
  /**
   * Set while the state machine holds the published call behind its
   * confirmation gate: the readings classify as `candidate`, and the call has
   * not flipped. Null when the readings and the call agree. Consumers that
   * only read `currentState.regime` otherwise publish a call the machine has
   * already contradicted, with nothing in the contract to say so.
   */
  pendingTransition?: {
    candidate: RegimeKey;
    candidateLabel: string;
    /** Consecutive reads the candidate has held; two or more while pending means confidence is blocking. */
    pendingCount: number;
    reason: string;
  } | null;
};

/*
 * The confidence is the published one, from the record as well as the scores.
 * This contract used to rank the raw nearest gap itself, with the percent at 3
 * per point — the calibration from before the risk gap was put on the
 * tightness scale — so the APIs serving it, and every route whose brief model
 * preferred it, said Medium on a week the homepage said High.
 */
export const buildPostureStateContract = ({
  assessment,
  record,
  historical = false,
  postureLabel,
  decisionEventStore,
}: {
  assessment: RegimeAssessment;
  /** The record the assessment was read from: its date, and whether it is a fallback. */
  record: ConfidenceRecord & { record_date: string };
  historical?: boolean;
  postureLabel: string;
  decisionEventStore: PostureTransitionEvent[];
}): PostureStateContract => {
  const recordDate = record.record_date;
  const { label: confidenceLabel, percent: confidencePercent } = resolvePublishedConfidence({
    assessment,
    record,
    historical,
  });
  const lockCommitment = buildWeeklyLockCommitment({
    regime: assessment.regime,
    tightnessRegime: assessment.thresholds.tightnessRegime,
    riskAppetiteRegime: assessment.thresholds.riskAppetiteRegime,
    confidenceDegraded: confidenceLabel !== "HIGH",
    freshnessDegraded: false,
  });

  const latestEvent = decisionEventStore[0];
  const committedTransition = assessment.regimeTransition?.committed ? assessment.regimeTransition : null;
  const transition = assessment.regimeTransition;
  const pendingTransition =
    transition?.pending && transition.candidateState !== assessment.regime
      ? {
          candidate: transition.candidateState,
          candidateLabel: getRegimePublicLabel(transition.candidateState),
          pendingCount: transition.transitionPendingCount ?? 1,
          reason: transition.transitionReason,
        }
      : null;

  return {
    pendingTransition,
    currentState: {
      regime: assessment.regime,
      postureLabel,
      confidenceLabel,
      confidencePercent,
      transitionWatch: assessment.diagnostics.transitionWatch ? "ON" : "OFF",
      recordDate,
    },
    lastCommittedChangeEvent: latestEvent
      ? {
          timestamp: latestEvent.recordedAt,
          fromState: latestEvent.fromState,
          toState: latestEvent.toState,
          reason: latestEvent.reason,
          source: "event-store",
        }
      : {
          timestamp: committedTransition ? `${recordDate}T00:00:00.000Z` : null,
          fromState: null,
          toState: committedTransition?.candidateState ?? assessment.regime,
          reason: committedTransition?.transitionReason ?? "No change in conditions is on record.",
          source: "state-machine",
        },
    /* The trigger is the brief's own "Conditions change if" sentence, with each
       line's distance and today's reading, so the Slack post, the mandate and
       the agent views state the line the homepage does. */
    whatFlipsNext: {
      flipTrigger: buildFlipThreshold(assessment),
      thresholds: lockCommitment.flipConditions,
      thresholdLines: lockCommitment.flipLines,
      reversalConditions: lockCommitment.flipConditions.slice(1),
    },
  };
};
