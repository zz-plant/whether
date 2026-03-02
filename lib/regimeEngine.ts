/**
 * Regime Engine core logic for scoring and classifying macro regimes.
 * Keeps deterministic, explainable rules close to their types.
 */
import type { MacroSeriesReading, TreasuryData, TreasuryYields } from "./types";

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
}

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

export const BASE_RATE_TIGHTNESS_THRESHOLD = 5;
export const TIGHTNESS_BASE_RATE_POINTS = 90;
export const TIGHTNESS_INVERSION_POINTS = 25;
export const TIGHTNESS_CAP = 100;
export const RISK_APPETITE_MIN_SLOPE = -1.0;
export const RISK_APPETITE_MAX_SLOPE = 1.5;
export const TIGHTNESS_REGIME_THRESHOLD = 70;
export const RISK_APPETITE_REGIME_THRESHOLD = 50;
export const REGIME_REVERSAL_DAYS = 30;
export const TREASURY_SOURCE_LABEL = "US Treasury Fiscal Data API";
const SCORE_MIN = 0;
const SCORE_MAX = 100;
const HY_SPREAD_STRESS_THRESHOLD = 4.5;
const HY_SPREAD_TIGHTNESS_MULTIPLIER = 6;
const HY_SPREAD_TIGHTNESS_CAP = 15;
const CHICAGO_FCI_TIGHTENING_THRESHOLD = 0;
const CHICAGO_FCI_TIGHTNESS_MULTIPLIER = 10;
const CHICAGO_FCI_TIGHTNESS_CAP = 10;
const VIX_SHOCK_THRESHOLD = 20;
const VIX_RISK_APPETITE_MULTIPLIER = 1.5;
const VIX_RISK_APPETITE_CAP = 20;
const VC_VELOCITY_SLOWDOWN_THRESHOLD = -5;
const VC_VELOCITY_RISK_APPETITE_MULTIPLIER = 1.5;
const VC_VELOCITY_RISK_APPETITE_CAP = 10;
const LAYOFF_PRESSURE_THRESHOLD = 65;
const LAYOFF_RISK_APPETITE_MULTIPLIER = 0.6;
const LAYOFF_RISK_APPETITE_CAP = 12;
const BASE_RATE_TIGHTNESS_MULTIPLIER = 180;
const CURVE_INVERSION_TIGHTNESS_MULTIPLIER = 50;
const DIAGNOSTIC_CONFIDENCE_HIGH_DELTA = 20;
const DIAGNOSTIC_CONFIDENCE_MEDIUM_DELTA = 10;
const DIAGNOSTIC_TRANSITION_WATCH_DELTA = 5;
const DIAGNOSTIC_INTENSITY_STRONG_DELTA = 25;
const DIAGNOSTIC_INTENSITY_STANDARD_DELTA = 10;
const TWO_WEAK_READS_WARNING_COUNT = 2;

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

export const getRegimeProfile = (regime: RegimeKey) => REGIME_PROFILES[regime];

const buildTightnessExplanation = (thresholds: RegimeThresholds) =>
  `Tightness score blends two components capped at ${TIGHTNESS_CAP}: ` +
  `base rate points ramp from 0 to ${TIGHTNESS_BASE_RATE_POINTS} as rates move above ${thresholds.baseRateTightness}%, ` +
  `and inversion points ramp from 0 to ${TIGHTNESS_INVERSION_POINTS} as slope moves below 0%.`;

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

const buildRegimeInputs = (
  treasury: TreasuryData,
  baseRate: ReturnType<typeof getBaseRate>,
  curveSlope: number | null
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
  const baseRatePoints = clamp(
    Math.round((baseRate - baseRateThreshold) * BASE_RATE_TIGHTNESS_MULTIPLIER),
    SCORE_MIN,
    TIGHTNESS_BASE_RATE_POINTS
  );
  const inversionPoints =
    curveSlope < SCORE_MIN
      ? clamp(
          Math.round(Math.abs(curveSlope) * CURVE_INVERSION_TIGHTNESS_MULTIPLIER),
          SCORE_MIN,
          TIGHTNESS_INVERSION_POINTS
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
  thresholds: RegimeThresholds
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

const applyMacroAdjustments = (
  tightness: number,
  riskAppetite: number,
  macroSeries: MacroSeriesReading[]
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
          Math.round((hySpread - HY_SPREAD_STRESS_THRESHOLD) * HY_SPREAD_TIGHTNESS_MULTIPLIER)
        ),
      SCORE_MIN,
      SCORE_MAX
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
          Math.round(chicagoFci * CHICAGO_FCI_TIGHTNESS_MULTIPLIER)
        ),
      SCORE_MIN,
      SCORE_MAX
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
          Math.round((vix - VIX_SHOCK_THRESHOLD) * VIX_RISK_APPETITE_MULTIPLIER)
        ),
      SCORE_MIN,
      SCORE_MAX
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
              VC_VELOCITY_RISK_APPETITE_MULTIPLIER
          )
        ),
      SCORE_MIN,
      SCORE_MAX
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
          Math.round((layoffs - LAYOFF_PRESSURE_THRESHOLD) * LAYOFF_RISK_APPETITE_MULTIPLIER)
        ),
      SCORE_MIN,
      SCORE_MAX
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

