import type { GovernanceParameterSet } from "./policy/governance";
import { advanceRegimeState, type RegimeStateTransition } from "./report/regimeStateMachine";
import type { TreasuryData, TreasuryYields } from "./types";

export type RegimeKey = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

export interface RegimeScores {
  tightness: number;
  riskAppetite: number;
  baseRateUsed: "1M" | "3M" | "MISSING";
  baseRate: number;
  curveSlope: number | null;
}

export type RegimeInput = {
  id: "base-rate" | "two-year" | "ten-year" | "curve-slope";
  label: string;
  value: number | null;
  unit: string;
  sourceLabel: string;
  sourceUrl: string;
  recordDate: string;
  fetchedAt: string;
  derivedFrom?: string;
  notes?: string;
};

export type RegimeSignalInfluenceKey = "tightness" | "riskAppetite" | "baseRate" | "curveSlope";

export type RegimeSignalInfluence = {
  key: RegimeSignalInfluenceKey;
  label: string;
  influence: number | null;
  unavailable: boolean;
};

export type RegimeTrend = "IMPROVING" | "DETERIORATING" | "MIXED" | "STABLE";

export type RegimeDiagnostics = {
  tightnessDelta: number;
  riskAppetiteDelta: number;
  nearestThresholdDelta: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  transitionWatch: boolean;
  intensity: "MILD" | "STANDARD" | "STRONG";
  boundaryContributors: string[];
  weakReadCount: number;
  twoWeakReadsWarning: boolean;
};

export type RegimeChangeReason = {
  code: string;
  message: string;
};

export type PolicyPosture = "RISK_ON" | "SAFETY_MODE" | "TRANSITION";

export interface PolicySignalNormalization {
  id: "BASE_RATE" | "CURVE_SLOPE" | "BBB_CREDIT_SPREAD" | "CPI_YOY" | "UNEMPLOYMENT_RATE";
  value: number | null;
  z: number | null;
  directionalZ: number | null;
  clippedZ: number | null;
}

export interface PolicyCompositeScores {
  cts: number;
  ras: number;
}

export type PolicyBand = "NEUTRAL" | "ELEVATED" | "EXTREME";

export interface PolicyConfidenceIndex {
  agreement: number;
  distanceFromNeutral: number;
  volatility30d: number;
}

export interface PolicyRefusalState {
  refused: boolean;
  reasons: string[];
  fallbackMessage?: "NO_POSTURE_CHANGE_RECOMMENDED" | "PROCEED_WITH_CAUTION";
  executionMode?: "REVERSIBLE_BETS_ONLY";
}

export interface PolicyAssessment {
  version: string;
  normalizations: PolicySignalNormalization[];
  composites: PolicyCompositeScores;
  posture: PolicyPosture;
  band: PolicyBand;
  confidenceIndex: PolicyConfidenceIndex;
  refusal: PolicyRefusalState;
  governanceParameters: GovernanceParameterSet;
}

export interface RegimeThresholds {
  baseRateTightness: number;
  tightnessRegime: number;
  riskAppetiteRegime: number;
}

