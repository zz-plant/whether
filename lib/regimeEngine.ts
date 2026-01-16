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
  curveSlope: number;
}

export interface RegimeAssessment {
  regime: RegimeKey;
  scores: RegimeScores;
  description: string;
  constraints: string[];
  tightnessExplanation: string;
  riskAppetiteExplanation: string;
  dataWarnings: string[];
}

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

const TIGHTNESS_EXPLANATION =
  "Tightness score: base rate > 5% adds 90 points. Inverted curve adds 25 points. Score is capped at 100.";

const RISK_APPETITE_EXPLANATION =
  "Risk appetite score maps the 10Y-2Y slope from -1.0% (very cautious) to +1.5% (confident), scaled to 0-100.";

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

export const computeCurveSlope = (yields: TreasuryYields) => {
  const tenYear = typeof yields.tenYear === "number" ? yields.tenYear : 0;
  const twoYear = typeof yields.twoYear === "number" ? yields.twoYear : 0;
  return tenYear - twoYear;
};

export const computeTightnessScore = (baseRate: number, curveSlope: number) => {
  let score = 0;

  if (baseRate > 5) {
    score += 90;
  }

  if (curveSlope < 0) {
    score += 25;
  }

  return clamp(score, 0, 100);
};

export const computeRiskAppetiteScore = (curveSlope: number) => {
  const minSlope = -1.0;
  const maxSlope = 1.5;
  const normalized = (curveSlope - minSlope) / (maxSlope - minSlope);
  return clamp(Math.round(normalized * 100), 0, 100);
};

export const classifyRegime = (tightness: number, riskAppetite: number): RegimeKey => {
  if (tightness > 70 && riskAppetite < 50) {
    return "SCARCITY";
  }
  if (tightness > 70 && riskAppetite > 50) {
    return "DEFENSIVE";
  }
  if (tightness < 70 && riskAppetite < 50) {
    return "VOLATILE";
  }
  return "EXPANSION";
};

export const evaluateRegime = (treasury: TreasuryData): RegimeAssessment => {
  const dataWarnings: string[] = [];
  const baseRate = getBaseRate(treasury.yields);
  const curveSlope = computeCurveSlope(treasury.yields);

  if (baseRate.used === "MISSING") {
    dataWarnings.push("Base rate missing; defaulted to 0% for scoring.");
  }
  if (treasury.yields.tenYear == null || treasury.yields.twoYear == null) {
    dataWarnings.push("Curve slope missing; defaulted to 0% for scoring.");
  }

  const tightness = computeTightnessScore(baseRate.value, curveSlope);
  const riskAppetite = computeRiskAppetiteScore(curveSlope);
  const regime = classifyRegime(tightness, riskAppetite);
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
    tightnessExplanation: TIGHTNESS_EXPLANATION,
    riskAppetiteExplanation: RISK_APPETITE_EXPLANATION,
    dataWarnings,
  };
};
