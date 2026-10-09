/**
 * The candidate funding-pressure rate ramps registered in
 * docs/research/premise-test-preregistration.md (§7), scored beside the live
 * engine and used for nothing a reader sees.
 *
 * A candidate replaces only the level ramp: the 0–90 points the rate level adds
 * to funding pressure. Everything after it is the engine's own code, called
 * here rather than copied: the inversion term and the cap
 * (`computeTightnessScore`), the tightening-speed term, the macro adjustments,
 * the diagnostics and the state machine. With the current ramp this module
 * reproduces the published record month for month
 * (tests/candidateRamps.test.ts), which is what makes a candidate's record a
 * like-for-like comparison.
 *
 * Pure: every input is an argument. It reads no data and writes no copy, the
 * same boundary the engine keeps (Invariant 12 lists this file).
 */
import {
  BASE_RATE_TIGHTNESS_MULTIPLIER,
  BASE_RATE_TIGHTNESS_THRESHOLD,
  MISSING_SLOPE_FALLBACK,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_REGIME_THRESHOLD,
  clamp,
  computeBaseRateVelocityPoints,
  computeCurveSlope,
  computeRiskAppetiteScore,
  computeTightnessScore,
  getBaseRate,
  resolveThresholds,
  type RegimeEvaluationContext,
  type RegimeKey,
} from "../regimeEngineCore";
import { applyMacroAdjustments, computeDiagnostics } from "../regimeEngineDiagnostics";
import { advanceRegimeState, type RegimeMachineSnapshot } from "../regimeStateMachine";
import type { MacroSeriesReading, TreasuryData } from "../types";

/** The current ramp, for reference, and the three registered candidates. */
export type RampId = "current" | "wide" | "trailing-percentile" | "bill-median";

export const REGISTERED_CANDIDATE_RAMPS = ["wide", "trailing-percentile", "bill-median"] as const satisfies readonly RampId[];

/** Month-end one-month-bill values the percentile candidate ranks against. */
export const PERCENTILE_WINDOW_MONTHS = 120;

const WIDE_RAMP_FROM = 2.0;
const WIDE_RAMP_TO = 5.5;
/** Rate points span 0 to the engine's own ceiling for every ramp. */
const RAMP_POINTS = TIGHTNESS_BASE_RATE_POINTS;

/** What a ramp reads on one date. */
export type RampInputs = {
  oneMonth: number | null;
  threeMonth: number | null;
  /**
   * The one-month bill at each of the 120 calendar month-ends before the
   * reading's month. Only the percentile candidate reads it.
   */
  trailingMonthEnds: readonly number[];
};

/** Why a ramp could not read its input as registered. */
type RampFlag = "no-input" | "window-short" | "unguarded";

type RampReading = {
  /** The value the ramp read: the one-month bill, or the two bills' median for the guard. */
  input: number | null;
  ratePoints: number | null;
  flag: RampFlag | null;
};

/** A rate in whole basis points, the precision FRED publishes. */
const basisPoints = (rate: number) => Math.round(rate * 100);

/**
 * The 0–90 points a ramp gives its input, with the input raised by
 * `bumpBasisPoints` (the saturation measure raises it by 25; scoring passes 0).
 *
 * Each ramp is computed in whole or half basis points, so a rounding tie is an
 * exact half and goes up, rather than landing either side of it by float error.
 */