const computeDiagnostics = (
  tightness: number,
  riskAppetite: number,
  thresholds: RegimeThresholds,
  boundaryContributors: string[] = [],
  weakReadCount = 0
): RegimeDiagnostics => {
  const tightnessDelta = Math.round(tightness - thresholds.tightnessRegime);
  const riskAppetiteDelta = Math.round(riskAppetite - thresholds.riskAppetiteRegime);
  const nearestThresholdDelta = Math.min(Math.abs(tightnessDelta), Math.abs(riskAppetiteDelta));
  const confidence =
    nearestThresholdDelta >= DIAGNOSTIC_CONFIDENCE_HIGH_DELTA
      ? "HIGH"
      : nearestThresholdDelta >= DIAGNOSTIC_CONFIDENCE_MEDIUM_DELTA
        ? "MEDIUM"
        : "LOW";
  const transitionWatch = nearestThresholdDelta <= DIAGNOSTIC_TRANSITION_WATCH_DELTA;
  const intensity =
    nearestThresholdDelta >= DIAGNOSTIC_INTENSITY_STRONG_DELTA
      ? "STRONG"
      : nearestThresholdDelta >= DIAGNOSTIC_INTENSITY_STANDARD_DELTA
        ? "STANDARD"
        : "MILD";

  return {
    tightnessDelta,
    riskAppetiteDelta,
    nearestThresholdDelta,
    confidence,
    transitionWatch,
    intensity,
    boundaryContributors,
    weakReadCount,
    twoWeakReadsWarning: weakReadCount >= TWO_WEAK_READS_WARNING_COUNT,
  };
};

export const deriveRegimeTrend = (
  previous: RegimeAssessment | null,
  current: RegimeAssessment
): RegimeTrend => {
  if (!previous) {
    return "STABLE";
  }

  const tightnessMovedUp =
    previous.scores.tightness <= previous.thresholds.tightnessRegime &&
    current.scores.tightness > current.thresholds.tightnessRegime;
  const tightnessMovedDown =
    previous.scores.tightness > previous.thresholds.tightnessRegime &&
    current.scores.tightness <= current.thresholds.tightnessRegime;
  const riskMovedUp =
    previous.scores.riskAppetite <= previous.thresholds.riskAppetiteRegime &&
    current.scores.riskAppetite > current.thresholds.riskAppetiteRegime;
  const riskMovedDown =
    previous.scores.riskAppetite > previous.thresholds.riskAppetiteRegime &&
    current.scores.riskAppetite <= current.thresholds.riskAppetiteRegime;

  const improvingSignals = Number(tightnessMovedDown) + Number(riskMovedUp);
  const deterioratingSignals = Number(tightnessMovedUp) + Number(riskMovedDown);

  if (improvingSignals > 0 && deterioratingSignals > 0) {
    return "MIXED";
  }
  if (improvingSignals > 0) {
    return "IMPROVING";
  }
  if (deterioratingSignals > 0) {
    return "DETERIORATING";
  }
  return "STABLE";
};

