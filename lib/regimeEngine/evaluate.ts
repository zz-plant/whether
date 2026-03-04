import { RISK_APPETITE_EXPLANATION, RISK_APPETITE_MIN_SLOPE, buildTightnessExplanation, getRegimeProfile } from "./constants";
import { computeDiagnostics } from "./diagnostics";
import { computePolicyAssessment } from "./policy";
import {
  applyMacroAdjustments,
  buildRegimeInputs,
  classifyRegime,
  computeCurveSlope,
  computeRiskAppetiteScore,
  computeTightnessScore,
  getBaseRate,
  resolveThresholds,
} from "./scoring";
import type { MacroSeriesReading, RegimeAssessment, RegimeThresholds, TreasuryData } from "./types";

export const evaluateRegime = (
  treasury: TreasuryData,
  overrides?: Partial<RegimeThresholds>,
  macroSeries: MacroSeriesReading[] = [],
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
    thresholds.baseRateTightness,
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
    macroAdjusted.weakReadCount,
  );
  const profile = getRegimeProfile(regime);
  const policyAssessment = computePolicyAssessment(
    treasury,
    thresholds,
    macroSeries,
    tightness,
    riskAppetite,
  );

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
    policyAssessment,
  };
};
