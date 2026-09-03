import type { GovernanceParameterSet } from "./policy/governance";
import { advanceRegimeState, type RegimeStateTransition } from "./report/regimeStateMachine";
import type { TreasuryData, TreasuryYields, RegimeKey } from "./types";

export type { RegimeKey };

export interface RegimeScores {
  tightness: number;
  /**
   * The tightness components before the 0-100 clip: rate points plus inversion
   * points, uncapped.
   *
   * `tightness` deliberately saturates, and the components over-subscribe the cap
   * (90 + 25 + macro add-ons), so above roughly a 4% base rate the published score
   * is a constant and its week-over-week delta is zero. Classification wants that
   * bounded scale; "how much pressure, and did it move" does not. Read this for
   * magnitude, `tightness` for the regime.
   *
   * Optional because it is derived, not an input: `evaluateRegime` always sets it,
   * while hand-built fixtures that only pin the classification inputs need not.
   */
  tightnessPressure?: number;
  /** Whether `tightness` is pinned at its ceiling, so a flat score is the clip
   *  rather than a flat reading. */
  tightnessSaturated?: boolean;
  riskAppetite: number;
  baseRateUsed: "FED" | "1M" | "3M" | "MISSING";
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

export type RegimeSignalInfluenceKey = "tightness" | "riskAppetite" | "baseRate" | "curveSlope";

export type RegimeSignalInfluence = {
  key: RegimeSignalInfluenceKey;
  label: string;
  influence: number | null;
  unavailable: boolean;
};

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

export type PolicyPosture = "RISK_ON" | "SAFETY_MODE" | "TRANSITION";

export interface PolicySignalNormalization {
  id: "BASE_RATE" | "CURVE_SLOPE" | "BBB_CREDIT_SPREAD" | "CPI_YOY" | "UNEMPLOYMENT_RATE";
  value: number | null;
  z: number | null;
  directionalZ: number | null;
  clippedZ: number | null;
}

export interface PolicyCompositeScores {
  cts: number;
  ras: number;
}

export type PolicyBand = "NEUTRAL" | "ELEVATED" | "EXTREME";

export interface PolicyConfidenceIndex {
  /**
   * How far apart the two composites sit, as |cts - ras|. Larger means they
   * disagree more, which is why it gates a refusal. It was named `agreement`,
   * which reads as the opposite of what it measures.
   */
  signalDisagreement: number;
  distanceFromNeutral: number;
  /**
   * Spread across the current composite and legacy scores — a cross-sectional
   * dispersion of four simultaneous readings, not a time series.
   *
   * It was named `volatility30d`, which promises a 30-day window this never had:
   * `computeVolatility` is a plain standard deviation of whatever array it is
   * given, and it is given four values from the same instant. Renamed rather than
   * given a window, because the refusal gate it drives wants "do these signals
   * cohere right now", which is what it actually answers.
   */
  signalDispersion: number;
}

export interface PolicyRefusalState {
  refused: boolean;
  reasons: string[];
  fallbackMessage?: "NO_POSTURE_CHANGE_RECOMMENDED" | "PROCEED_WITH_CAUTION";
  executionMode?: "REVERSIBLE_BETS_ONLY";
}

export interface PolicyAssessment {
  version: string;
  normalizations: PolicySignalNormalization[];
  composites: PolicyCompositeScores;
  posture: PolicyPosture;
  band: PolicyBand;
  confidenceIndex: PolicyConfidenceIndex;
  refusal: PolicyRefusalState;
  governanceParameters: GovernanceParameterSet;
}

export interface RegimeThresholds {
  baseRateTightness: number;
  tightnessRegime: number;
  riskAppetiteRegime: number;
}

export interface RegimeAssessment {
  regime: RegimeKey;
  regimeTransition?: RegimeStateTransition;
  scores: RegimeScores;
  diagnostics: RegimeDiagnostics;
  description: string;
  constraints: string[];
  tightnessExplanation: string;
  riskAppetiteExplanation: string;
  dataWarnings: string[];
  thresholds: RegimeThresholds;
  inputs: RegimeInput[];
  policyAssessment: PolicyAssessment;
  signalInfluence?: RegimeSignalInfluence[];
}

/**
 * Scoring calibration.
 *
 * None of these are canonical macroeconomics — they are this product's choices
 * about where an operator's behavior should change, and they are annotated
 * because a contributor without a macro background otherwise cannot tell which
 * numbers are conventions and which are ours. All of them are ours. Treat the
 * whole block as tunable-but-load-bearing: changing one moves every published
 * call, so change it with a reason and update the fixtures.
 *
 * The three thresholds in `DEFAULT_THRESHOLDS` below are additionally
 * user-overridable at /signals?advanced=1, so they must stay independently
 * meaningful rather than encoding a hidden relationship to each other.
 */

/** Base rate below which rates contribute nothing to tightness. Roughly the
 *  post-2000 U.S. average policy rate — a rate near here reads as "normal", not
 *  as pressure.
 *
 *  Calibrated against the policy rate but applied to the one-month bill, which is
 *  what `getBaseRate` actually returns (the `FED` rung has never fired; see
 *  `TREASURY_SOURCE_LABEL` below). They track closely, but not through a
 *  debt-ceiling or month-end bill dislocation — and with the rate component
 *  spending its whole 0-90 range across the 50bp from here to 4.0%, a bill-specific
 *  move of that size is enough to shift the published regime for a reason that is
 *  not monetary. Kept deliberately: switching the input series would move every
 *  published call and break comparability with the archive those calls were scored
 *  against. */
export const BASE_RATE_TIGHTNESS_THRESHOLD = 3.5;
/** Ceiling on the rate component. Note the components are allowed to over-subscribe
 *  the cap: 90 here plus 25 of inversion plus the macro add-ons can reach past 100,
 *  and the sum is clipped. That is why inversion and macro stress stop moving the
 *  score once rates alone are at the ceiling. (This comment previously claimed
 *  "10 points of headroom", which the 25-point inversion ceiling below contradicts.) */
export const TIGHTNESS_BASE_RATE_POINTS = 90;
/** Ceiling on the inversion component. Deliberately a minority of the score:
 *  inversion is a slow warning, not a funding cost. */
export const TIGHTNESS_INVERSION_POINTS = 25;
export const TIGHTNESS_CAP = 100;
/** Ends of the 10Y-2Y slope range that risk appetite is mapped across. The range
 *  is asymmetric because inversions are shallower than steepenings: -1.0% is
 *  about as inverted as the U.S. curve has gone, +1.5% about as steep as a
 *  normal expansion runs. */
export const RISK_APPETITE_MIN_SLOPE = -1.0;
export const RISK_APPETITE_MAX_SLOPE = 1.5;
/** Slope used when the curve cannot be read. Deliberately the most inverted value
 *  in the range, so an outage biases the call toward caution rather than toward
 *  calm — it maxes the inversion term and zeroes risk appetite at once. That is a
 *  loud default, so it is paired with a hard cap on reported confidence
 *  (`CONFIDENCE_PERCENT_IMPUTED_CEILING`); without that cap the stand-in scored
 *  the confidence ceiling precisely because it sits far from both boundaries.
 *  It borrows the bound rather than sharing meaning with it: this is an
 *  imputation policy, not a display range. */
export const MISSING_SLOPE_FALLBACK = RISK_APPETITE_MIN_SLOPE;
/** Regime quadrant boundaries: tightness above 70 counts as tight, risk appetite
 *  above 50 as willing. Not the same as the 30/70 display bands in
 *  `report/signalTranslations.ts`, which answer "is this reading unusual" rather
 *  than "which quadrant are we in". */
export const TIGHTNESS_REGIME_THRESHOLD = 70;
export const RISK_APPETITE_REGIME_THRESHOLD = 50;
/** How long conditions must hold before a reversal is described as durable.
 *  Product choice: one month is the shortest window a team can plan against. */
export const REGIME_REVERSAL_DAYS = 30;
/*
 * DFF is deliberately absent: nothing fetches it. `TREASURY_ENDPOINTS` once declared a fed-funds
 * URL that was never wired into the request the client builds, and no bundled snapshot carries a
 * `fedFunds` value, so `getBaseRate`'s FED rung has never fired and the base rate is always the
 * one-month bill. This label is what the site cites as its source, so it names the four series
 * actually read. tests/treasurySourceLabel.test.ts holds the two in step.
 */
export const TREASURY_SOURCE_LABEL = "FRED CSV (DGS1MO, DGS3MO, DGS2, DGS10)";

const SCORE_MIN = 0;
const SCORE_MAX = 100;

/** Points of tightness per percentage point of base rate above the threshold.
 *  With the 90-point cap, the rate component saturates at 4.0% — i.e. the model
 *  stops distinguishing between "expensive" and "very expensive" money above
 *  that, because operator behavior stops changing there too. */
export const BASE_RATE_TIGHTNESS_MULTIPLIER = 180;
/** Points of tightness per percentage point of inversion depth. With the
 *  25-point cap, saturates at a 0.5% inversion. */
export const CURVE_INVERSION_TIGHTNESS_MULTIPLIER = 50;

/**
 * Score points each axis moves per percentage point of the variable that drives
 * it. Tightness moves 180 points per point of base rate; risk appetite spans 100
 * points across a 2.5-point slope range, so 40 per point.
 *
 * They differ by 4.5x, which is why a raw `min()` of the two gaps is not a
 * comparison: the same number of points is a far larger move in the underlying
 * slope than in the underlying rate, so the risk axis looked closer to its
 * boundary almost always, purely because its scale is compressed.
 */
export const TIGHTNESS_POINTS_PER_RATE_POINT = BASE_RATE_TIGHTNESS_MULTIPLIER;
export const RISK_POINTS_PER_SLOPE_POINT =
  SCORE_MAX / (RISK_APPETITE_MAX_SLOPE - RISK_APPETITE_MIN_SLOPE);
/** Multiplier that puts a risk-appetite gap on the tightness points scale, so the
 *  existing percent calibration keeps its meaning. */
export const RISK_GAP_TO_TIGHTNESS_EQUIVALENT =
  TIGHTNESS_POINTS_PER_RATE_POINT / RISK_POINTS_PER_SLOPE_POINT;

export const REGIME_CONFIDENCE_NEAR_THRESHOLD = 5;
export const REGIME_CONFIDENCE_MEDIUM_THRESHOLD = 12;
export const CONFIDENCE_PERCENT_BASELINE = 55;
/**
 * Percent per point of distance from the nearest regime boundary.
 *
 * Was 3, calibrated when `resolveDistanceToFlip` measured the risk-appetite gap in
 * its own compressed units. Putting both axes on one scale roughly doubled the
 * mean distance (25.5 -> 47.5 across the 175 months in
 * `summary_monthly_regime_history.json`), so keeping 3 would have lifted mean
 * reported confidence from 85.7% to 90.2% purely as an artefact of the unit fix.
 * At 1 the mean is unchanged, which is the point: the axis normalisation changes
 * *which* distance is measured, not how confident the product claims to be.
 *
 * It also makes the formula legible — the percent is the baseline plus the points
 * of distance.
 *
 * Known limitation: even at this setting the scale still tops out for most
 * months, so the number discriminates poorly at the confident end. Fixing that
 * needs calibration against outcomes — how often a call at distance d was later
 * revised — not another constant. `data/summary_archive.json` is the input for
 * that work.
 */
export const CONFIDENCE_PERCENT_PER_POINT = 1;
export const CONFIDENCE_PERCENT_FLOOR = 35;
export const CONFIDENCE_PERCENT_CEILING = 92;
/** Ceiling when either score came from a stand-in rather than a reading. Below
 *  the floor the scale otherwise reports, because a call built on imputed inputs
 *  should read as weaker than the weakest call built on real ones. */
export const CONFIDENCE_PERCENT_IMPUTED_CEILING = 30;

export const FORECAST_CONE_HIGH = 3.5;
export const FORECAST_CONE_MEDIUM = 5;
export const FORECAST_CONE_LOW = 7;

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
      "Prioritize reach and learning velocity over perfect finish.",
      "Spend with clear guardrails, even if some experiments fail.",
      "Scale capacity ahead of demand only where leading signals stay strong.",
    ],
  },
};

