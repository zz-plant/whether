import {
  CONFIDENCE_PERCENT_BASELINE,
  CONFIDENCE_PERCENT_PER_POINT,
  CONFIDENCE_PERCENT_FLOOR,
  CONFIDENCE_PERCENT_CEILING,
  CONFIDENCE_PERCENT_IMPUTED_CEILING,
  RISK_GAP_TO_TIGHTNESS_EQUIVALENT,
} from "../regimeEngineCore";

type ConfidenceInputs = {
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
export const hasImputedInputs = ({ scores }: ConfidenceInputs): boolean =>
  scores.baseRateUsed === "MISSING" || scores.curveSlope === null;

/**
 * Points from the nearest regime boundary, on the tightness scale.
 *
 * The two gaps are not directly comparable: tightness moves 180 points per point
 * of base rate, risk appetite 40 per point of slope. Taking `min()` of the raw
 * gaps therefore picked the risk axis almost every time — not because it was
 * nearer to flipping, but because its scale is 4.5x more compressed. The risk gap
 * is converted to its tightness equivalent first, so "nearest" means nearest in
 * the move the underlying rate or slope would have to make.
 */
export const resolveDistanceToFlip = ({ scores, thresholds }: ConfidenceInputs): number => {
  const tightnessGap = Math.abs(scores.tightness - thresholds.tightnessRegime);
  const riskGap = Math.abs(scores.riskAppetite - thresholds.riskAppetiteRegime);
  return Math.min(tightnessGap, riskGap * RISK_GAP_TO_TIGHTNESS_EQUIVALENT);
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
