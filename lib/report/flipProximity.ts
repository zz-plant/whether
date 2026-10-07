/**
 * The change line in the inputs' own units: the market move that would cross
 * each line the guidance's "Conditions change if" sentence names.
 *
 * The scores publish a distance from the boundary in points, and the confidence
 * percent is that distance renamed — neither tells an operator what has to
 * happen in the market. "If long rates fall 0.15 percentage points closer to
 * short rates, conditions turn Cloudy" does, and it is derivable because both
 * scores are piecewise-linear in one input each: risk appetite in the curve
 * slope, and funding pressure in the base rate once the slope and the
 * tightening-speed term are held where they are.
 *
 * A translation, not a second answer. It translates the lines of
 * `buildCallChangeLines` (the clauses of `WeeklyCallContract.callChangesIf`) in
 * that sentence's order, and nothing else. Until 2026-10-07 it was its own
 * answer: it scanned for any change of quadrant and sorted the two moves by
 * size, so the bigger score gap could come first (a 0.22-point bill-rate move
 * to a funding-pressure line 38 points away, ahead of a 0.25-point curve move to
 * a risk-appetite line 9 points away), and the standup, the quiet-day line and
 * the work-item blocks printed that first move alone as the nearest. While a
 * crossing awaited confirmation it reported a 0.01 move toward conditions the
 * scores were already in, and on a held week it said what market move would
 * change conditions beside guidance the hold says is not changing. Now a line
 * the sentence calls already crossed gets no translation, and a held week, whose
 * sentence is the hold's condition, gets none at all.
 *
 * Solved by scanning the real score functions rather than inverting them on
 * paper: the rate component is clipped, the sum is clipped, and both round, so a
 * closed form would have to carry every one of those edges. A 0.01-point scan
 * across 3 points is 300 evaluations of one integer formula.
 *
 * The published score is the baseline plus the macro layer (credit spreads,
 * volatility, funding velocity), which is additive and does not move with the
 * curve or the bill, so the projection carries the published-minus-baseline
 * offset across the scan. The one exception is the market-stress veto, which
 * caps risk appetite outright: while it holds, no slope reads better than the
 * cap, so a crossing that needs risk appetite to rise is not reported.
 */
import {
  clamp,
  computeRiskAppetiteScore,
  computeTightnessScore,
  MISSING_SLOPE_FALLBACK,
  type RegimeAssessment,
  type RegimeKey,
} from "../regimeEngineCore";
import { classifyRegimeQuadrant } from "../regimeStateMachine";
import { formatPointsMove } from "../formatters";
import { BASE_RATE_SOURCE_LABELS } from "./regimeDescription";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildCallChangeLines } from "./reportEvidence";

type FlipProximity = {
  axis: "riskAppetite" | "tightness";
  input: "curveSlope" | "baseRate";
  /** Signed move in percentage points that crosses the line; the sign is the direction. */
  inputMove: number;
  /** Score points between the current reading and the line on this axis. */
  pointsToBoundary: number;
  crossesTo: RegimeKey;
  /** One sentence in the reader's terms, no score vocabulary. */
  sentence: string;
};

const SCAN_STEP = 0.01;
const SCAN_LIMIT = 3;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

type ProximityInputs = Pick<RegimeAssessment, "regime" | "scores" | "thresholds" | "policyAssessment"> & {
  diagnostics: Pick<RegimeAssessment["diagnostics"], "boundaryContributors">;
};

type CallChangeLine = ReturnType<typeof buildCallChangeLines>[number];

const VETO_CONTRIBUTOR = /market stress (veto|unwinding)/i;
const isRiskAppetiteVetoed = ({ diagnostics }: ProximityInputs) =>
  diagnostics.boundaryContributors.some((contributor) => VETO_CONTRIBUTOR.test(contributor));

/** Whether a projected score is on the far side of the line, by the sentence's own inequality. */
const isPast = (line: CallChangeLine, score: number) =>
  line.direction === "riseAbove" ? score > line.threshold : score <= line.threshold;

/**
 * The first move toward the line at which the projected score is past it. Both
 * scores rise with their input, so a line the score must rise to is reached by
 * raising the input, and one it must fall to by lowering it.
 */
