import {
  CONFIDENCE_PERCENT_BASELINE,
  CONFIDENCE_PERCENT_PER_POINT,
  CONFIDENCE_PERCENT_FLOOR,
  CONFIDENCE_PERCENT_CEILING,
  CONFIDENCE_PERCENT_IMPUTED_CEILING,
  CURVE_INVERSION_TIGHTNESS_MULTIPLIER,
  MISSING_SLOPE_FALLBACK,
  RISK_GAP_TO_TIGHTNESS_EQUIVALENT,
  REGIME_CONFIDENCE_NEAR_THRESHOLD,
  REGIME_CONFIDENCE_MEDIUM_THRESHOLD,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_CAP,
  TIGHTNESS_INVERSION_POINTS,
} from "../regimeEngineCore";
import { isSavedCopy } from "./provenanceStatus";

/** The scores and lines a confidence is measured from; a `RegimeAssessment` is one. */
export type ConfidenceInputs = {
  scores: {
    tightness: number;
    riskAppetite: number;
    /*
     * Present on every RegimeAssessment, and every caller passes `scores`
     * wholesale, so the imputation state arrives here without a signature change.
     * Optional so a caller may still hand in a bare pair of scores.
     */
    baseRateUsed?: "FED" | "1M" | "3M" | "MISSING";
    curveSlope?: number | null;
    /*
     * Optional for the same reason: set on every live assessment, never stored.
     * The pressure is counted with the curve slope and the speed term beside it
     * (`resolveTightnessGap`), so a caller that passes it passes those too.
     */
    tightnessPressure?: number;
    tightnessSaturated?: boolean;
    baseRateVelocityPoints?: number;
  };
  thresholds: {
    tightnessRegime: number;
    riskAppetiteRegime: number;
  };
};

/**
 * Whether either score was computed from a stand-in rather than a reading.
 *
 * A missing base rate defaults to the tightness threshold and a missing curve
 * slope to the bottom of the risk-appetite range. Both stand-ins sit far from
 * the regime boundaries, and distance from a boundary is exactly what the
 * percent below rewards — so before this check, a payload with no data at all
 * scored the ceiling. See `resolveConfidencePercent`.
 */
const hasImputedInputs = ({ scores }: ConfidenceInputs): boolean =>
  scores.baseRateUsed === "MISSING" || scores.curveSlope === null;

/**
 * Each score's distance from its own line, both on the tightness scale.
 *
 * The two gaps are not directly comparable: tightness moves 180 points per point
 * of base rate, risk appetite 40 per point of slope. Taking `min()` of the raw
 * gaps therefore picked the risk axis almost every time — not because it was
 * nearer to flipping, but because its scale is 4.5x more compressed. The risk gap
 * is converted to its tightness equivalent first, so "nearest" means nearest in
 * the move the underlying rate or slope would have to make.
 *
 * This is the one conversion, exported for every surface that must pick which of
 * the two lines is nearer (the flip state's watched boundary, the forecast's
 * boundary pressure). A raw `min()` anywhere else re-asserts the equivalence
 * `RISK_GAP_TO_TIGHTNESS_EQUIVALENT` exists to deny.
 */
export const resolveLineGaps = ({ scores, thresholds }: ConfidenceInputs) => ({
  tightness: resolveTightnessGap({ scores, thresholds }),
  riskAppetite: Math.abs(scores.riskAppetite - thresholds.riskAppetiteRegime) * RISK_GAP_TO_TIGHTNESS_EQUIVALENT,
});

