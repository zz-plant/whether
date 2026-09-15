import type { RegimeAssessment, RegimeKey } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import type { PostureDecisionEvent } from "../storage/postureDecisionEventRepository";
import { buildWeeklyLockCommitment } from "./decisionKnobs";
import { type RuleCondition } from "./boundedDecisionRules";

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
    /** True while the LOW band blocks the gate: another read at this confidence cannot confirm the flip. */
    confidenceBlocked: boolean;
    reason: string;
  } | null;
};

const resolveConfidence = (assessment: RegimeAssessment) => {
  const nearestThresholdGap = assessment.diagnostics.nearestThresholdDelta;
  const confidenceLabel: PostureStateContract["currentState"]["confidenceLabel"] = nearestThresholdGap <= 5
    ? "LOW"
    : nearestThresholdGap <= 12
      ? "MED"
      : "HIGH";
  const confidencePercent = Math.max(35, Math.min(92, Math.round(55 + nearestThresholdGap * 3)));
  return { confidenceLabel, confidencePercent };
};

export const buildPostureStateContract = ({
  assessment,
  recordDate,
  postureLabel,
  decisionEventStore,
}: {
  assessment: RegimeAssessment;
  recordDate: string;
  postureLabel: string;
  decisionEventStore: PostureDecisionEvent[];
}): PostureStateContract => {
  const { confidenceLabel, confidencePercent } = resolveConfidence(assessment);
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
          confidenceBlocked: assessment.diagnostics.confidence === "LOW",
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
          reason: committedTransition?.transitionReason ?? "No committed transition event in store.",
          source: "state-machine",
        },
    whatFlipsNext: {
      flipTrigger: lockCommitment.flipConditions[0] ?? "Recheck thresholds on next refresh.",
      thresholds: lockCommitment.flipConditions,
      thresholdLines: lockCommitment.flipLines,
      reversalConditions: lockCommitment.flipConditions.slice(1),
    },
  };
};
