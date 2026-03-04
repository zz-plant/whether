import type { RegimeKey, RegimeProfile, RegimeThresholds } from "./types";

export const BASE_RATE_TIGHTNESS_THRESHOLD = 5;
export const TIGHTNESS_BASE_RATE_POINTS = 90;
export const TIGHTNESS_INVERSION_POINTS = 25;
export const TIGHTNESS_CAP = 100;
export const RISK_APPETITE_MIN_SLOPE = -1.0;
export const RISK_APPETITE_MAX_SLOPE = 1.5;
export const TIGHTNESS_REGIME_THRESHOLD = 70;
export const RISK_APPETITE_REGIME_THRESHOLD = 50;
export const REGIME_REVERSAL_DAYS = 30;
export const TREASURY_SOURCE_LABEL = "FRED CSV (DGS1MO, DGS3MO, DGS2, DGS10)";

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;
export const HY_SPREAD_STRESS_THRESHOLD = 4.5;
export const HY_SPREAD_TIGHTNESS_MULTIPLIER = 6;
export const HY_SPREAD_TIGHTNESS_CAP = 15;
export const CHICAGO_FCI_TIGHTENING_THRESHOLD = 0;
export const CHICAGO_FCI_TIGHTNESS_MULTIPLIER = 10;
export const CHICAGO_FCI_TIGHTNESS_CAP = 10;
export const VIX_SHOCK_THRESHOLD = 20;
export const VIX_RISK_APPETITE_MULTIPLIER = 1.5;
export const VIX_RISK_APPETITE_CAP = 20;
export const VC_VELOCITY_SLOWDOWN_THRESHOLD = -5;
export const VC_VELOCITY_RISK_APPETITE_MULTIPLIER = 1.5;
export const VC_VELOCITY_RISK_APPETITE_CAP = 10;
export const LAYOFF_PRESSURE_THRESHOLD = 65;
export const LAYOFF_RISK_APPETITE_MULTIPLIER = 0.6;
export const LAYOFF_RISK_APPETITE_CAP = 12;
export const BASE_RATE_TIGHTNESS_MULTIPLIER = 180;
export const CURVE_INVERSION_TIGHTNESS_MULTIPLIER = 50;
export const DIAGNOSTIC_CONFIDENCE_HIGH_DELTA = 20;
export const DIAGNOSTIC_CONFIDENCE_MEDIUM_DELTA = 10;
export const DIAGNOSTIC_TRANSITION_WATCH_DELTA = 5;
export const DIAGNOSTIC_INTENSITY_STRONG_DELTA = 25;
export const DIAGNOSTIC_INTENSITY_STANDARD_DELTA = 10;
export const TWO_WEAK_READS_WARNING_COUNT = 2;

export const DEFAULT_THRESHOLDS: RegimeThresholds = {
  baseRateTightness: BASE_RATE_TIGHTNESS_THRESHOLD,
  tightnessRegime: TIGHTNESS_REGIME_THRESHOLD,
  riskAppetiteRegime: RISK_APPETITE_REGIME_THRESHOLD,
};

const REGIME_PROFILES: Record<RegimeKey, RegimeProfile> = {
  SCARCITY: {
    description: "Capital is expensive and risk appetite is low. Prioritize survival over growth.",
    constraints: [
      "Shorten payback windows and preserve cash.",
      "Delay speculative hiring or large platform rewrites.",
      "Route roadmap bets through revenue certainty.",
    ],
  },
  DEFENSIVE: {
    description: "Capital is expensive but risk appetite is moderate. Operate for efficiency.",
    constraints: [
      "Focus on margin expansion and retention.",
      "Cut low-leverage experiments.",
      "Convert demand with tighter sales cycles.",
    ],
  },
  VOLATILE: {
    description: "Capital is cheaper but risk appetite is weak. Build trust and resilience.",
    constraints: [
      "Ship reliability and security before novelty.",
      "Avoid disruptive pivots that spook buyers.",
      "Lean into proof, references, and guarantees.",
    ],
  },
  EXPANSION: {
    description: "Capital is cheap and risk appetite is healthy. Move quickly to capture share.",
    constraints: [
      "Prioritize reach and learning velocity over perfect finish.",
      "Spend with clear guardrails, even if some experiments fail.",
      "Scale capacity ahead of demand only where leading signals stay strong.",
    ],
  },
};

export const getRegimeProfile = (regime: RegimeKey) => REGIME_PROFILES[regime];

export const buildTightnessExplanation = (thresholds: RegimeThresholds) =>
  `Tightness score blends two components capped at ${TIGHTNESS_CAP}: ` +
  `base rate points ramp from 0 to ${TIGHTNESS_BASE_RATE_POINTS} as rates move above ${thresholds.baseRateTightness}%, ` +
  `and inversion points ramp from 0 to ${TIGHTNESS_INVERSION_POINTS} as slope moves below 0%.`;

export const RISK_APPETITE_EXPLANATION =
  `Risk appetite score maps the 10Y-2Y slope from ${RISK_APPETITE_MIN_SLOPE}% (very cautious) ` +
  `to ${RISK_APPETITE_MAX_SLOPE}% (confident), scaled to 0-100.`;
