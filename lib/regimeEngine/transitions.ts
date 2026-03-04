import type { RegimeAssessment, RegimeChangeReason, RegimeTrend } from "./types";

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
