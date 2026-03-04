import type { GovernanceParameterSet } from "../policy/governance";
import type { MacroSeriesReading, TreasuryData, TreasuryYields } from "../types";

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

export interface RegimeThresholds {
  baseRateTightness: number;
  tightnessRegime: number;
  riskAppetiteRegime: number;
}

export interface RegimeProfile {
  description: string;
  constraints: string[];
}

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
  fallbackMessage?: "NO_POSTURE_CHANGE_RECOMMENDED";
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

export interface RegimeAssessment {
  regime: RegimeKey;
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
}

export type { MacroSeriesReading, TreasuryData, TreasuryYields };
