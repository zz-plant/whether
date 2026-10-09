import type { GovernanceParameterSet } from "./policy/governance";
import type { RegimeStateTransition } from "./regimeStateMachine";
import type { MacroSeriesId, TreasuryYields, RegimeKey } from "./types";

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
  /**
   * Points contributed by the base-rate velocity term: 0 when no rate history
   * was supplied, otherwise the capped ramp over the trailing-window rate move.
   * Exposed so a reader can tell a tightness score built on the level ramp alone
   * from one that includes the tightening-speed term.
   */
  baseRateVelocityPoints?: number;
  /** The trailing-window base-rate move the velocity term measured, in points.
   *  Absent with the points when no history was supplied. */
  baseRateVelocityDelta?: number;
  /**
   * The two scores with the market inputs outside the record basis counted
   * (`RECORD_BASIS_MARKET_INPUTS`), and which of those inputs adjusted them.
   * The scores above leave them out, and so do the conditions, the machine and
   * every line an area is judged against: an input the archive cannot score
   * cannot be tested by the record that vouches for the call. Reported so a
   * reader can still see what those inputs say (`lib/report/scoringBasis.ts`).
   *
   * Absent when no input outside the record adjusted a score, and on every
   * assessment scored before 2026-10-09, whose published scores counted them.
   */
  offRecord?: OffRecordScores;
}

/** The scores with every market input counted, and the inputs outside the record basis that moved them. */
export type OffRecordScores = {
  tightness: number;
  riskAppetite: number;
  inputs: MacroSeriesId[];
};

