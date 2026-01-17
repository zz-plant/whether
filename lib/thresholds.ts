/**
 * Threshold parsing helpers for URL-driven regime tuning.
 * Keeps defaults and validation centralized for auditability.
 */
import type { RegimeThresholds } from "./regimeEngine";
import { DEFAULT_THRESHOLDS } from "./regimeEngine";

export const THRESHOLD_PARAM_KEYS = {
  baseRate: "baseRateThreshold",
  tightness: "tightnessThreshold",
  risk: "riskThreshold",
} as const;

type ThresholdParamKey = (typeof THRESHOLD_PARAM_KEYS)[keyof typeof THRESHOLD_PARAM_KEYS];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const parseNumericParam = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return clamp(parsed, min, max);
};

export const parseThresholdsFromSearchParams = (searchParams?: {
  [key: string]: string | string[] | undefined;
}): RegimeThresholds => {
  const baseRate = parseNumericParam(
    typeof searchParams?.[THRESHOLD_PARAM_KEYS.baseRate] === "string"
      ? (searchParams?.[THRESHOLD_PARAM_KEYS.baseRate] as string)
      : undefined,
    DEFAULT_THRESHOLDS.baseRateTightness,
    0,
    10
  );
  const tightness = parseNumericParam(
    typeof searchParams?.[THRESHOLD_PARAM_KEYS.tightness] === "string"
      ? (searchParams?.[THRESHOLD_PARAM_KEYS.tightness] as string)
      : undefined,
    DEFAULT_THRESHOLDS.tightnessRegime,
    0,
    100
  );
  const risk = parseNumericParam(
    typeof searchParams?.[THRESHOLD_PARAM_KEYS.risk] === "string"
      ? (searchParams?.[THRESHOLD_PARAM_KEYS.risk] as string)
      : undefined,
    DEFAULT_THRESHOLDS.riskAppetiteRegime,
    0,
    100
  );

  return {
    baseRateTightness: baseRate,
    tightnessRegime: tightness,
    riskAppetiteRegime: risk,
  };
};

export const buildThresholdSearchParams = (
  thresholds: RegimeThresholds,
  defaults: RegimeThresholds,
  params: URLSearchParams
) => {
  const entries: Array<[ThresholdParamKey, number, number]> = [
    [THRESHOLD_PARAM_KEYS.baseRate, thresholds.baseRateTightness, defaults.baseRateTightness],
    [THRESHOLD_PARAM_KEYS.tightness, thresholds.tightnessRegime, defaults.tightnessRegime],
    [THRESHOLD_PARAM_KEYS.risk, thresholds.riskAppetiteRegime, defaults.riskAppetiteRegime],
  ];

  entries.forEach(([key, value, defaultValue]) => {
    if (value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value.toString());
    }
  });

  return params;
};