/**
 * Funding pressure's distance from its line, counting the points the published
 * score hides.
 *
 * A pinned score sheds pressure before the published number moves, and the
 * distance from the line is the gap the reader sees plus those hidden points.
 * They are counted along the base rate, the input the pin is about: the flag
 * says a higher rate would not raise the score (`isTightnessSaturated`), and
 * this counts how far a lower one must go before it lowers it. Two ceilings
 * hide rate points: the rate component's own at 90, and the score's at 100,
 * which the rate component shares with the inversion and speed terms and the
 * Chicago Fed add-on.
 *
 * `pressure - score` answered a different question. Pressure keeps the
 * inversion past its 25-point cap, which only a steepening curve sheds, and a
 * steepening curve is risk appetite's line, measured on its own; and pressure
 * leaves out the add-on the published score carries. So it counted 10 points
 * too many at Nov 2022's month-end (an inversion worth 35), 15 where there are
 * none at a 3.78% bill under a 0.8-point inversion (published 75, pressure 90,
 * where a falling rate moves the score at once), and 5 too few on a
 * positive-curve week the add-on lifts to 95. The speed term is capped before it
 * enters either number, so it hides nothing of its own. On the week of Oct 19,
 * 2026 (published 90, pressure 110, a positive curve) the rate component reads
 * 110: the score sheds 20 hidden points before it moves and 20 more to reach the
 * line, 40 in all.
 *
 * One case is undercounted. The add-on's points past the 100 clip are on no
 * score, so a reading the Chicago Fed index tops up to 100 counts up to 10
 * fewer hidden points than it has, and the count errs toward less room. No
 * month-end since 2012 is one: the index's add-on has fired only in Mar and
 * Apr 2020, at a score of 2. A caller without the pressure gets the published
 * gap alone.
 */
const resolveTightnessGap = ({ scores, thresholds }: ConfidenceInputs): number => {
  const gap = Math.abs(scores.tightness - thresholds.tightnessRegime);
  if (typeof scores.tightnessPressure !== "number" || scores.tightness <= thresholds.tightnessRegime) return gap;
  // The slope the engine scored: a missing curve is scored at its stand-in.
  const slope = scores.curveSlope === null ? MISSING_SLOPE_FALLBACK : (scores.curveSlope ?? 0);
  const inversion = slope < 0 ? Math.round(Math.abs(slope) * CURVE_INVERSION_TIGHTNESS_MULTIPLIER) : 0;
  const speed = scores.baseRateVelocityPoints ?? 0;
  const rate = scores.tightnessPressure - inversion - speed;
  const beforeClip = Math.min(rate, TIGHTNESS_BASE_RATE_POINTS) + Math.min(inversion, TIGHTNESS_INVERSION_POINTS) + speed;
  return gap + Math.max(0, rate - TIGHTNESS_BASE_RATE_POINTS) + Math.max(0, beforeClip - TIGHTNESS_CAP);
};

/**
 * The margin a reader is shown: the score nearest its change line, chosen the way
 * the published label chooses it (on the tightness-equivalent scale), and how many
 * of that score's own points separate it from the line, so the number can be
 * checked against the score printed beside it. Null when an input was imputed:
 * a distance from a stand-in value is not a margin.
 *
 * The API keeps calling this `confidence`; pages, pastes and email call it the
 * margin, because a distance is what it is (docs/developer/api-reference.md).
 */
export const resolveNearestLineMargin = (
  inputs: ConfidenceInputs,
): { signal: "tightness" | "riskAppetite"; points: number } | null => {
  if (hasImputedInputs(inputs)) return null;
  const gaps = resolveLineGaps(inputs);
  const signal = gaps.riskAppetite < gaps.tightness ? "riskAppetite" : "tightness";
  const raw =
    signal === "tightness"
      ? gaps.tightness
      : Math.abs(inputs.scores.riskAppetite - inputs.thresholds.riskAppetiteRegime);
  return { signal, points: Math.round(raw) };
};

/** Points from the nearest regime boundary, on the tightness scale. */
export const resolveDistanceToFlip = (inputs: ConfidenceInputs): number => {
  const gaps = resolveLineGaps(inputs);
  return Math.min(gaps.tightness, gaps.riskAppetite);
};

/**
 * How far a reading sits from a line, in the bands the published confidence
 * uses: a score's own line, or the nearest for a signal that only feeds them. The
 * published label is this for `nearest`, before any stale-fallback step down, so
 * a per-signal label never claims more room than the guidance's own confidence
 * allows at its nearest line.
 */
export const resolveLineDistanceLabel = (
  inputs: ConfidenceInputs,
  line: "tightness" | "riskAppetite" | "nearest",
): "HIGH" | "MED" | "LOW" => {
  if (hasImputedInputs(inputs)) return "LOW";
  const gap = line === "nearest" ? resolveDistanceToFlip(inputs) : resolveLineGaps(inputs)[line];
  return gap <= REGIME_CONFIDENCE_NEAR_THRESHOLD ? "LOW" : gap <= REGIME_CONFIDENCE_MEDIUM_THRESHOLD ? "MED" : "HIGH";
};

