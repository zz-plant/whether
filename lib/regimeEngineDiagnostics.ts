import type { MacroSeriesReading } from "./types";
import {
  clamp,
  type RegimeAssessment,
  type RegimeChangeReason,
  type RegimeDiagnostics,
  type RegimeSignalInfluence,
  type RegimeThresholds,
  type RegimeTrend,
} from "./regimeEngineCore";

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
const DIAGNOSTIC_CONFIDENCE_HIGH_DELTA = 13;
const DIAGNOSTIC_CONFIDENCE_MEDIUM_DELTA = 6;
const DIAGNOSTIC_TRANSITION_WATCH_DELTA = 5;
const DIAGNOSTIC_INTENSITY_STRONG_DELTA = 25;
const DIAGNOSTIC_INTENSITY_STANDARD_DELTA = 10;
const TWO_WEAK_READS_WARNING_COUNT = 2;

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
    contributors.push("High-yield bond market stress");
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
    contributors.push("Financial conditions are tightening");
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
    contributors.push("Stock market volatility is high");
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

export const computeDiagnostics = (
  tightness: number,
  riskAppetite: number,
  thresholds: RegimeThresholds,
  boundaryContributors: string[] = [],
  weakReadCount = 0,
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

export const buildSignalInfluence = ({
  tightness,
  riskAppetite,
  baseRate,
  curveSlope,
  thresholds,
}: {
  tightness: number;
  riskAppetite: number;
  baseRate: number | null;
  curveSlope: number | null;
  thresholds: RegimeThresholds;
}): RegimeSignalInfluence[] => [
  {
    key: "tightness",
    label: "Cash availability",
    influence: Math.abs(tightness - thresholds.tightnessRegime),
    unavailable: false,
  },
  {
    key: "riskAppetite",
    label: "Risk appetite",
    influence: Math.abs(riskAppetite - thresholds.riskAppetiteRegime),
    unavailable: false,
  },
  {
    key: "baseRate",
    label: "Fed interest rate",
    influence:
      typeof baseRate === "number" ? Math.abs(baseRate - thresholds.baseRateTightness) : null,
    unavailable: typeof baseRate !== "number",
  },
  {
    key: "curveSlope",
    label: "Recession warning gauge",
    influence: typeof curveSlope === "number" ? Math.abs(curveSlope) : null,
    unavailable: typeof curveSlope !== "number",
  },
];

export const deriveRegimeTrend = (
  previous: RegimeAssessment | null,
  current: RegimeAssessment,
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
  current: RegimeAssessment,
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
      message: `Cash availability crossed above ${currentTightnessThreshold}.`,
    },
    down: {
      code: "tightness-downshift",
      message: `Cash availability fell below ${currentTightnessThreshold}.`,
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
      message: `Fed interest rate crossed above ${currentBaseRateThreshold}%.`,
    },
    down: {
      code: "base-rate-downshift",
      message: `Fed interest rate fell below ${currentBaseRateThreshold}%.`,
    },
  });

  const previousSlope = previous.scores.curveSlope;
  const currentSlope = current.scores.curveSlope;
  if (previousSlope !== null && currentSlope !== null) {
    if (previousSlope >= 0 && currentSlope < 0) {
      pushReason("curve-slope-negative", "Recession warning gauge turned negative (yield curve inverted).");
    } else if (previousSlope <= 0 && currentSlope > 0) {
      pushReason("curve-slope-positive", "Recession warning gauge turned positive (yield curve normal).");
    }
  }

  if (reasons.length === 0) {
    pushReason("signals-updated", "Signal values updated since the last read.");
  }

  return reasons;
};
