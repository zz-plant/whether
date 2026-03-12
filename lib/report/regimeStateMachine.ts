import type { RegimeDiagnostics, RegimeKey, RegimeThresholds } from "../regimeEngine";
import { buildRegimeDecisionEvent, getDecisionEventStore } from "../events/decisionEventStore";

export type RegimeState = RegimeKey;

export type RegimeMachineSignals = {
  tightness: number;
  riskAppetite: number;
  thresholds: RegimeThresholds;
  diagnostics: Pick<RegimeDiagnostics, "confidence" | "nearestThresholdDelta" | "transitionWatch">;
};

export type RegimeMachineSnapshot = {
  committedState: RegimeState;
  pendingState: RegimeState | null;
  pendingCount: number;
  lastSignals?: Pick<RegimeMachineSignals, "tightness" | "riskAppetite">;
};

export type RegimeStateTransition = {
  nextState: RegimeState;
  candidateState: RegimeState;
  committed: boolean;
  pending: boolean;
  transitionReason: string;
  transitionPendingCount: number;
  snapshot: RegimeMachineSnapshot;
};

const classifyFromSignals = ({ tightness, riskAppetite, thresholds }: RegimeMachineSignals): RegimeState => {
  if (tightness > thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime) {
    return "SCARCITY";
  }
  if (tightness > thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime) {
    return "DEFENSIVE";
  }
  if (tightness <= thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime) {
    return "VOLATILE";
  }
  return "EXPANSION";
};

const crossed = ({
  previous,
  current,
  threshold,
  label,
}: {
  previous: number | undefined;
  current: number;
  threshold: number;
  label: string;
}) => {
  if (typeof previous !== "number") {
    return null;
  }
  if (previous <= threshold && current > threshold) {
    return `${label} crossed above ${threshold}`;
  }
  if (previous > threshold && current <= threshold) {
    return `${label} crossed below ${threshold}`;
  }
  return null;
};

const advanceRegimeStateBase = (
  previousState: RegimeMachineSnapshot | null,
  currentSignals: RegimeMachineSignals,
): RegimeStateTransition => {
  const candidateState = classifyFromSignals(currentSignals);
  const committedState = previousState?.committedState ?? candidateState;

  if (candidateState === committedState) {
    return {
      nextState: committedState,
      candidateState,
      committed: false,
      pending: false,
      transitionReason: "No threshold crossing changed the committed state.",
      transitionPendingCount: 0,
      snapshot: {
        committedState,
        pendingState: null,
        pendingCount: 0,
        lastSignals: {
          tightness: currentSignals.tightness,
          riskAppetite: currentSignals.riskAppetite,
        },
      },
    };
  }

  const crossingReasons = [
    crossed({
      previous: previousState?.lastSignals?.tightness,
      current: currentSignals.tightness,
      threshold: currentSignals.thresholds.tightnessRegime,
      label: "Tightness",
    }),
    crossed({
      previous: previousState?.lastSignals?.riskAppetite,
      current: currentSignals.riskAppetite,
      threshold: currentSignals.thresholds.riskAppetiteRegime,
      label: "Risk appetite",
    }),
  ].filter((reason): reason is string => Boolean(reason));

  const confidenceBlocked = currentSignals.diagnostics.confidence === "LOW";
  const nearBoundary = currentSignals.diagnostics.transitionWatch || currentSignals.diagnostics.nearestThresholdDelta <= 8;
  const requiresConfirmation = confidenceBlocked || nearBoundary || currentSignals.diagnostics.confidence === "MEDIUM";

  const pendingCount = previousState?.pendingState === candidateState ? previousState.pendingCount + 1 : 1;
  const confirmationGate = requiresConfirmation ? 2 : 1;
  const committed = !confidenceBlocked && pendingCount >= confirmationGate;

  const transitionReason = crossingReasons.length > 0
    ? `${crossingReasons.join("; ")}.`
    : "Signals moved into a different regime quadrant.";

  if (!committed) {
    return {
      nextState: committedState,
      candidateState,
      committed: false,
      pending: true,
      transitionReason: `${transitionReason} Transition pending confidence gate (${pendingCount}/${confirmationGate}).`,
      transitionPendingCount: pendingCount,
      snapshot: {
        committedState,
        pendingState: candidateState,
        pendingCount,
        lastSignals: {
          tightness: currentSignals.tightness,
          riskAppetite: currentSignals.riskAppetite,
        },
      },
    };
  }

  return {
    nextState: candidateState,
    candidateState,
    committed: true,
    pending: false,
    transitionReason: `${transitionReason} Transition committed.`,
    transitionPendingCount: pendingCount,
    snapshot: {
      committedState: candidateState,
      pendingState: null,
      pendingCount: 0,
      lastSignals: {
        tightness: currentSignals.tightness,
        riskAppetite: currentSignals.riskAppetite,
      },
    },
  };
};

export const advanceRegimeState = (
  previousState: RegimeMachineSnapshot | null,
  currentSignals: RegimeMachineSignals,
): RegimeStateTransition => {
  const transition = advanceRegimeStateBase(previousState, currentSignals);
  if (
    previousState &&
    transition.committed &&
    transition.nextState !== previousState.committedState
  ) {
    getDecisionEventStore().append(
      buildRegimeDecisionEvent({
        previousState: previousState.committedState,
        nextState: transition.nextState,
        tightness: currentSignals.tightness,
        riskAppetite: currentSignals.riskAppetite,
        thresholds: currentSignals.thresholds,
        diagnostics: currentSignals.diagnostics,
        pendingCount: transition.transitionPendingCount,
        transitionReason: transition.transitionReason,
      }),
    );
  }
  return transition;
};

