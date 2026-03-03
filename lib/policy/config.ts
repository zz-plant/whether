import type { MacroSeriesId } from "../types";

export type PolicySignalId = "BASE_RATE" | "CURVE_SLOPE" | "BBB_CREDIT_SPREAD" | "CPI_YOY" | "UNEMPLOYMENT_RATE";

export interface PolicySignalConfig {
  id: PolicySignalId;
  source: "TREASURY" | "FRED" | "BLS";
  cadence: "DAILY" | "MONTHLY";
  directional: "HIGHER_IS_TIGHTER" | "HIGHER_IS_LOOSER";
  macroSeriesId?: Extract<MacroSeriesId, "BBB_CREDIT_SPREAD" | "CPI_YOY" | "UNEMPLOYMENT_RATE">;
}

export interface CompositeWeights {
  baseRate: number;
  bbbSpread: number;
  curveSlope: number;
}

export interface PolicyThresholdBands {
  neutralMax: number;
  elevatedMax: number;
}

export interface PolicyRefusalConfig {
  disagreementThreshold: number;
  volatilityThreshold: number;
  maxMissingSignalCount: number;
}

export interface PolicySpecConfig {
  version: string;
  rollingWindowYears: number;
  zClip: number;
  signals: PolicySignalConfig[];
  weights: CompositeWeights;
  bands: PolicyThresholdBands;
  refusal: PolicyRefusalConfig;
}

export const POLICY_SPEC_V1: PolicySpecConfig = {
  version: "policy-v1",
  rollingWindowYears: 10,
  zClip: 3,
  signals: [
    { id: "BASE_RATE", source: "TREASURY", cadence: "DAILY", directional: "HIGHER_IS_TIGHTER" },
    { id: "CURVE_SLOPE", source: "TREASURY", cadence: "DAILY", directional: "HIGHER_IS_LOOSER" },
    {
      id: "BBB_CREDIT_SPREAD",
      source: "FRED",
      cadence: "DAILY",
      directional: "HIGHER_IS_TIGHTER",
      macroSeriesId: "BBB_CREDIT_SPREAD",
    },
    {
      id: "CPI_YOY",
      source: "BLS",
      cadence: "MONTHLY",
      directional: "HIGHER_IS_TIGHTER",
      macroSeriesId: "CPI_YOY",
    },
    {
      id: "UNEMPLOYMENT_RATE",
      source: "BLS",
      cadence: "MONTHLY",
      directional: "HIGHER_IS_TIGHTER",
      macroSeriesId: "UNEMPLOYMENT_RATE",
    },
  ],
  weights: {
    baseRate: 0.5,
    bbbSpread: 0.5,
    curveSlope: 0.7,
  },
  bands: {
    neutralMax: 0.5,
    elevatedMax: 1.5,
  },
  refusal: {
    disagreementThreshold: 1,
    volatilityThreshold: 1,
    maxMissingSignalCount: 1,
  },
};

export const POLICY_BBB_WEIGHT_FOR_RAS = 1 - POLICY_SPEC_V1.weights.curveSlope;
