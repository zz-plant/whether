import type { MacroSeriesReading, TreasuryData } from "./types";
import { POLICY_BBB_WEIGHT_FOR_RAS, POLICY_SPEC_V1 } from "./policy/config";
import { getGovernanceParametersForPosture } from "./policy/governance";
import { getTreasuryPolicyHistory } from "./policy/history";
import {
  clipZScore,
  computeCompositeScore,
  computeVolatility,
  computeZScore,
  directionalNormalize,
} from "./policy/transforms";
import {
  computeCurveSlope,
  getBaseRate,
  type PolicyAssessment,
  type PolicyBand,
  type PolicyPosture,
  type PolicyRefusalState,
  type PolicySignalNormalization,
  type RegimeThresholds,
} from "./regimeEngineCore";

const POLICY_HISTORY_WINDOW_MONTHS = POLICY_SPEC_V1.rollingWindowYears * 12;
const POLICY_FALLBACK_STD_DEV = {
  BASE_RATE: 1,
  CURVE_SLOPE: 0.75,
  BBB_CREDIT_SPREAD: 0.75,
  CPI_YOY: 1,
  UNEMPLOYMENT_RATE: 0.75,
} as const;

const getSignalById = (macroSeries: MacroSeriesReading[], id: MacroSeriesReading["id"]) =>
  macroSeries.find((entry) => entry.id === id) ?? null;

const computeRollingStats = (
  historyValues: Array<number | null>,
  fallbackMean: number,
  fallbackStdDev = 1,
) => {
  const numericHistory = historyValues.filter((value): value is number => typeof value === "number");
  if (numericHistory.length === 0) {
    return { mean: fallbackMean, stdDev: fallbackStdDev };
  }

  const values = numericHistory;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  /*
   * Sample variance (n-1), not population. These values are a rolling window
   * drawn from an ongoing series, not the whole population, and dividing by n
   * biases sigma downward — which inflates every |z| built on it and pushes the
   * band classification toward ELEVATED/EXTREME. A single-value window has no
   * dispersion to estimate, so it falls back rather than dividing by zero.
   */
  const variance =
    values.length > 1
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance) || fallbackStdDev;
  return { mean, stdDev };
};

const getHistoricalValuesBeforeDate = (
  history: MacroSeriesReading["history"] | undefined,
  currentRecordDate: string,
) => {
  const currentTimestamp = Date.parse(`${currentRecordDate}T00:00:00.000Z`);
  if (!Number.isFinite(currentTimestamp)) {
    return [];
  }

  return (history ?? [])
    .filter((point) => {
      const pointTimestamp = Date.parse(`${point.date}T00:00:00.000Z`);
      return Number.isFinite(pointTimestamp) && pointTimestamp < currentTimestamp;
    })
    .map((point) => point.value ?? null);
};

const classifyPolicyBand = (value: number): PolicyBand => {
  const absolute = Math.abs(value);
  if (absolute < POLICY_SPEC_V1.bands.neutralMax) {
    return "NEUTRAL";
  }
  if (absolute < POLICY_SPEC_V1.bands.elevatedMax) {
    return "ELEVATED";
  }
  return "EXTREME";
};

