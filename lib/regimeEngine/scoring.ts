import {
  BASE_RATE_TIGHTNESS_MULTIPLIER,
  CHICAGO_FCI_TIGHTENING_THRESHOLD,
  CHICAGO_FCI_TIGHTNESS_CAP,
  CHICAGO_FCI_TIGHTNESS_MULTIPLIER,
  CURVE_INVERSION_TIGHTNESS_MULTIPLIER,
  DEFAULT_THRESHOLDS,
  HY_SPREAD_STRESS_THRESHOLD,
  HY_SPREAD_TIGHTNESS_CAP,
  HY_SPREAD_TIGHTNESS_MULTIPLIER,
  LAYOFF_PRESSURE_THRESHOLD,
  LAYOFF_RISK_APPETITE_CAP,
  LAYOFF_RISK_APPETITE_MULTIPLIER,
  RISK_APPETITE_MAX_SLOPE,
  RISK_APPETITE_MIN_SLOPE,
  SCORE_MAX,
  SCORE_MIN,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_CAP,
  TIGHTNESS_INVERSION_POINTS,
  TREASURY_SOURCE_LABEL,
  VC_VELOCITY_RISK_APPETITE_CAP,
  VC_VELOCITY_RISK_APPETITE_MULTIPLIER,
  VC_VELOCITY_SLOWDOWN_THRESHOLD,
  VIX_RISK_APPETITE_CAP,
  VIX_RISK_APPETITE_MULTIPLIER,
  VIX_SHOCK_THRESHOLD,
} from "./constants";
import type {
  MacroSeriesReading,
  RegimeInput,
  RegimeKey,
  RegimeThresholds,
  TreasuryData,
  TreasuryYields,
} from "./types";

export type BaseRateResolution = {
  value: number;
  used: "1M" | "3M" | "MISSING";
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getBaseRate = (yields: TreasuryYields): BaseRateResolution => {
  if (typeof yields.oneMonth === "number") {
    return { value: yields.oneMonth, used: "1M" };
  }
  if (typeof yields.threeMonth === "number") {
    return { value: yields.threeMonth, used: "3M" };
  }
  return { value: 0, used: "MISSING" };
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
  baseRate: BaseRateResolution,
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
): RegimeKey => {
  if (tightness > thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime) {
    return "SCARCITY";
  }
  if (tightness > thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime) {
    return "DEFENSIVE";
  }
  if (tightness <= thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime) {
    return "VOLATILE";
  }
  return "EXPANSION";
};

const getMacroValue = (series: MacroSeriesReading[], id: MacroSeriesReading["id"]) =>
  series.find((entry) => entry.id === id)?.value ?? null;

export const applyMacroAdjustments = (
  tightness: number,
  riskAppetite: number,
  macroSeries: MacroSeriesReading[],
) => {
  let adjustedTightness = tightness;
  let adjustedRiskAppetite = riskAppetite;
  const contributors: string[] = [];
  let weakReadCount = 0;

  const hySpread = getMacroValue(macroSeries, "HY_CREDIT_SPREAD");
  if (typeof hySpread === "number" && hySpread >= HY_SPREAD_STRESS_THRESHOLD) {
    adjustedTightness = clamp(
      adjustedTightness +
        Math.min(
          HY_SPREAD_TIGHTNESS_CAP,
          Math.round((hySpread - HY_SPREAD_STRESS_THRESHOLD) * HY_SPREAD_TIGHTNESS_MULTIPLIER),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("HY OAS stress");
    weakReadCount += 1;
  }

  const chicagoFci = getMacroValue(macroSeries, "CHICAGO_FCI");
  if (typeof chicagoFci === "number" && chicagoFci >= CHICAGO_FCI_TIGHTENING_THRESHOLD) {
    adjustedTightness = clamp(
      adjustedTightness +
        Math.min(
          CHICAGO_FCI_TIGHTNESS_CAP,
          Math.round(chicagoFci * CHICAGO_FCI_TIGHTNESS_MULTIPLIER),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("Financial conditions tightening");
    weakReadCount += 1;
  }

  const vix = getMacroValue(macroSeries, "VIX_INDEX");
  if (typeof vix === "number" && vix >= VIX_SHOCK_THRESHOLD) {
    adjustedRiskAppetite = clamp(
      adjustedRiskAppetite -
        Math.min(
          VIX_RISK_APPETITE_CAP,
          Math.round((vix - VIX_SHOCK_THRESHOLD) * VIX_RISK_APPETITE_MULTIPLIER),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("Equity volatility shock");
    weakReadCount += 1;
  }

  const vcVelocity = getMacroValue(macroSeries, "VC_FUNDING_VELOCITY");
  if (typeof vcVelocity === "number" && vcVelocity <= VC_VELOCITY_SLOWDOWN_THRESHOLD) {
    adjustedRiskAppetite = clamp(
      adjustedRiskAppetite -
        Math.min(
          VC_VELOCITY_RISK_APPETITE_CAP,
          Math.round(
            Math.abs(vcVelocity - VC_VELOCITY_SLOWDOWN_THRESHOLD) *
              VC_VELOCITY_RISK_APPETITE_MULTIPLIER,
          ),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("VC funding slowdown");
    weakReadCount += 1;
  }

  const layoffs = getMacroValue(macroSeries, "TECH_LAYOFF_TREND");
  if (typeof layoffs === "number" && layoffs >= LAYOFF_PRESSURE_THRESHOLD) {
    adjustedRiskAppetite = clamp(
      adjustedRiskAppetite -
        Math.min(
          LAYOFF_RISK_APPETITE_CAP,
          Math.round((layoffs - LAYOFF_PRESSURE_THRESHOLD) * LAYOFF_RISK_APPETITE_MULTIPLIER),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("Tech layoff pressure");
    weakReadCount += 1;
  }

  return {
    tightness: adjustedTightness,
    riskAppetite: adjustedRiskAppetite,
    boundaryContributors: contributors,
    weakReadCount,
  };
};
