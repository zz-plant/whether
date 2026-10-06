import {
  REGIME_CONFIDENCE_NEAR_THRESHOLD,
  classifyRegime,
  type RegimeDiagnostics,
  type RegimeKey,
  type RegimeThresholds,
} from "./regimeEngineCore";

/*
 * The engine's flip governance. It decides; it does not say. Every sentence a
 * reader meets about a transition ("Funding pressure crossed above 70. Transition
 * committed.") is written from the `cause` this returns, by
 * `describeRegimeAssessment` in `lib/report/regimeDescription.ts`. Wording lives
 * there so an edit to it is visibly a copy change, never a scoring one.
 */

type RegimeState = RegimeKey;

/**
 * One-step move, in score points, past which a crossing is a shock rather than a
 * near-band arrival.
 *
 * The near-band (`transitionWatch`) can only warn when a score *travels through*
 * the band. Both published lines can be jumped from outside it: tightness sat at
 * 0-19 while the rate sat below its 3.5% ramp floor, then crossed 70 in one step
 * (Nov 2022, 19 to 62); DEFENSIVE sat 20 points above the line, then crossed in
 * one step (Dec 2025, 90 to 43). Neither published reversal condition could have
 * fired. Past this distance the machine commits immediately — a delay during the
 * event is worse than an instant call — and marks the transition `shock`, which
 * the surfaces publish as an admitted unconfirmed call instead of pretending the
 * published condition was met.
 *
 * The distance alone does not prove the warning was impossible. A reading one
 * point from the line that then jumps 26 points crossed by a shock-sized move,
 * but its near-band warning was live the whole time, so the published reversal
 * condition *could* have fired. A shock therefore also requires the prior
 * reading to sit outside the canonical near band
 * (`REGIME_CONFIDENCE_NEAR_THRESHOLD`); from inside it, the flip confirms
 * through the gate like any other.
 */
export const SHOCK_CROSSING_POINTS = 25;

