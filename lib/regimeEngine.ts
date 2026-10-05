/**
 * Regime Engine core logic for scoring and classifying macro regimes.
 * Keeps deterministic, explainable rules close to their types.
 */
import { advanceRegimeState, type RegimeMachineSnapshot } from "./report/regimeStateMachine";
import type { MacroSeriesReading, TreasuryData } from "./types";
import {
  RISK_APPETITE_EXPLANATION,
  MISSING_SLOPE_FALLBACK,
  TIGHTNESS_CAP,
  buildRegimeInputs,
  buildTightnessExplanation,
  computeBaseRateVelocityPoints,
  computeCurveSlope,
  computeRiskAppetiteScore,
  computeTightnessPressure,
  computeTightnessScore,
  getBaseRate,
  getRegimeProfile,
  resolveThresholds,
  type RegimeAssessment,
  type RegimeDiagnostics,
  type RegimeEvaluationContext,
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
  buildSignalInfluence,
  deriveRegimeTrend,
} from "./regimeEngineDiagnostics";

export const evaluateRegime = (
  treasury: TreasuryData,
  overrides?: Partial<RegimeThresholds>,
  macroSeries: MacroSeriesReading[] = [],
  previousMachineState: RegimeMachineSnapshot | null = null,
  context: RegimeEvaluationContext = {},
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

  const velocity = computeBaseRateVelocityPoints(context.baseRateHistory);
  if (velocity.points > 0) {
    dataWarnings.push(
      `Tightening-speed term active: the base rate moved ${velocity.delta?.toFixed(2)}% over its trailing window, contributing ${velocity.points} tightness points.`,
    );
  }

  const baseRateForScore =
    baseRate.used === "MISSING" ? thresholds.baseRateTightness : baseRate.value;
  const curveSlopeForScore = curveSlope ?? MISSING_SLOPE_FALLBACK;

  const baselineTightness = computeTightnessScore(
    baseRateForScore,
    curveSlopeForScore,
    thresholds.baseRateTightness,
    velocity.points,
  );
  const tightnessPressure = computeTightnessPressure(
    baseRateForScore,
    curveSlopeForScore,
    thresholds.baseRateTightness,
    velocity.points,
  );
  const baselineRiskAppetite = computeRiskAppetiteScore(curveSlopeForScore);
  const macroAdjusted = applyMacroAdjustments(baselineTightness, baselineRiskAppetite, macroSeries);
  const tightness = macroAdjusted.tightness;
  const riskAppetite = macroAdjusted.riskAppetite;
  if (macroAdjusted.marketStressVetoApplied) {
    dataWarnings.push(
      "Market stress veto is capping the risk-appetite score: realized volatility, not the curve, is setting the ceiling.",
    );
  }
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
  /**
   * A shock crossing commits without the confirmation gate because the axis
   * jumped its line from beyond the near-band — exactly the case where no
   * published reversal condition can have fired. Publishing that flip at the
   * distance-derived confidence would dress an unconfirmed call in a confirmed
   * flavor, so the call is downgraded and flagged for the surfaces to name.
   */
  if (regimeTransition.shock) {
    dataWarnings.push(
      "Shock crossing: the published reversal condition did not fire, so this flip is unconfirmed until the next read.",
    );
  }
  const diagnosticsWithShock: RegimeDiagnostics = regimeTransition.shock
    ? {
        ...diagnostics,
        confidence: "LOW",
        transitionWatch: true,
        shockCrossing: true,
      }
    : diagnostics;
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
      baseRateVelocityPoints: velocity.points,
      // Set only when measured: a JSON round-trip drops undefined keys, and a
      // snapshot that re-reads must equal the one that was written.
      ...(velocity.delta === null ? {} : { baseRateVelocityDelta: velocity.delta }),
    },
    diagnostics: diagnosticsWithShock,
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