export const readRamp = (ramp: RampId, inputs: RampInputs, bumpBasisPoints = 0): RampReading => {
  const { oneMonth, threeMonth, trailingMonthEnds } = inputs;
  if (oneMonth === null) {
    return { input: null, ratePoints: null, flag: "no-input" };
  }
  const oneMonthBp = basisPoints(oneMonth) + bumpBasisPoints;

  if (ramp === "current") {
    // The engine's own expression (`computeTightnessScore`), so the two cannot drift.
    const input = oneMonthBp / 100;
    const points = Math.round((input - BASE_RATE_TIGHTNESS_THRESHOLD) * BASE_RATE_TIGHTNESS_MULTIPLIER);
    return { input, ratePoints: clamp(points, 0, RAMP_POINTS), flag: null };
  }

  if (ramp === "wide") {
    // (x − 2.0) × 90 / 3.5, in basis points: (bp − 200) × 90 / 350.
    const fromBp = WIDE_RAMP_FROM * 100;
    const spanBp = (WIDE_RAMP_TO - WIDE_RAMP_FROM) * 100;
    const points = Math.round(((oneMonthBp - fromBp) * RAMP_POINTS) / spanBp);
    return { input: oneMonthBp / 100, ratePoints: clamp(points, 0, RAMP_POINTS), flag: null };
  }

  if (ramp === "trailing-percentile") {
    if (trailingMonthEnds.length < PERCENTILE_WINDOW_MONTHS) {
      return { input: oneMonthBp / 100, ratePoints: null, flag: "window-short" };
    }
    const window = trailingMonthEnds.slice(-PERCENTILE_WINDOW_MONTHS).map(basisPoints);
    const below = window.filter((value) => value < oneMonthBp).length;
    const equal = window.filter((value) => value === oneMonthBp).length;
    // p = (below + equal / 2) / 120 and points = (p − 0.5) × 180, which is
    // exactly 0.75 × (2·below + equal − 120): quarters, never a float tie.
    const points = Math.round(((2 * below + equal - PERCENTILE_WINDOW_MONTHS) * 3) / 4);
    return { input: oneMonthBp / 100, ratePoints: clamp(points, 0, RAMP_POINTS), flag: null };
  }

  // bill-median: the median of the one- and three-month bills (their mean), on the current ramp.
  if (threeMonth === null) {
    const unguarded = readRamp("current", inputs, bumpBasisPoints);
    return { ...unguarded, flag: "unguarded" };
  }
  const halfBasisPoints = oneMonthBp + basisPoints(threeMonth) + bumpBasisPoints;
  const thresholdHalfBp = BASE_RATE_TIGHTNESS_THRESHOLD * 200;
  // (x − 3.5) × 180 with x in half basis points: (h − 700) × 9 / 10.
  const points = Math.round(((halfBasisPoints - thresholdHalfBp) * BASE_RATE_TIGHTNESS_MULTIPLIER) / 200);
  return { input: halfBasisPoints / 200, ratePoints: clamp(points, 0, RAMP_POINTS), flag: null };
};

/**
 * Whether the rate component is at its ceiling (§8.1): raising the input by 25
 * basis points, all else equal, would not raise the points, and the points are
 * in the upper half of the range, so a reading at the floor does not count.
 */
export const isRampSaturated = (ramp: RampId, inputs: RampInputs): boolean => {
  const now = readRamp(ramp, inputs).ratePoints;
  const raised = readRamp(ramp, inputs, 25).ratePoints;
  return now !== null && raised !== null && now >= RAMP_POINTS / 2 && raised <= now;
};

type RampScore = {
  ramp: RampId;
  reading: RampReading;
  /** The bounded funding-pressure score this ramp produces; null when the ramp could not read. */
  fundingPressure: number | null;
  riskAppetite: number;
  /** The conditions after the state machine; null when the ramp could not read. */
  conditions: RegimeKey | null;
  /** The machine snapshot to hand the next reading of the same ramp. */
  machineState: RegimeMachineSnapshot | null;
};

/**
 * One reading scored with a ramp: the engine's scorer (`scoreRegime`) with the
 * level ramp swapped, thresholds at their defaults. Returns the previous
 * machine state untouched when the ramp cannot read, so a gap does not reset a
 * candidate's record.
 */
