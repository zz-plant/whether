/**
 * Regime Engine core logic for scoring and classifying macro regimes.
 * Keeps deterministic, explainable rules close to their types.
 */
import type { TreasuryData, TreasuryYields } from "./types";

export type RegimeKey = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

export interface RegimeScores {
  tightness: number;
  riskAppetite: number;
  baseRateUsed: "1M" | "3M" | "MISSING";
  baseRate: number;
  curveSlope: number | null;
}

export interface RegimeAssessment {
  regime: RegimeKey;
  scores: RegimeScores;
  description: string;
  constraints: string[];
  tightnessExplanation: string;
  riskAppetiteExplanation: string;
  dataWarnings: string[];
  thresholds: RegimeThresholds;
}

export const BASE_RATE_TIGHTNESS_THRESHOLD = 5;
export const TIGHTNESS_BASE_RATE_POINTS = 90;
export const TIGHTNESS_INVERSION_POINTS = 25;
export const TIGHTNESS_CAP = 100;
export const RISK_APPETITE_MIN_SLOPE = -1.0;
export const RISK_APPETITE_MAX_SLOPE = 1.5;
export const TIGHTNESS_REGIME_THRESHOLD = 70;
export const RISK_APPETITE_REGIME_THRESHOLD = 50;
export const REGIME_REVERSAL_DAYS = 30;

export interface RegimeThresholds {
  baseRateTightness: number;
  tightnessRegime: number;
  riskAppetiteRegime: number;
}

export const DEFAULT_THRESHOLDS: RegimeThresholds = {
  baseRateTightness: BASE_RATE_TIGHTNESS_THRESHOLD,
  tightnessRegime: TIGHTNESS_REGIME_THRESHOLD,
  riskAppetiteRegime: RISK_APPETITE_REGIME_THRESHOLD,
};

const REGIME_PROFILES: Record<RegimeKey, { description: string; constraints: string[] }> = {
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
      "Prioritize speed and distribution over polish.",
      "Accept controlled waste to win market share.",
      "Invest ahead of demand where signals are strong.",
    ],
  },
};

const buildTightnessExplanation = (thresholds: RegimeThresholds) =>
  `Tightness score: base rate > ${thresholds.baseRateTightness}% adds ${TIGHTNESS_BASE_RATE_POINTS} points. ` +
  `Inverted curve adds ${TIGHTNESS_INVERSION_POINTS} points. Score is capped at ${TIGHTNESS_CAP}.`;

const RISK_APPETITE_EXPLANATION =
  `Risk appetite score maps the 10Y-2Y slope from ${RISK_APPETITE_MIN_SLOPE}% (very cautious) ` +
  `to ${RISK_APPETITE_MAX_SLOPE}% (confident), scaled to 0-100.`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getBaseRate = (yields: TreasuryYields) => {
  if (typeof yields.oneMonth === "number") {
    return { value: yields.oneMonth, used: "1M" as const };
  }
  if (typeof yields.threeMonth === "number") {
    return { value: yields.threeMonth, used: "3M" as const };
  }
  return { value: 0, used: "MISSING" as const };
};

export const computeCurveSlope = (yields: TreasuryYields): number | null => {
  const tenYear = yields.tenYear;
  const twoYear = yields.twoYear;

  if (typeof tenYear !== "number" || typeof twoYear !== "number") {
    return null;
  }

  return tenYear - twoYear;
};

export const resolveThresholds = (
  overrides?: Partial<RegimeThresholds>
): RegimeThresholds => {
  return {
    baseRateTightness: overrides?.baseRateTightness ?? DEFAULT_THRESHOLDS.baseRateTightness,
    tightnessRegime: overrides?.tightnessRegime ?? DEFAULT_THRESHOLDS.tightnessRegime,
    riskAppetiteRegime: overrides?.riskAppetiteRegime ?? DEFAULT_THRESHOLDS.riskAppetiteRegime,
  };
};

export const computeTightnessScore = (
  baseRate: number,
  curveSlope: number,
  baseRateThreshold: number
) => {
  let score = 0;

  if (baseRate > baseRateThreshold) {
    score += TIGHTNESS_BASE_RATE_POINTS;
  }

  if (curveSlope < 0) {
    score += TIGHTNESS_INVERSION_POINTS;
  }

  return clamp(score, 0, TIGHTNESS_CAP);
};

export const computeRiskAppetiteScore = (curveSlope: number) => {
  const normalized =
    (curveSlope - RISK_APPETITE_MIN_SLOPE) / (RISK_APPETITE_MAX_SLOPE - RISK_APPETITE_MIN_SLOPE);
  return clamp(Math.round(normalized * 100), 0, 100);
};

export const classifyRegime = (
  tightness: number,
  riskAppetite: number,
  thresholds: RegimeThresholds
): RegimeKey => {
  if (tightness > thresholds.tightnessRegime && riskAppetite < thresholds.riskAppetiteRegime) {
    return "SCARCITY";
  }
  if (tightness > thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime) {
    return "DEFENSIVE";
  }
  if (tightness < thresholds.tightnessRegime && riskAppetite < thresholds.riskAppetiteRegime) {
    return "VOLATILE";
  }
  return "EXPANSION";
};

export const evaluateRegime = (
  treasury: TreasuryData,
  overrides?: Partial<RegimeThresholds>
): RegimeAssessment => {
  const dataWarnings: string[] = [];
  const baseRate = getBaseRate(treasury.yields);
  const curveSlope = computeCurveSlope(treasury.yields);
  const curveSlopeForScore = curveSlope ?? 0;
  const thresholds = resolveThresholds(overrides);

  if (baseRate.used === "MISSING") {
    dataWarnings.push("Base rate missing; defaulted to 0% for scoring.");
  }
  if (curveSlope === null) {
    dataWarnings.push("Curve slope missing; defaulted to 0% for scoring.");
  }

  const tightness = computeTightnessScore(
    baseRate.value,
    curveSlopeForScore,
    thresholds.baseRateTightness
  );
  const riskAppetite = computeRiskAppetiteScore(curveSlopeForScore);
  const regime = classifyRegime(tightness, riskAppetite, thresholds);
  const profile = REGIME_PROFILES[regime];

  return {
    regime,
    scores: {
      tightness,
      riskAppetite,
      baseRateUsed: baseRate.used,
      baseRate: baseRate.value,
      curveSlope,
    },
    description: profile.description,
    constraints: profile.constraints,
    tightnessExplanation: buildTightnessExplanation(thresholds),
    riskAppetiteExplanation: RISK_APPETITE_EXPLANATION,
    dataWarnings,
    thresholds,
  };
};
