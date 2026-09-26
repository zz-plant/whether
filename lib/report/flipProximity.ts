/**
 * How far the inputs are from changing the call, in the inputs' own units.
 *
 * The scores publish a distance from the boundary in points, and the confidence
 * percent is that distance renamed — neither tells an operator what has to
 * happen in the market. "0.15% flatter on the 10Y−2Y curve would change the
 * call" does, and it is derivable because both scores are piecewise-linear in
 * one input each: risk appetite in the curve slope, and tightness in the base
 * rate once the slope and the tightening-speed term are held where they are.
 *
 * Solved by scanning the real score functions rather than inverting them on
 * paper: the rate component is clipped, the sum is clipped, and both round, so a
 * closed form would have to carry every one of those edges. A 0.01-point scan
 * across ±3 points is 600 evaluations of two integer formulas.
 *
 * The published score is the baseline plus the macro layer (credit spreads,
 * volatility, funding velocity), which is additive and does not move with the
 * curve or the bill, so the projection carries the published-minus-baseline
 * offset across the scan. The one exception is the market-stress veto, which
 * caps risk appetite outright: while it holds, no slope reads better than the
 * cap, so a crossing that needs risk appetite to rise is not reported.
 */
import {
  BASE_RATE_SOURCE_LABELS,
  clamp,
  computeRiskAppetiteScore,
  computeTightnessScore,
  MISSING_SLOPE_FALLBACK,
  type RegimeAssessment,
  type RegimeKey,
} from "../regimeEngineCore";
import { classifyRegimeQuadrant } from "./regimeStateMachine";
import { getRegimePublicLabel } from "../regimePresentation";

type FlipProximity = {
  axis: "riskAppetite" | "tightness";
  input: "curveSlope" | "baseRate";
  /** Signed move in percentage points that crosses the boundary; the sign is the direction. */
  inputMove: number;
  /** Score points between the current reading and the boundary on this axis. */
  pointsToBoundary: number;
  crossesTo: RegimeKey;
  /** One sentence in the reader's terms, no score vocabulary. */
  sentence: string;
};

const SCAN_STEP = 0.01;
const SCAN_LIMIT = 3;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

type ProximityInputs = Pick<RegimeAssessment, "regime" | "scores" | "thresholds"> & {
  diagnostics: Pick<RegimeAssessment["diagnostics"], "boundaryContributors">;
};

const VETO_CONTRIBUTOR = /market stress (veto|unwinding)/i;
const isRiskAppetiteVetoed = ({ diagnostics }: ProximityInputs) =>
  diagnostics.boundaryContributors.some((contributor) => VETO_CONTRIBUTOR.test(contributor));

const formatMove = (move: number) => `${Math.abs(move).toFixed(2)}%`;

/** The first move, in either direction, at which the quadrant changes — nearest wins. */
const scanForCrossing = (
  classifyAt: (move: number) => RegimeKey,
  current: RegimeKey,
): { move: number; regime: RegimeKey } | null => {
  for (let step = 1; step * SCAN_STEP <= SCAN_LIMIT; step += 1) {
    const move = Number((step * SCAN_STEP).toFixed(2));
    for (const signed of [move, -move]) {
      const regime = classifyAt(signed);
      if (regime !== current) return { move: signed, regime };
    }
  }
  return null;
};

const riskAppetiteProximity = (inputs: ProximityInputs): FlipProximity | null => {
  const { regime, scores, thresholds } = inputs;
  // An imputed slope is the fallback constant, and a distance from a stand-in
  // is not a distance in the market.
  if (typeof scores.curveSlope !== "number" || scores.curveSlope === MISSING_SLOPE_FALLBACK) return null;
  const slope = scores.curveSlope;
  const offset = scores.riskAppetite - computeRiskAppetiteScore(slope);
  const vetoed = isRiskAppetiteVetoed(inputs);
  const crossing = scanForCrossing(
    (move) => {
      const projected = clamp(computeRiskAppetiteScore(slope + move) + offset, SCORE_MIN, SCORE_MAX);
      // Under the veto the cap is the published score; only a fall can cross.
      const riskAppetite = vetoed ? Math.min(projected, scores.riskAppetite) : projected;
      return classifyRegimeQuadrant({ tightness: scores.tightness, riskAppetite, thresholds });
    },
    regime,
  );
  if (!crossing) return null;
  /* The curve is the 10-year rate minus the 2-year, so "flatter" is long
     rates falling toward short ones. Said that way rather than as "10Y−2Y". */
  const move = crossing.move > 0
    ? `long rates rise ${formatMove(crossing.move)} further above short rates`
    : `long rates fall ${formatMove(crossing.move)} closer to short rates`;
  return {
    axis: "riskAppetite",
    input: "curveSlope",
    inputMove: crossing.move,
    pointsToBoundary: Math.abs(scores.riskAppetite - thresholds.riskAppetiteRegime),
    crossesTo: crossing.regime,
    sentence: `If ${move}, conditions turn ${getRegimePublicLabel(crossing.regime)}.`,
  };
};

