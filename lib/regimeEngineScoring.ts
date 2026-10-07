/**
 * The regime engine's scorer: readings in, a verdict out, as data.
 *
 * Deterministic and copy-free. It returns the regime, the machine's step, the
 * scores, the diagnostics and the policy composites with every reason left as a
 * code; `describeRegimeAssessment` (`lib/report/regimeDescription.ts`) writes
 * those codes into the sentences a `RegimeAssessment` stores, and
 * `evaluateRegime` (`lib/regimeEngine.ts`) composes the two. Keeping the words
 * out of this file is what lets a wording change ship without touching scoring,
 * and what `tests/architectureInvariants.test.ts` holds the engine modules to.
 */
import type { MacroSeriesReading, TreasuryData } from "./types";
import {
  MISSING_SLOPE_FALLBACK,
  TIGHTNESS_CAP,
  computeBaseRateVelocityPoints,
  computeCurveSlope,
  computeRiskAppetiteScore,
  computeTightnessPressure,
  computeTightnessScore,
  getBaseRate,
  resolveThresholds,
  type RegimeEvaluationContext,
  type RegimeKey,
  type RegimeScores,
  type RegimeThresholds,
} from "./regimeEngineCore";
import {
  applyMacroAdjustments,
  computeDiagnostics,
  type RegimeDiagnosticsScoring,
} from "./regimeEngineDiagnostics";
import {
  computePolicyAssessment,
  type PolicyScoring,
  type TreasuryPolicyHistoryPoint,
} from "./regimeEnginePolicy";
import {
  advanceRegimeState,
  type RegimeMachineSnapshot,
  type RegimeMachineStep,
} from "./regimeStateMachine";

/** A data warning the assessment carries, as a code, in the order it is raised. */
export type RegimeWarning =
  | { code: "base-rate-missing" }
  | { code: "curve-slope-missing" }
  | { code: "tightening-speed"; delta: number; points: number }
  | { code: "market-stress-veto" }
  | { code: "shock-crossing" };

export type RegimeScoring = {
  regime: RegimeKey;
  transition: RegimeMachineStep;
  scores: RegimeScores;
  diagnostics: RegimeDiagnosticsScoring;
  warnings: RegimeWarning[];
  thresholds: RegimeThresholds;
  policy: PolicyScoring;
};

export const scoreRegime = (
  treasury: TreasuryData,
  overrides: Partial<RegimeThresholds> | undefined,
  macroSeries: MacroSeriesReading[],
  previousMachineState: RegimeMachineSnapshot | null,
  context: RegimeEvaluationContext,
  /** The month-end rate history the policy composites standardize against. */
  policyHistory: readonly TreasuryPolicyHistoryPoint[],
): RegimeScoring => {
  const warnings: RegimeWarning[] = [];
  const baseRate = getBaseRate(treasury.yields);
  const curveSlope = computeCurveSlope(treasury.yields);
  const thresholds = resolveThresholds(overrides);

  if (baseRate.used === "MISSING") {
    warnings.push({ code: "base-rate-missing" });
  }
  if (curveSlope === null) {
    warnings.push({ code: "curve-slope-missing" });
  }

  const velocity = computeBaseRateVelocityPoints(context.baseRateHistory);
  // Points are only ever positive when a delta was measured.
  if (velocity.points > 0 && velocity.delta !== null) {
    warnings.push({ code: "tightening-speed", delta: velocity.delta, points: velocity.points });
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
    warnings.push({ code: "market-stress-veto" });
  }
  const diagnostics = computeDiagnostics(
    tightness,
    riskAppetite,
    thresholds,
    macroAdjusted.boundaryContributors,
    macroAdjusted.weakReadCount,
    baseRate.used === "MISSING" || curveSlope === null,
  );
  const transition = advanceRegimeState(previousMachineState, {
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
  if (transition.shock) {
    warnings.push({ code: "shock-crossing" });
  }
  const diagnosticsWithShock: RegimeDiagnosticsScoring = transition.shock
    ? {
        ...diagnostics,
        confidence: "LOW",
        transitionWatch: true,
        shockCrossing: true,
      }
    : diagnostics;

  return {
    regime: transition.nextState,
    transition,
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
    warnings,
    thresholds,
    policy: computePolicyAssessment(
      treasury,
      thresholds,
      macroSeries,
      tightness,
      riskAppetite,
      policyHistory,
      context.inputsNotOnRecord,
    ),
  };
};
