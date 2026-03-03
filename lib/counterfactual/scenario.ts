import {
  classifyRegime,
  computeRiskAppetiteScore,
  computeTightnessScore,
  type RegimeAssessment,
} from "../regimeEngine";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const parseNumericParam = (value: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export type ScenarioShift = {
  rateShiftBps: number;
  slopeShiftBps: number;
};

export const computeScenarioOutcome = (
  assessment: RegimeAssessment,
  shift: ScenarioShift,
) => {
  const baseRate = assessment.scores.baseRate;
  const curveSlope = assessment.scores.curveSlope ?? 0;
  const adjustedBaseRate = clamp(baseRate + shift.rateShiftBps / 100, 0, 15);
  const adjustedSlope = clamp(curveSlope + shift.slopeShiftBps / 100, -5, 5);
  const adjustedTightness = computeTightnessScore(
    adjustedBaseRate,
    adjustedSlope,
    assessment.thresholds.baseRateTightness,
  );
  const adjustedRiskAppetite = computeRiskAppetiteScore(adjustedSlope);
  const adjustedRegime = classifyRegime(
    adjustedTightness,
    adjustedRiskAppetite,
    assessment.thresholds,
  );

  return {
    baseRate,
    curveSlope,
    adjustedBaseRate,
    adjustedSlope,
    adjustedTightness,
    adjustedRiskAppetite,
    adjustedRegime,
  };
};