export const buildRegimeChangeReasons = (
  previous: RegimeAssessment | null,
  current: RegimeAssessment
): RegimeChangeReason[] => {
  if (!previous) {
    return [];
  }

  const reasons: RegimeChangeReason[] = [];
  const previousTightnessThreshold = previous.thresholds.tightnessRegime;
  const currentTightnessThreshold = current.thresholds.tightnessRegime;
  const previousRiskThreshold = previous.thresholds.riskAppetiteRegime;
  const currentRiskThreshold = current.thresholds.riskAppetiteRegime;
  const previousBaseRateThreshold = previous.thresholds.baseRateTightness;
  const currentBaseRateThreshold = current.thresholds.baseRateTightness;

  const pushReason = (code: string, message: string) => {
    reasons.push({ code, message });
  };

  const addThresholdShift = (options: {
    previousValue: number;
    currentValue: number;
    previousThreshold: number;
    currentThreshold: number;
    up: { code: string; message: string };
    down: { code: string; message: string };
  }) => {
    if (
      options.previousValue <= options.previousThreshold &&
      options.currentValue > options.currentThreshold
    ) {
      pushReason(options.up.code, options.up.message);
    } else if (
      options.previousValue > options.previousThreshold &&
      options.currentValue <= options.currentThreshold
    ) {
      pushReason(options.down.code, options.down.message);
    }
  };

  if (previous.regime !== current.regime) {
    pushReason("regime-change", `Regime shifted from ${previous.regime} to ${current.regime}.`);
  }

  addThresholdShift({
    previousValue: previous.scores.tightness,
    currentValue: current.scores.tightness,
    previousThreshold: previousTightnessThreshold,
    currentThreshold: currentTightnessThreshold,
    up: {
      code: "tightness-upshift",
      message: `Tightness crossed above ${currentTightnessThreshold}.`,
    },
    down: {
      code: "tightness-downshift",
      message: `Tightness fell below ${currentTightnessThreshold}.`,
    },
  });

  addThresholdShift({
    previousValue: previous.scores.riskAppetite,
    currentValue: current.scores.riskAppetite,
    previousThreshold: previousRiskThreshold,
    currentThreshold: currentRiskThreshold,
    up: {
      code: "risk-appetite-upshift",
      message: `Risk appetite crossed above ${currentRiskThreshold}.`,
    },
    down: {
      code: "risk-appetite-downshift",
      message: `Risk appetite fell below ${currentRiskThreshold}.`,
    },
  });

  addThresholdShift({
    previousValue: previous.scores.baseRate,
    currentValue: current.scores.baseRate,
    previousThreshold: previousBaseRateThreshold,
    currentThreshold: currentBaseRateThreshold,
    up: {
      code: "base-rate-upshift",
      message: `Base rate crossed above ${currentBaseRateThreshold}%.`,
    },
    down: {
      code: "base-rate-downshift",
      message: `Base rate fell below ${currentBaseRateThreshold}%.`,
    },
  });

  const previousSlope = previous.scores.curveSlope;
  const currentSlope = current.scores.curveSlope;
  if (previousSlope !== null && currentSlope !== null) {
    if (previousSlope >= 0 && currentSlope < 0) {
      pushReason("curve-slope-negative", "Curve slope turned negative.");
    } else if (previousSlope <= 0 && currentSlope > 0) {
      pushReason("curve-slope-positive", "Curve slope turned positive.");
    }
  }

  if (reasons.length === 0) {
    pushReason("signals-updated", "Signal values updated since the last read.");
  }

  return reasons;
};

export const evaluateRegime = (
  treasury: TreasuryData,
  overrides?: Partial<RegimeThresholds>,
  macroSeries: MacroSeriesReading[] = []
): RegimeAssessment => {
  const dataWarnings: string[] = [];
  const baseRate = getBaseRate(treasury.yields);
  const curveSlope = computeCurveSlope(treasury.yields);
  const thresholds = resolveThresholds(overrides);
  const inputs = buildRegimeInputs(treasury, baseRate, curveSlope);

  if (baseRate.used === "MISSING") {
    dataWarnings.push("Base rate missing; defaulted to threshold for conservative scoring.");
  }
  if (curveSlope === null) {
    dataWarnings.push("Curve slope missing; defaulted to cautious floor for scoring.");
  }

  const baseRateForScore =
    baseRate.used === "MISSING" ? thresholds.baseRateTightness : baseRate.value;
  const curveSlopeForScore = curveSlope ?? RISK_APPETITE_MIN_SLOPE;

  const baselineTightness = computeTightnessScore(
    baseRateForScore,
    curveSlopeForScore,
    thresholds.baseRateTightness
  );
  const baselineRiskAppetite = computeRiskAppetiteScore(curveSlopeForScore);
  const macroAdjusted = applyMacroAdjustments(baselineTightness, baselineRiskAppetite, macroSeries);
  const tightness = macroAdjusted.tightness;
  const riskAppetite = macroAdjusted.riskAppetite;
  const regime = classifyRegime(tightness, riskAppetite, thresholds);
  const diagnostics = computeDiagnostics(
    tightness,
    riskAppetite,
    thresholds,
    macroAdjusted.boundaryContributors,
    macroAdjusted.weakReadCount
  );
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
    diagnostics,
    description: profile.description,
    constraints: profile.constraints,
    tightnessExplanation: buildTightnessExplanation(thresholds),
    riskAppetiteExplanation: RISK_APPETITE_EXPLANATION,
    dataWarnings,
    thresholds,
    inputs,
  };
};