const scanForCrossing = (line: CallChangeLine, project: (move: number) => number): number | null => {
  const sign = line.direction === "riseAbove" ? 1 : -1;
  for (let step = 1; step * SCAN_STEP <= SCAN_LIMIT; step += 1) {
    const move = sign * Number((step * SCAN_STEP).toFixed(2));
    if (isPast(line, project(move))) return move;
  }
  return null;
};

const riskAppetiteProximity = (inputs: ProximityInputs, line: CallChangeLine): FlipProximity | null => {
  const { scores, thresholds } = inputs;
  // An imputed slope is the fallback constant, and a distance from a stand-in
  // is not a distance in the market.
  if (typeof scores.curveSlope !== "number" || scores.curveSlope === MISSING_SLOPE_FALLBACK) return null;
  const slope = scores.curveSlope;
  const offset = scores.riskAppetite - computeRiskAppetiteScore(slope);
  const vetoed = isRiskAppetiteVetoed(inputs);
  const projectAt = (move: number) => {
    const projected = clamp(computeRiskAppetiteScore(slope + move) + offset, SCORE_MIN, SCORE_MAX);
    // Under the veto the cap is the published score; only a fall can cross.
    return vetoed ? Math.min(projected, scores.riskAppetite) : projected;
  };
  const move = scanForCrossing(line, projectAt);
  if (move === null) return null;
  const crossesTo = classifyRegimeQuadrant({ tightness: scores.tightness, riskAppetite: projectAt(move), thresholds });
  /* The curve is the 10-year rate minus the 2-year, so "flatter" is long
     rates falling toward short ones. Said that way rather than as "10Y−2Y". */
  const phrase = move > 0
    ? `long rates rise ${formatPointsMove(move)} further above short rates`
    : `long rates fall ${formatPointsMove(move)} closer to short rates`;
  return {
    axis: "riskAppetite",
    input: "curveSlope",
    inputMove: move,
    pointsToBoundary: Math.abs(scores.riskAppetite - thresholds.riskAppetiteRegime),
    crossesTo,
    sentence: `If ${phrase}, conditions turn ${getRegimePublicLabel(crossesTo)}.`,
  };
};

const tightnessProximity = ({ scores, thresholds }: ProximityInputs, line: CallChangeLine): FlipProximity | null => {
  if (scores.baseRateUsed === "MISSING") return null;
  const slope = typeof scores.curveSlope === "number" ? scores.curveSlope : MISSING_SLOPE_FALLBACK;
  const velocityPoints = scores.baseRateVelocityPoints ?? 0;
  const baselineAt = (rate: number) =>
    computeTightnessScore(rate, slope, thresholds.baseRateTightness, velocityPoints);
  const offset = scores.tightness - baselineAt(scores.baseRate);
  const projectAt = (move: number) => clamp(baselineAt(scores.baseRate + move) + offset, SCORE_MIN, SCORE_MAX);
  const move = scanForCrossing(line, projectAt);
  if (move === null) return null;
  const crossesTo = classifyRegimeQuadrant({ tightness: projectAt(move), riskAppetite: scores.riskAppetite, thresholds });
  const direction = move > 0 ? "rises" : "falls";
  const label = BASE_RATE_SOURCE_LABELS[scores.baseRateUsed];
  return {
    axis: "tightness",
    input: "baseRate",
    inputMove: move,
    pointsToBoundary: Math.abs(scores.tightness - thresholds.tightnessRegime),
    crossesTo,
    sentence: `If ${label.charAt(0).toLowerCase()}${label.slice(1)} rate ${direction} ${formatPointsMove(move)}, conditions turn ${getRegimePublicLabel(crossesTo)}.`,
  };
};

/**
 * Each line of the guidance's "Conditions change if" sentence, as the market
 * move that crosses it, in the sentence's order. A line already crossed, a line
 * no move within 3 points reaches (a tightening-speed term large enough that no
 * rate level brings the score under the line, say) and an input the reading
 * imputed are left out rather than reported at the scan's edge; a held week,
 * whose sentence is the hold's condition, has nothing to translate.
 */
export const buildFlipProximity = (assessment: ProximityInputs): FlipProximity[] => {
  if (assessment.policyAssessment.refusal.refused) return [];
  return buildCallChangeLines(assessment)
    .filter((line) => !line.tripped)
    .flatMap((line) => {
      const translated = line.metric === "tightness"
        ? tightnessProximity(assessment, line)
        : riskAppetiteProximity(assessment, line);
      return translated ? [translated] : [];
    });
};