export const resolveConfidencePercentFromDistance = (
  distanceToFlip: number,
  imputed = false,
): number => {
  const raw = Math.round(CONFIDENCE_PERCENT_BASELINE + distanceToFlip * CONFIDENCE_PERCENT_PER_POINT);
  // The imputed ceiling is deliberately below the normal floor, so it is applied
  // instead of the floor rather than under it — clamping to the floor first would
  // put it back above the ceiling and silently disable this gate.
  if (imputed) {
    return Math.min(CONFIDENCE_PERCENT_IMPUTED_CEILING, raw);
  }
  return Math.max(CONFIDENCE_PERCENT_FLOOR, Math.min(CONFIDENCE_PERCENT_CEILING, raw));
};

/**
 * Confidence in the regime call, as a percent.
 *
 * It measures one thing only: how far the scores sit from the nearest regime
 * boundary. That is not a calibrated probability, and it is not evidence about
 * the data behind the scores — which is why an imputed input caps it rather
 * than being allowed to raise it.
 */
export const resolveConfidencePercent = (inputs: ConfidenceInputs): number =>
  resolveConfidencePercentFromDistance(resolveDistanceToFlip(inputs), hasImputedInputs(inputs));

/** Past this age a fallback reading is stale: confidence drops and freshness says so. */
export const FRESH_FALLBACK_HOURS = 48;
const STALE_FALLBACK_HOURS = 120;

/**
 * Distance from the nearest boundary, lowered one step when the reading is a
 * bundled fallback older than 48 hours and two past 120. Reached only through
 * `resolvePublishedConfidence`, which decides what counts as a fallback once.
 */
const resolvePublishedConfidenceLabel = ({
  scores,
  thresholds,
  isFallbackData,
  recordDate,
  now = Date.now(),
}: ConfidenceInputs & {
  /** A fallback read of live data; false for an archived month, which is old by design. */
  isFallbackData: boolean;
  recordDate?: string | null;
  now?: number;
}): "HIGH" | "MED" | "LOW" => {
  const geometric = resolveLineDistanceLabel({ scores, thresholds }, "nearest");
  const ageHours = isFallbackData && recordDate
    ? Math.max(0, (now - Date.parse(`${recordDate}T00:00:00.000Z`)) / 3_600_000)
    : 0;
  if (!isFallbackData || ageHours <= FRESH_FALLBACK_HOURS) return geometric;
  if (ageHours > STALE_FALLBACK_HOURS) return geometric === "HIGH" ? "MED" : "LOW";
  return geometric === "HIGH" ? "MED" : geometric;
};

/** The record a reading was taken from: its date, and whether it is a fallback. */
export type ConfidenceRecord = {
  record_date?: string | null;
  fallback_at?: string | null;
  fallback_reason?: string | null;
};

/**
 * The confidence a reading publishes, as the word and the percent. Every
 * surface that prints either one reads it here: the brief model (and through it
 * every route's trust strip), /signals, the posture-state contract the APIs
 * serve, and every export, email and alert.
 *
 * It is one function because three used to answer the question. The engine's
 * `diagnostics.confidence` and the posture-state contract both took the nearest
 * raw gap, where a risk-appetite point is a 4.5x larger move than a tightness
 * point, so on the week of Sep 22, 2026 (tightness 20 from its line, risk
 * appetite 7) they said Medium where this said High — and /operate, /trust and
 * the /share paste printed theirs while / and /signals printed this. The
 * engine's label is its confirmation gate and stays its own; it is not a
 * published fact.
 *
 * The label and the percent answer different questions and can disagree on a
 * stale fallback: the label carries the staleness judgment (one step down past
 * 48 hours, two past 120), while the percent stays the distance the scores sit
 * from the line — a distance does not shrink because the data is old. A served
 * pair can therefore read LOW beside a high percent; the label is the verdict.
 */
export const resolvePublishedConfidence = ({
  assessment,
  record,
  historical = false,
  now,
}: {
  assessment: ConfidenceInputs;
  record?: ConfidenceRecord | null;
  /** An archived period is old by design, so its age says nothing about the reading. */
  historical?: boolean;
  now?: number;
}): { label: "HIGH" | "MED" | "LOW"; percent: number } => ({
  label: resolvePublishedConfidenceLabel({
    scores: assessment.scores,
    thresholds: assessment.thresholds,
    isFallbackData: isSavedCopy(record) && !historical,
    recordDate: record?.record_date,
    now,
  }),
  percent: resolveConfidencePercent(assessment),
});