type RegimeInput = {
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

type RegimeSignalInfluenceKey = "tightness" | "riskAppetite" | "baseRate" | "curveSlope";

export type RegimeSignalInfluence = {
  key: RegimeSignalInfluenceKey;
  label: string;
  influence: number | null;
  unavailable: boolean;
};

export type RegimeTrend = "IMPROVING" | "DETERIORATING" | "MIXED" | "STABLE";

export type RegimeDiagnostics = {
  /*
   * Distance from the regime threshold, in score points — NOT a change since
   * last week. They were called `tightnessDelta` and `riskAppetiteDelta`, and
   * `getRegimeProjection` already carried a comment warning callers not to pass
   * them where a week-over-week velocity was wanted. Two later call sites did
   * exactly that anyway and published the result as "vs last week", which is
   * what a name has to prevent rather than a comment three files away.
   */
  tightnessVsThreshold: number;
  riskAppetiteVsThreshold: number;
  nearestThresholdDelta: number;
  /**
   * The state machine's confirmation-gate band, not a published confidence.
   * It ranks the raw gap (cutoffs 13 and 6), and it decides how many confirming
   * reads a flip needs. What a reader is told is `resolvePublishedConfidence`
   * in `lib/report/confidence.ts`. Named `confidence` because it is stored.
   */
  confidence: "LOW" | "MEDIUM" | "HIGH";
  transitionWatch: boolean;
  intensity: "MILD" | "STANDARD" | "STRONG";
  boundaryContributors: string[];
  weakReadCount: number;
  twoWeakReadsWarning: boolean;
  /**
   * True when the current call flipped via a shock crossing — the axis jumped its
   * classification line by `SHOCK_CROSSING_POINTS` or more in one step, so no
   * published reversal condition fired. Set by `evaluateRegime`, not by
   * `computeDiagnostics`, which has no machine state to read.
   */
  shockCrossing?: boolean;
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

interface PolicyCompositeScores {
  cts: number;
  ras: number;
}

export type PolicyBand = "NEUTRAL" | "ELEVATED" | "EXTREME";

interface PolicyConfidenceIndex {
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

/**
 * Why the posture refused to move, as a code. The reader's sentence for each is
 * written in `lib/report/regimeDescription.ts`, and the held guidance for each
 * in `lib/report/reportCopy.ts`.
 */
export type PolicyRefusalCode = "signals-disagree" | "signals-dispersed" | "inputs-missing";

export interface PolicyRefusalState {
  refused: boolean;
  reasons: string[];
  /**
   * The codes `reasons` were written from, in the same order, set on a refusal.
   * The held guidance is chosen by the first of them, so a held week states the
   * reason it was held for rather than one sentence for every hold. Optional
   * because a record stored before 2026-10-07 carries only the sentences.
   */
  reasonCodes?: PolicyRefusalCode[];
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

/**
 * Tightening-speed term.
 *
 * The level ramp above starts at 3.5% and contributes nothing below it, which is
 * why the fastest hiking cycle in 40 years (Mar 2022, from 0%) read as tightness 0
 * for eight months: the score measured how expensive money *was*, never how fast
 * it was getting there. The velocity term closes that gap with data the engine
 * already reads — the same DGS1MO window the client fetches — so a tightening
 * cycle registers by its second meeting instead of its eighth.
 *
 * Calibrated against the one place the level ramp is a known miss: Mar 2022 the
 * 1M bill was ~0% and the 3-month move ~0.5%; a 0.4% threshold makes that read as
 * 6 points (VOLATILE-side "pressure rising"), Jun 2022 the 3-month move was ~0.9%
 * and the term saturates — tightness 60 on velocity alone, SCARCITY-side once the
 * curve inversion adds its 25. A mid-90s-style 300bp cycle saturates the term;
 * the gradual 2015-18 liftoff (~25bp/quarter) stays at 0, as it should.
 */
export const BASE_RATE_VELOCITY_LOOKBACK_DAYS = 91;
const BASE_RATE_VELOCITY_MIN_GAP_DAYS = 60;
const BASE_RATE_VELOCITY_MAX_GAP_DAYS = 130;
/** Trailing-window base-rate move, in points, above which tightening starts
 *  counting. Roughly one meeting at 50bp per quarter. */
export const BASE_RATE_VELOCITY_THRESHOLD = 0.4;
/** Points of tightness per point of trailing move past the threshold. Saturates
 *  at a 0.9% three-month move. Same units as the level ramp above. */
export const BASE_RATE_VELOCITY_MULTIPLIER = 120;
export const BASE_RATE_VELOCITY_POINTS = 60;
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
const TIGHTNESS_POINTS_PER_RATE_POINT = BASE_RATE_TIGHTNESS_MULTIPLIER;
const RISK_POINTS_PER_SLOPE_POINT =
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

/**
 * Which calibration scored a reading.
 *
 * Bump it with any change that moves a score, a regime, a diagnostic or a
 * policy composite for the same inputs: a constant above, a macro adjustment,
 * the machine's gate, the policy spec. A wording change does not bump it — the
 * words are written in `lib/report/regimeDescription.ts`, after scoring.
 * `tests/engineVersion.test.ts` fingerprints the scorer's output on a fixed grid
 * of synthetic inputs and fails when that output moves under an unchanged
 * version.
 *
 * The archive generators stamp it on every entry they write (`engineVersion`),
 * and the operating snapshot's input hash includes it, so two snapshots of the
 * same inputs scored by different calibrations are stored as two snapshots.
 *
 * - `engine-2026-10-06`: the first stamped calibration. Every market input the
 *   engine reads adjusted the published scores.
 * - `engine-2026-10-09`: the record basis. Only the market inputs the archive
 *   scores adjust them (`RECORD_BASIS_MARKET_INPUTS`); the rest are reported in
 *   `RegimeScores.offRecord` and move nothing.
 */
export const ENGINE_VERSION = "engine-2026-10-09";

export const DEFAULT_THRESHOLDS: RegimeThresholds = {
  baseRateTightness: BASE_RATE_TIGHTNESS_THRESHOLD,
  tightnessRegime: TIGHTNESS_REGIME_THRESHOLD,
  riskAppetiteRegime: RISK_APPETITE_REGIME_THRESHOLD,
};

/*
 * Nothing in this module writes a sentence. The regime profiles, the two axis
 * explanations, the input labels and the base-rate source names used to live
 * here, and every wording edit to them was a commit to a scoring file that also
 * rewrote archived history on the next regeneration. They are in
 * `lib/report/regimeDescription.ts`, which turns what the engine scored into the
 * stored assessment.
 */

export const clamp =(value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Optional evaluation inputs a caller supplies when it has base-rate history.
 *
 * Callers without history (point queries, fixtures, scenario studios) omit the
 * context and the velocity term reads 0 — the same call the engine published
 * before the term existed, which keeps every omitting call site comparable.
 */
export interface RegimeEvaluationContext {
  /** Base-rate observations ascending by date. Only the trailing window is
   *  read; the rest is ignored. */
  baseRateHistory?: readonly { date: string; value: number | null }[] | null;
  /**
   * Policy inputs the record carries no value for on this date. A replay sets
   * it (`lib/timeMachine/regimeReplay.ts`): the archive holds no credit-spread,
   * inflation or unemployment history for most months, and a replayed month is
   * judged on the inputs the archive carries for it. A listed input still
   * scores 0 in the composites, as any absent one does, but it does not count
   * toward the missing-input refusal or the missing-input pin to TRANSITION.
   *
   * A live read never sets it, so a feed that failed this week still counts:
   * a hold for missing inputs is a live-read failure, not a property of
   * history. Every caller that omits it scores exactly as before.
   */
  inputsNotOnRecord?: readonly PolicySignalNormalization["id"][];
}

const daysBetweenDates = (laterIso: string, earlierIso: string): number => {
  const later = Date.parse(`${laterIso}T00:00:00.000Z`);
  const earlier = Date.parse(`${earlierIso}T00:00:00.000Z`);
  if (Number.isNaN(later) || Number.isNaN(earlier)) {
    return Number.NaN;
  }
  return (later - earlier) / (24 * 60 * 60 * 1000);
};

/**
 * The trailing-window base-rate move, or null when history cannot answer.
 *
 * Picks the observation closest to the lookback target whose gap stays inside
 * the bounds, so weekly (7d rows) and monthly (30d rows) callers resolve the
 * same ~3-month window without per-caller window math. Rate observations for
 * DGS1MO are complete for modern history, so null values simply skip a row.
 */
export const resolveBaseRateVelocityDelta = (
  baseRateHistory: RegimeEvaluationContext["baseRateHistory"],
  lookbackDays: number = BASE_RATE_VELOCITY_LOOKBACK_DAYS,
): number | null => {
  const pair = resolveBaseRateVelocityPair(baseRateHistory, lookbackDays);
  return pair ? pair.latest.value - pair.compare.value : null;
};

type BaseRateObservation = { date: string; value: number };

/**
 * The two observations the trailing-window move is measured between: the latest
 * print, and the one whose gap to it sits inside the bounds and nearest the
 * lookback (the earliest, on a tie). Null when history cannot answer.
 *
 * Exposed because the archive generator stores this pair on each Time Machine
 * cache entry, so the runtime walk can score the same move from two numbers
 * that the generator scored from the full daily series. It used to re-implement
 * this search in `scripts/regimeArchiveContext.ts`; two copies of a window rule
 * is how the walk and the archives came to disagree before (050e9371).
 */
export const resolveBaseRateVelocityPair = (
  baseRateHistory: RegimeEvaluationContext["baseRateHistory"],
  lookbackDays: number = BASE_RATE_VELOCITY_LOOKBACK_DAYS,
): { compare: BaseRateObservation; latest: BaseRateObservation } | null => {
  if (!baseRateHistory || baseRateHistory.length === 0) {
    return null;
  }
  const observations = baseRateHistory.filter(
    (point): point is BaseRateObservation => typeof point.value === "number",
  );
  if (observations.length < 2) {
    return null;
  }
  const latest = observations.at(-1);
  if (!latest) {
    return null;
  }

  let best: { observation: BaseRateObservation; gap: number } | null = null;
  for (const observation of observations) {
    const gap = daysBetweenDates(latest.date, observation.date);
    if (Number.isNaN(gap) || gap < BASE_RATE_VELOCITY_MIN_GAP_DAYS || gap > BASE_RATE_VELOCITY_MAX_GAP_DAYS) {
      continue;
    }
    const distance = Math.abs(gap - lookbackDays);
    if (!best || distance < Math.abs(best.gap - lookbackDays)) {
      best = { observation, gap };
    }
  }

  if (!best) {
    return null;
  }
  return {
    compare: { date: best.observation.date, value: best.observation.value },
    latest: { date: latest.date, value: latest.value },
  };
};

/** Points of tightness from the trailing move, floored at 0 so easing never
 *  tightens. Null moves (no usable history) read as 0. */
export const computeBaseRateVelocityPoints = (
  baseRateHistory: RegimeEvaluationContext["baseRateHistory"],
): { points: number; delta: number | null } => {
  const delta = resolveBaseRateVelocityDelta(baseRateHistory);
  if (delta === null) {
    return { points: 0, delta: null };
  }
  const points = clamp(
    Math.round((delta - BASE_RATE_VELOCITY_THRESHOLD) * BASE_RATE_VELOCITY_MULTIPLIER),
    0,
    BASE_RATE_VELOCITY_POINTS,
  );
  return { points, delta };
};

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
  baseRateVelocityPoints = 0,
) => {
  const baseRatePoints = Math.max(
    SCORE_MIN,
    Math.round((baseRate - baseRateThreshold) * BASE_RATE_TIGHTNESS_MULTIPLIER),
  );
  const inversionPoints =
    curveSlope < SCORE_MIN
      ? Math.round(Math.abs(curveSlope) * CURVE_INVERSION_TIGHTNESS_MULTIPLIER)
      : SCORE_MIN;
  return baseRatePoints + inversionPoints + baseRateVelocityPoints;
};

export const computeTightnessScore = (
  baseRate: number,
  curveSlope: number,
  baseRateThreshold: number,
  baseRateVelocityPoints = 0,
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
  const score = baseRatePoints + inversionPoints + baseRateVelocityPoints;

  return clamp(score, SCORE_MIN, TIGHTNESS_CAP);
};

export const computeRiskAppetiteScore = (curveSlope: number) => {
  const normalized =
    (curveSlope - RISK_APPETITE_MIN_SLOPE) / (RISK_APPETITE_MAX_SLOPE - RISK_APPETITE_MIN_SLOPE);
  return clamp(Math.round(normalized * SCORE_MAX), SCORE_MIN, SCORE_MAX);
};

/**
 * What the readings classify into, right now, with no committed state.
 *
 * This used to route through `advanceRegimeState(null, …)` with diagnostics
 * forced to HIGH confidence and infinite boundary distance — a call that made
 * every point evaluation commit a quadrant flip instantly while claiming the
 * confirmation gate had been consulted. It had not: with no previous state the
 * gate is 1-of-1. Naming the function for what it is keeps the instant-commit
 * path (scenario studios, what-if quadrants) from being mistaken for the
 * governed path (threaded evaluations, which confirm flips through
 * `advanceRegimeState` with a real machine snapshot).
 */
export const classifyRegime = (
  tightness: number,
  riskAppetite: number,
  thresholds: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime">,
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