const scoreWithRamp = ({
  ramp,
  treasury,
  macroSeries,
  context,
  previousMachineState,
  trailingMonthEnds,
}: {
  ramp: RampId;
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  context: RegimeEvaluationContext;
  previousMachineState: RegimeMachineSnapshot | null;
  trailingMonthEnds: readonly number[];
}): RampScore => {
  const thresholds = resolveThresholds();
  const baseRate = getBaseRate(treasury.yields);
  const curveSlope = computeCurveSlope(treasury.yields);
  const curveSlopeForScore = curveSlope ?? MISSING_SLOPE_FALLBACK;
  const riskAppetiteBase = computeRiskAppetiteScore(curveSlopeForScore);
  const reading = readRamp(ramp, {
    oneMonth: baseRate.used === "MISSING" ? null : baseRate.value,
    threeMonth: typeof treasury.yields.threeMonth === "number" ? treasury.yields.threeMonth : null,
    trailingMonthEnds,
  });

  if (reading.ratePoints === null) {
    return {
      ramp,
      reading,
      fundingPressure: null,
      riskAppetite: riskAppetiteBase,
      conditions: null,
      machineState: previousMachineState,
    };
  }

  const velocity = computeBaseRateVelocityPoints(context.baseRateHistory);
  // A base rate at the ramp's own start adds no level points, so the engine's
  // tightness function contributes exactly the inversion term; the candidate's
  // points go in beside the speed term, and the engine's cap applies to the sum.
  const tightnessBase = computeTightnessScore(
    thresholds.baseRateTightness,
    curveSlopeForScore,
    thresholds.baseRateTightness,
    reading.ratePoints + velocity.points,
  );
  const adjusted = applyMacroAdjustments(tightnessBase, riskAppetiteBase, macroSeries);
  const diagnostics = computeDiagnostics(
    adjusted.tightness,
    adjusted.riskAppetite,
    thresholds,
    adjusted.boundaryContributors,
    adjusted.weakReadCount,
    baseRate.used === "MISSING" || curveSlope === null,
  );
  const step = advanceRegimeState(previousMachineState, {
    tightness: adjusted.tightness,
    riskAppetite: adjusted.riskAppetite,
    thresholds,
    diagnostics,
  });

  return {
    ramp,
    reading,
    fundingPressure: adjusted.tightness,
    riskAppetite: adjusted.riskAppetite,
    conditions: step.nextState,
    machineState: step.snapshot,
  };
};

/** One reading of a ramp replay: what `scoreWithRamp` reads, with the percentile window already resolved. */
type RampReplayStep = {
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  baseRateHistory: RegimeEvaluationContext["baseRateHistory"];
  trailingMonthEnds: readonly number[];
};

/** A ramp scored over consecutive readings, the machine state threaded forward as the live read threads it. */
export const replayRamp = (
  ramp: RampId,
  steps: readonly RampReplayStep[],
  initialMachineState: RegimeMachineSnapshot | null = null,
): RampScore[] => {
  let machineState = initialMachineState;
  return steps.map((step) => {
    const score = scoreWithRamp({
      ramp,
      treasury: step.treasury,
      macroSeries: step.macroSeries,
      context: { baseRateHistory: step.baseRateHistory },
      previousMachineState: machineState,
      trailingMonthEnds: step.trailingMonthEnds,
    });
    machineState = score.machineState;
    return score;
  });
};

const previousMonth = (month: string): string => {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return monthNumber === 1 ? `${year - 1}-12` : `${year}-${String(monthNumber - 1).padStart(2, "0")}`;
};

/**
 * The percentile window for a reading in `month` (YYYY-MM): the one-month-bill
 * month-end of each of the 120 calendar months before it, oldest first. Stops
 * at the first month the source does not hold, so a short window reads as
 * short rather than as a different ten years.
 */
export const trailingMonthEndWindow = (month: string, monthEnds: ReadonlyMap<string, number>): number[] => {
  const window: number[] = [];
  let cursor = previousMonth(month);
  for (let count = 0; count < PERCENTILE_WINDOW_MONTHS; count += 1) {
    const value = monthEnds.get(cursor);
    if (value === undefined) {
      break;
    }
    window.unshift(value);
    cursor = previousMonth(cursor);
  }
  return window;
};

/**
 * The registered tight reading (§3): funding pressure above its line, or
 * conditions Freezing or Stormy. Null when the ramp could not score.
 */
export const isTightReading = (fundingPressure: number | null, conditions: RegimeKey | null): boolean | null => {
  if (fundingPressure === null || conditions === null) {
    return null;
  }
  return fundingPressure > TIGHTNESS_REGIME_THRESHOLD || conditions === "SCARCITY" || conditions === "VOLATILE";
};
