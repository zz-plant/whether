import {
  CONFIDENCE_PERCENT_BASELINE,
  CONFIDENCE_PERCENT_PER_POINT,
  CONFIDENCE_PERCENT_FLOOR,
  CONFIDENCE_PERCENT_CEILING,
  CONFIDENCE_PERCENT_IMPUTED_CEILING,
  RISK_GAP_TO_TIGHTNESS_EQUIVALENT,
  REGIME_CONFIDENCE_NEAR_THRESHOLD,
  REGIME_CONFIDENCE_MEDIUM_THRESHOLD,
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

/** Past this age a fallback reading is stale: confidence drops and freshness says so. */
export const FRESH_FALLBACK_HOURS = 48;
const STALE_FALLBACK_HOURS = 120;

/**
 * The confidence label every surface publishes: distance from the nearest
 * boundary, lowered one step when the reading is a bundled fallback older than
 * 48 hours and two past 120. The brief model, and through it every route's
 * trust strip, read this; /signals, which builds no brief model, reads it
 * directly, so the strip cannot say High there and Medium on /trust for one
 * reading.
 */
export const resolvePublishedConfidenceLabel = ({
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
  const gap = resolveDistanceToFlip({ scores, thresholds });
  const geometric = gap <= REGIME_CONFIDENCE_NEAR_THRESHOLD ? "LOW" : gap <= REGIME_CONFIDENCE_MEDIUM_THRESHOLD ? "MED" : "HIGH";
  const ageHours = isFallbackData && recordDate
    ? Math.max(0, (now - Date.parse(`${recordDate}T00:00:00.000Z`)) / 3_600_000)
    : 0;
  if (!isFallbackData || ageHours <= FRESH_FALLBACK_HOURS) return geometric;
  if (ageHours > STALE_FALLBACK_HOURS) return geometric === "HIGH" ? "MED" : "LOW";
  return geometric === "HIGH" ? "MED" : geometric;
};