export const computePolicyAssessment = (
  treasury: TreasuryData,
  thresholds: RegimeThresholds,
  macroSeries: MacroSeriesReading[],
  legacyTightness: number,
  legacyRiskAppetite: number,
): PolicyAssessment => {
  const baseRate = getBaseRate(treasury.yields);
  const slope = computeCurveSlope(treasury.yields);
  const bbb = getSignalById(macroSeries, "BBB_CREDIT_SPREAD");
  const cpi = getSignalById(macroSeries, "CPI_YOY");
  const unemployment = getSignalById(macroSeries, "UNEMPLOYMENT_RATE");
  const treasuryHistory = getTreasuryPolicyHistory({
    asOf: treasury.record_date,
    months: POLICY_HISTORY_WINDOW_MONTHS,
  });

  const normalizations: PolicySignalNormalization[] = [];

  const pushNormalization = (
    id: PolicySignalNormalization["id"],
    value: number | null,
    direction: "HIGHER_IS_TIGHTER" | "HIGHER_IS_LOOSER",
    fallbackMean: number,
    history: Array<number | null> = [],
    fallbackStdDev = 1,
  ) => {
    if (typeof value !== "number") {
      normalizations.push({ id, value: null, z: null, directionalZ: null, clippedZ: null });
      return null;
    }
    const stats = computeRollingStats(history, fallbackMean, fallbackStdDev);
    const z = computeZScore(value, stats);
    const directionalZ = directionalNormalize(z, direction);
    const clippedZ = clipZScore(directionalZ, POLICY_SPEC_V1.zClip);
    normalizations.push({ id, value, z, directionalZ, clippedZ });
    return clippedZ;
  };

  const baseRateZ = pushNormalization(
    "BASE_RATE",
    baseRate.used === "MISSING" ? null : baseRate.value,
    "HIGHER_IS_TIGHTER",
    thresholds.baseRateTightness,
    treasuryHistory.map((point) => point.baseRate),
    POLICY_FALLBACK_STD_DEV.BASE_RATE,
  );
  const slopeZ = pushNormalization(
    "CURVE_SLOPE",
    slope,
    "HIGHER_IS_LOOSER",
    0,
    treasuryHistory.map((point) => point.curveSlope),
    POLICY_FALLBACK_STD_DEV.CURVE_SLOPE,
  );
  const bbbZ = pushNormalization(
    "BBB_CREDIT_SPREAD",
    bbb?.value ?? null,
    "HIGHER_IS_TIGHTER",
    2,
    getHistoricalValuesBeforeDate(bbb?.history, bbb?.record_date ?? treasury.record_date),
    POLICY_FALLBACK_STD_DEV.BBB_CREDIT_SPREAD,
  );
  pushNormalization(
    "CPI_YOY",
    cpi?.value ?? null,
    "HIGHER_IS_TIGHTER",
    2.5,
    getHistoricalValuesBeforeDate(cpi?.history, cpi?.record_date ?? treasury.record_date),
    POLICY_FALLBACK_STD_DEV.CPI_YOY,
  );
  pushNormalization(
    "UNEMPLOYMENT_RATE",
    unemployment?.value ?? null,
    "HIGHER_IS_TIGHTER",
    4,
    getHistoricalValuesBeforeDate(unemployment?.history, unemployment?.record_date ?? treasury.record_date),
    POLICY_FALLBACK_STD_DEV.UNEMPLOYMENT_RATE,
  );

  const cts = computeCompositeScore(
    baseRateZ ?? 0,
    POLICY_SPEC_V1.weights.baseRate,
    bbbZ ?? 0,
    POLICY_SPEC_V1.weights.bbbSpread,
  );
  const ras = computeCompositeScore(
    slopeZ ?? 0,
    POLICY_SPEC_V1.weights.curveSlope,
    bbbZ ?? 0,
    POLICY_BBB_WEIGHT_FOR_RAS,
  );

  const rawPosture: PolicyPosture =
    cts >= POLICY_SPEC_V1.bands.neutralMax && ras >= POLICY_SPEC_V1.bands.neutralMax
      ? "SAFETY_MODE"
      : cts <= -POLICY_SPEC_V1.bands.neutralMax && ras <= -POLICY_SPEC_V1.bands.neutralMax
        ? "RISK_ON"
        : "TRANSITION";

  const signalDisagreement = Math.abs(cts - ras);
  const dominantBand = classifyPolicyBand(Math.max(Math.abs(cts), Math.abs(ras)));
  const distanceFromNeutral = Math.min(Math.abs(cts), Math.abs(ras));
  const signalDispersion = computeVolatility([cts, ras, legacyTightness / 100, legacyRiskAppetite / 100]);

  const missingCount = normalizations.filter((entry) => entry.clippedZ === null).length;
  const refusalReasons: string[] = [];
  if (signalDisagreement >= POLICY_SPEC_V1.refusal.disagreementThreshold) {
    refusalReasons.push("The underlying signals disagree too sharply to move the posture.");
  }
  if (signalDispersion >= POLICY_SPEC_V1.refusal.dispersionThreshold) {
    refusalReasons.push("Signals have swung too hard over the past 30 days to trust a posture change.");
  }
  if (missingCount > POLICY_SPEC_V1.refusal.maxMissingSignalCount) {
    refusalReasons.push("Too many inputs are missing to support a posture change.");
  }

  const shouldRefuse = refusalReasons.length > 0;

  // Always produce a posture — refuse only when data is truly missing,
  // otherwise degrade gracefully to TRANSITION with a caution label.
  const posture: PolicyPosture =
    missingCount > POLICY_SPEC_V1.refusal.maxMissingSignalCount
      ? "TRANSITION" // Data too sparse: stay in transition, no forced call
      : rawPosture;

  const refusal: PolicyRefusalState = shouldRefuse
    ? {
        refused: true,
        reasons: refusalReasons,
        // Always produce a posture-backed message, never a dead-end
        fallbackMessage: "PROCEED_WITH_CAUTION" as const,
        executionMode: "REVERSIBLE_BETS_ONLY" as const,
      }
    : { refused: false, reasons: [] };

  return {
    version: POLICY_SPEC_V1.version,
    normalizations,
    composites: { cts, ras },
    posture,
    band: dominantBand,
    confidenceIndex: { signalDisagreement, distanceFromNeutral, signalDispersion },
    refusal,
    governanceParameters: getGovernanceParametersForPosture(posture, refusal.refused),
  };
};