const tightnessProximity = ({ regime, scores, thresholds }: ProximityInputs): FlipProximity | null => {
  if (scores.baseRateUsed === "MISSING") return null;
  const slope = typeof scores.curveSlope === "number" ? scores.curveSlope : MISSING_SLOPE_FALLBACK;
  const velocityPoints = scores.baseRateVelocityPoints ?? 0;
  const baselineAt = (rate: number) =>
    computeTightnessScore(rate, slope, thresholds.baseRateTightness, velocityPoints);
  const offset = scores.tightness - baselineAt(scores.baseRate);
  const crossing = scanForCrossing(
    (move) =>
      classifyRegimeQuadrant({
        tightness: clamp(baselineAt(scores.baseRate + move) + offset, SCORE_MIN, SCORE_MAX),
        riskAppetite: scores.riskAppetite,
        thresholds,
      }),
    regime,
  );
  if (!crossing) return null;
  const direction = crossing.move > 0 ? "rises" : "falls";
  const label = BASE_RATE_SOURCE_LABELS[scores.baseRateUsed];
  return {
    axis: "tightness",
    input: "baseRate",
    inputMove: crossing.move,
    pointsToBoundary: Math.abs(scores.tightness - thresholds.tightnessRegime),
    crossesTo: crossing.regime,
    sentence: `If ${label.charAt(0).toLowerCase()}${label.slice(1)} rate ${direction} ${formatMove(crossing.move)}, conditions turn ${getRegimePublicLabel(crossing.regime)}.`,
  };
};

/**
 * Both axes where a crossing is reachable within ±3 points of the input,
 * nearest first. An axis with no reachable crossing — a tightening-speed term
 * large enough that no rate level brings the score under the line, say — is
 * left out rather than reported at the scan's edge.
 */
export const buildFlipProximity = (assessment: ProximityInputs): FlipProximity[] =>
  [riskAppetiteProximity(assessment), tightnessProximity(assessment)]
    .filter((entry): entry is FlipProximity => entry !== null)
    .sort((left, right) => Math.abs(left.inputMove) - Math.abs(right.inputMove));

/**
 * The quiet-day read: the line a non-Monday visitor needs to know the call
 * still stands and how far it is from flipping.
 *
 * The daily cron keeps the snapshot fresh, but between Mondays the hero has no
 * reason for a returning reader to open `/`. This is that reason — one compact
 * line that leads with the call-unchanged verdict and then the nearest flip
 * distance, so "is the call still standing?" is answered without opening any
 * disclosure. It renders nothing when the call moved (the delta path already
 * leads) or when no axis has a reachable crossing.
 *
 * The flip sentence is reused verbatim from `buildFlipProximity`, never
 * re-minted, so the quiet-day line and the hero's flip watch cannot disagree.
 */
export const buildQuietDayRead = ({
  steadyWeek,
  flipProximity,
}: {
  /** True when the week did not move the posture enough to shift a notch. */
  steadyWeek: boolean;
  /** The hero's flip-proximity sentences, nearest first. */
  flipProximity: readonly string[];
}): string | null => {
  if (!steadyWeek) return null;
  const nearest = flipProximity[0];
  if (!nearest) return null;
  return `Conditions unchanged — ${nearest}`;
};

/**
 * The standup flip line: a one-sentence input for engineering/leadership standups.
 *
 * Teams need a compact, zero-friction answer for "did macro conditions move
 * this week, and how close are we to a pace change?" When conditions held,
 * it reports the call unchanged, the nearest flip distance, and "no pace change."
 * When conditions shifted, it names the new call, the distance to the next flip,
 * and calls for a pace review.
 */
export const buildStandupFlipLine = ({
  regime,
  steadyWeek,
  proximity = [],
}: {
  regime: RegimeKey;
  steadyWeek: boolean;
  proximity?: readonly FlipProximity[];
}): string => {
  const nearest = proximity[0];
  const distance = nearest ? `${formatMove(nearest.inputMove)} from flip` : "no near flip";
  if (steadyWeek) {
    return `Call unchanged, ${distance}; no pace change.`;
  }
  return `Call changed to ${getRegimePublicLabel(regime)}, ${distance}; review pace.`;
};