export interface RegimeAssessment {
  regime: RegimeKey;
  regimeTransition?: RegimeStateTransition;
  scores: RegimeScores;
  diagnostics: RegimeDiagnostics;
  description: string;
  constraints: string[];
  tightnessExplanation: string;
  riskAppetiteExplanation: string;
  dataWarnings: string[];
  thresholds: RegimeThresholds;
  inputs: RegimeInput[];
  policyAssessment: PolicyAssessment;
  signalInfluence?: RegimeSignalInfluence[];
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
export const TREASURY_SOURCE_LABEL = "FRED CSV (DGS1MO, DGS3MO, DGS2, DGS10)";

const SCORE_MIN = 0;
const SCORE_MAX = 100;
const BASE_RATE_TIGHTNESS_MULTIPLIER = 180;
const CURVE_INVERSION_TIGHTNESS_MULTIPLIER = 50;

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

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

export const buildRegimeInputs = (
  treasury: TreasuryData,
  baseRate: ReturnType<typeof getBaseRate>,
  curveSlope: number | null,
): RegimeInput[] => {
  const baseRateLabel =
    baseRate.used === "MISSING" ? "Policy base rate (missing)" : `Policy base rate (${baseRate.used})`;
  const baseRateNotes =
    baseRate.used === "MISSING"
      ? "No 1M or 3M Treasury rate available; defaulted to 0% for scoring."
      : "Used as the cost-of-money anchor for tightness scoring.";
  const sourceUrl = treasury.source;

  return [
    {
      id: "base-rate",
      label: baseRateLabel,
      value: baseRate.used === "MISSING" ? null : baseRate.value,
      unit: "%",
      sourceLabel: TREASURY_SOURCE_LABEL,
      sourceUrl,
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
      notes: baseRateNotes,
    },
    {
      id: "two-year",
      label: "US Treasury 2Y",
      value: treasury.yields.twoYear ?? null,
      unit: "%",
      sourceLabel: TREASURY_SOURCE_LABEL,
      sourceUrl,
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
    },
    {
      id: "ten-year",
      label: "US Treasury 10Y",
      value: treasury.yields.tenYear ?? null,
      unit: "%",
      sourceLabel: TREASURY_SOURCE_LABEL,
      sourceUrl,
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
    },
    {
      id: "curve-slope",
      label: "Yield curve slope (10Y - 2Y)",
      value: curveSlope,
      unit: "%",
      sourceLabel: TREASURY_SOURCE_LABEL,
      sourceUrl,
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
      derivedFrom: "US Treasury 10Y and 2Y yields",
      notes: "Derived metric used to score risk appetite.",
    },
  ];
};

export const resolveThresholds = (
  overrides?: Partial<RegimeThresholds>,
): RegimeThresholds => ({
  baseRateTightness: overrides?.baseRateTightness ?? DEFAULT_THRESHOLDS.baseRateTightness,
  tightnessRegime: overrides?.tightnessRegime ?? DEFAULT_THRESHOLDS.tightnessRegime,
  riskAppetiteRegime: overrides?.riskAppetiteRegime ?? DEFAULT_THRESHOLDS.riskAppetiteRegime,
});

export const computeTightnessScore = (
  baseRate: number,
  curveSlope: number,
  baseRateThreshold: number,
) => {
  const baseRatePoints = clamp(
    Math.round((baseRate - baseRateThreshold) * BASE_RATE_TIGHTNESS_MULTIPLIER),
    SCORE_MIN,
    TIGHTNESS_BASE_RATE_POINTS,
  );
  const inversionPoints =
    curveSlope < SCORE_MIN
      ? clamp(
          Math.round(Math.abs(curveSlope) * CURVE_INVERSION_TIGHTNESS_MULTIPLIER),
          SCORE_MIN,
          TIGHTNESS_INVERSION_POINTS,
        )
      : SCORE_MIN;
  const score = baseRatePoints + inversionPoints;

  return clamp(score, SCORE_MIN, TIGHTNESS_CAP);
};

export const computeRiskAppetiteScore = (curveSlope: number) => {
  const normalized =
    (curveSlope - RISK_APPETITE_MIN_SLOPE) / (RISK_APPETITE_MAX_SLOPE - RISK_APPETITE_MIN_SLOPE);
  return clamp(Math.round(normalized * SCORE_MAX), SCORE_MIN, SCORE_MAX);
};

export const classifyRegime = (
  tightness: number,
  riskAppetite: number,
  thresholds: RegimeThresholds,
): RegimeKey =>
  advanceRegimeState(null, {
    tightness,
    riskAppetite,
    thresholds,
    diagnostics: {
      confidence: "HIGH",
      nearestThresholdDelta: Number.POSITIVE_INFINITY,
      transitionWatch: false,
    },
  }).nextState;