export const getRegimeProfile = (regime: RegimeKey) => REGIME_PROFILES[regime];

export const buildTightnessExplanation = (thresholds: RegimeThresholds) =>
  `Tightness score blends two components capped at ${TIGHTNESS_CAP}: ` +
  `base rate points ramp from 0 to ${TIGHTNESS_BASE_RATE_POINTS} as rates move above ${thresholds.baseRateTightness}%, ` +
  `and inversion points ramp from 0 to ${TIGHTNESS_INVERSION_POINTS} as slope moves below 0%.`;

export const RISK_APPETITE_EXPLANATION =
  `Risk appetite score maps the 10Y-2Y slope from ${RISK_APPETITE_MIN_SLOPE}% (very cautious) ` +
  `to ${RISK_APPETITE_MAX_SLOPE}% (confident), scaled to 0-100.`;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getBaseRate = (yields: TreasuryYields) => {
  if (typeof yields.fedFunds === "number") {
    return { value: yields.fedFunds, used: "FED" as const };
  }
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

export const buildRegimeInputs = (
  treasury: TreasuryData,
  baseRate: ReturnType<typeof getBaseRate>,
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
): RegimeThresholds => ({
  baseRateTightness: overrides?.baseRateTightness ?? DEFAULT_THRESHOLDS.baseRateTightness,
  tightnessRegime: overrides?.tightnessRegime ?? DEFAULT_THRESHOLDS.tightnessRegime,
  riskAppetiteRegime: overrides?.riskAppetiteRegime ?? DEFAULT_THRESHOLDS.riskAppetiteRegime,
});

/**
 * Tightness in the same points as the published score, with no ceiling anywhere.
 *
 * Every ceiling is removed, not just the final clip — clamping the components and
 * summing them only moves the saturation point from 100 to 115, which is still
 * flat. Floored at zero per component so a rate below the threshold or an upward
 * curve contributes nothing rather than subtracting.
 *
 * Comparable to `tightness` below the ceiling and unbounded above it, so a
 * week-over-week difference stays meaningful in a regime where the published
 * score cannot move.
 */
export const computeTightnessPressure = (
  baseRate: number,
  curveSlope: number,
  baseRateThreshold: number,
) => {
  const baseRatePoints = Math.max(
    SCORE_MIN,
    Math.round((baseRate - baseRateThreshold) * BASE_RATE_TIGHTNESS_MULTIPLIER),
  );
  const inversionPoints =
    curveSlope < SCORE_MIN
      ? Math.round(Math.abs(curveSlope) * CURVE_INVERSION_TIGHTNESS_MULTIPLIER)
      : SCORE_MIN;
  return baseRatePoints + inversionPoints;
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
): RegimeKey =>
  advanceRegimeState(null, {
    tightness,
    riskAppetite,
    thresholds,
    diagnostics: {
      confidence: "HIGH",
      nearestThresholdDelta: Number.POSITIVE_INFINITY,
      transitionWatch: false,
    },
  }).nextState;