type RegimeMachineSignals = {
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

/**
 * A transition as stored and published: the machine's step with its cause
 * written out as `transitionReason`. This is the shape inside every stored
 * operating snapshot and transition event, so it stays as it is.
 */
export type RegimeStateTransition = {
  nextState: RegimeState;
  candidateState: RegimeState;
  committed: boolean;
  pending: boolean;
  transitionReason: string;
  transitionPendingCount?: number;
  /**
   * True when the flip crossed a classification line with a one-step move of at
   * least `SHOCK_CROSSING_POINTS`, so it committed without the confirmation gate
   * and no published reversal condition fired. Surfaces owe the reader that
   * admission rather than a confident-flavored flip.
   */
  shock?: boolean;
  snapshot: RegimeMachineSnapshot;
};

/** One classification line a score crossed between the previous reading and this one. */
export type RegimeLineCrossing = {
  axis: "tightness" | "riskAppetite";
  direction: "above" | "below";
  threshold: number;
};

/** Why the machine did what it did, as data. The report layer words it. */
export type RegimeTransitionCause =
  | { outcome: "held" }
  | {
      outcome: "pending";
      crossings: RegimeLineCrossing[];
      pendingCount: number;
      confirmationGate: number;
    }
  | { outcome: "committed"; crossings: RegimeLineCrossing[]; shock: boolean };

/** What `advanceRegimeState` returns: the stored transition with its cause as a code. */
export type RegimeMachineStep = Omit<RegimeStateTransition, "transitionReason"> & {
  cause: RegimeTransitionCause;
};

/**
 * The quadrant the readings classify into, ignoring any committed state. This is
 * the candidate the machine confirms or holds; exported so copy that describes
 * the flip can state it against the same table the machine uses. The table
 * itself is `classifyRegime` in the engine core, so the core and the machine
 * read one table without importing each other.
 */
export const classifyRegimeQuadrant = ({
  tightness,
  riskAppetite,
  thresholds,
}: {
  tightness: number;
  riskAppetite: number;
  thresholds: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime">;
}): RegimeState => classifyRegime(tightness, riskAppetite, thresholds);

const classifyFromSignals = ({ tightness, riskAppetite, thresholds }: RegimeMachineSignals): RegimeState =>
  classifyRegimeQuadrant({ tightness, riskAppetite, thresholds });

const crossed = ({
  previous,
  current,
  threshold,
  axis,
}: {
  previous: number | undefined;
  current: number;
  threshold: number;
  axis: RegimeLineCrossing["axis"];
}): RegimeLineCrossing | null => {
  if (typeof previous !== "number") {
    return null;
  }
  if (previous <= threshold && current > threshold) {
    return { axis, direction: "above", threshold };
  }
  if (previous > threshold && current <= threshold) {
    return { axis, direction: "below", threshold };
  }
  return null;
};

const advanceRegimeStateBase = (
  previousState: RegimeMachineSnapshot | null,
  currentSignals: RegimeMachineSignals,
): RegimeMachineStep => {
  const candidateState = classifyFromSignals(currentSignals);
  const committedState = previousState?.committedState ?? candidateState;

  if (candidateState === committedState) {
    return {
      nextState: committedState,
      candidateState,
      committed: false,
      pending: false,
      cause: { outcome: "held" },
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

  const crossings = [
    crossed({
      previous: previousState?.lastSignals?.tightness,
      current: currentSignals.tightness,
      threshold: currentSignals.thresholds.tightnessRegime,
      axis: "tightness",
    }),
    crossed({
      previous: previousState?.lastSignals?.riskAppetite,
      current: currentSignals.riskAppetite,
      threshold: currentSignals.thresholds.riskAppetiteRegime,
      axis: "riskAppetite",
    }),
  ].filter((crossing): crossing is RegimeLineCrossing => crossing !== null);

  /**
   * A crossing is a shock when the axis moved `SHOCK_CROSSING_POINTS` or more in
   * one step on the axis it crossed *and* started outside the near band — the
   * case where the near-band warning was structurally impossible. A move that
   * started inside the band could have been warned about, however far it
   * travelled, so it is not a shock. Requires a previous reading: the first
   * observation of a window has no one-step move to measure.
   */
  const shockCrossed = previousState?.lastSignals
    ? [
        { label: "tightness", line: currentSignals.thresholds.tightnessRegime, previous: previousState.lastSignals.tightness, current: currentSignals.tightness },
        { label: "riskAppetite", line: currentSignals.thresholds.riskAppetiteRegime, previous: previousState.lastSignals.riskAppetite, current: currentSignals.riskAppetite },
      ].some((axis) => {
        const crossedLine =
          (axis.previous <= axis.line && axis.current > axis.line) ||
          (axis.previous > axis.line && axis.current <= axis.line);
        const startedOutsideNearBand = Math.abs(axis.previous - axis.line) > REGIME_CONFIDENCE_NEAR_THRESHOLD;
        return crossedLine && startedOutsideNearBand && Math.abs(axis.current - axis.previous) >= SHOCK_CROSSING_POINTS;
      })
    : false;

  const confidenceBlocked = currentSignals.diagnostics.confidence === "LOW";
  const nearBoundary = currentSignals.diagnostics.transitionWatch || currentSignals.diagnostics.nearestThresholdDelta <= 8;
  const requiresConfirmation = confidenceBlocked || nearBoundary || currentSignals.diagnostics.confidence === "MEDIUM";

  const pendingCount = previousState?.pendingState === candidateState ? previousState.pendingCount + 1 : 1;
  const confirmationGate = requiresConfirmation ? 2 : 1;
  const committed = (!confidenceBlocked && pendingCount >= confirmationGate) || shockCrossed;

  if (!committed) {
    return {
      nextState: committedState,
      candidateState,
      committed: false,
      pending: true,
      cause: { outcome: "pending", crossings, pendingCount, confirmationGate },
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
    cause: { outcome: "committed", crossings, shock: shockCrossed },
    transitionPendingCount: pendingCount,
    shock: shockCrossed || undefined,
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

export const advanceRegimeState = advanceRegimeStateBase;
