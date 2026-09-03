/**
 * Regime Engine core logic for scoring and classifying macro regimes.
 * Keeps deterministic, explainable rules close to their types.
 */
import { advanceRegimeState, type RegimeMachineSnapshot } from "./report/regimeStateMachine";
import type { MacroSeriesReading, TreasuryData } from "./types";
import {
  RISK_APPETITE_EXPLANATION,
  MISSING_SLOPE_FALLBACK,
  buildRegimeInputs,
  buildTightnessExplanation,
  computeCurveSlope,
  computeRiskAppetiteScore,
  TIGHTNESS_CAP,
  computeTightnessPressure,
  computeTightnessScore,
  getBaseRate,
  getRegimeProfile,
  resolveThresholds,
  type RegimeAssessment,
  type RegimeThresholds,
} from "./regimeEngineCore";
import {
  applyMacroAdjustments,
  buildSignalInfluence,
  computeDiagnostics,
} from "./regimeEngineDiagnostics";
import { computePolicyAssessment } from "./regimeEnginePolicy";

export * from "./regimeEngineCore";
export {
  MACRO_ADJUSTMENT_CONSTANTS,
  applyMacroAdjustments,
  buildSignalInfluence,
  buildRegimeChangeReasons,
  computeDiagnostics,
  deriveRegimeTrend,
} from "./regimeEngineDiagnostics";

export const evaluateRegime = (
  treasury: TreasuryData,
  overrides?: Partial<RegimeThresholds>,
  macroSeries: MacroSeriesReading[] = [],
  previousMachineState: RegimeMachineSnapshot | null = null,
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
  const curveSlopeForScore = curveSlope ?? MISSING_SLOPE_FALLBACK;

  const baselineTightness = computeTightnessScore(
    baseRateForScore,
    curveSlopeForScore,
    thresholds.baseRateTightness,
  );
  const tightnessPressure = computeTightnessPressure(
    baseRateForScore,
    curveSlopeForScore,
    thresholds.baseRateTightness,
  );
  const baselineRiskAppetite = computeRiskAppetiteScore(curveSlopeForScore);
  const macroAdjusted = applyMacroAdjustments(baselineTightness, baselineRiskAppetite, macroSeries);
  const tightness = macroAdjusted.tightness;
  const riskAppetite = macroAdjusted.riskAppetite;
  const diagnostics = computeDiagnostics(
    tightness,
    riskAppetite,
    thresholds,
    macroAdjusted.boundaryContributors,
    macroAdjusted.weakReadCount,
    baseRate.used === "MISSING" || curveSlope === null,
  );
  const regimeTransition = advanceRegimeState(previousMachineState, {
    tightness,
    riskAppetite,
    thresholds,
    diagnostics,
  });
  const regime = regimeTransition.nextState;
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
    regimeTransition,
    scores: {
      tightness,
      tightnessPressure,
      tightnessSaturated: tightnessPressure > TIGHTNESS_CAP,
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
    signalInfluence: buildSignalInfluence({
      tightness,
      riskAppetite,
      baseRate: baseRate.used === "MISSING" ? null : baseRate.value,
      curveSlope,
      thresholds,
    }),
  };
};
