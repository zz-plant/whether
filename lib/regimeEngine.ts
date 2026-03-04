/**
 * Regime Engine public API.
 * Keeps legacy import paths stable while routing logic through focused modules.
 */

export {
  BASE_RATE_TIGHTNESS_THRESHOLD,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_INVERSION_POINTS,
  TIGHTNESS_CAP,
  RISK_APPETITE_MIN_SLOPE,
  RISK_APPETITE_MAX_SLOPE,
  TIGHTNESS_REGIME_THRESHOLD,
  RISK_APPETITE_REGIME_THRESHOLD,
  REGIME_REVERSAL_DAYS,
  TREASURY_SOURCE_LABEL,
  DEFAULT_THRESHOLDS,
  getRegimeProfile,
} from "./regimeEngine/constants";
export { evaluateRegime } from "./regimeEngine/evaluate";
export {
  classifyRegime,
  computeCurveSlope,
  computeRiskAppetiteScore,
  computeTightnessScore,
  getBaseRate,
  resolveThresholds,
} from "./regimeEngine/scoring";
export { buildRegimeChangeReasons, deriveRegimeTrend } from "./regimeEngine/transitions";
export type {
  PolicyAssessment,
  PolicyBand,
  PolicyCompositeScores,
  PolicyConfidenceIndex,
  PolicyPosture,
  PolicyRefusalState,
  PolicySignalNormalization,
  RegimeAssessment,
  RegimeChangeReason,
  RegimeDiagnostics,
  RegimeInput,
  RegimeKey,
  RegimeScores,
  RegimeThresholds,
  RegimeTrend,
} from "./regimeEngine/types";
