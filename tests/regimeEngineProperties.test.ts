import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { evaluatePlanLineCrossings, planLinesFromRules } from "../lib/alert/planLines";
import { isMissingFredValue, parseFredApiObservations, parseFredCsvRows, parseFredCsvSeries } from "../lib/fred";
import {
  BASE_RATE_VELOCITY_POINTS,
  BASE_RATE_VELOCITY_THRESHOLD,
  DEFAULT_THRESHOLDS,
  MISSING_SLOPE_FALLBACK,
  REGIME_CONFIDENCE_NEAR_THRESHOLD,
  TIGHTNESS_CAP,
  classifyRegime,
  computeBaseRateVelocityPoints,
  computeRiskAppetiteScore,
  computeTightnessPressure,
  computeTightnessScore,
  resolveBaseRateVelocityDelta,
  resolveBaseRateVelocityPair,
  resolveThresholds,
  type RegimeThresholds,
} from "../lib/regimeEngineCore";
import { computeDiagnostics } from "../lib/regimeEngineDiagnostics";
import type { TreasuryPolicyHistoryPoint } from "../lib/regimeEnginePolicy";
import { scoreRegime, type RegimeScoring } from "../lib/regimeEngineScoring";
import {
  SHOCK_CROSSING_POINTS,
  advanceRegimeState,
  type RegimeMachineSnapshot,
  type RegimeMachineStep,
} from "../lib/regimeStateMachine";
import { buildCanonicalBoundedDecisionRules, isRuleConditionMet, sharedDecisionLines } from "../lib/report/boundedDecisionRules";
import type { MacroSeriesId, MacroSeriesReading, SeriesHistoryPoint, TreasuryData } from "../lib/types";
import { parseSeries } from "../scripts/regimeArchiveContext";

/*
 * Properties of the regime engine that must hold for every input, not only for
 * the readings the example suites pin (regimeEngine, regimeGovernance,
 * flipProximity, regimePhaseSpace).
 *
 * The generator is hand-rolled rather than a dependency: a seeded PRNG feeds a
 * `Draw`, every choice it makes is recorded as an integer offset, and a failing
 * case is shrunk by editing that list (deleting runs, lowering values) and
 * replaying the generator, the way Hypothesis shrinks. So every generator gets
 * shrinking for free, and a counterexample prints as the smallest reading that
 * still fails rather than as the random one that first did.
 *
 * Deterministic by default. `WHETHER_PROPERTY_SEED=<n>` explores another seed
 * and `WHETHER_PROPERTY_RUNS=<n>` changes how many cases each property draws;
 * a failure prints the seed it ran under.
 */

// ---------------------------------------------------------------------------
// The generator
// ---------------------------------------------------------------------------

type Draw = {
  /** An integer in [min, max]; shrinks toward min. */
  int: (min: number, max: number) => number;
  /** A number in [min, max] on a grid of `places` decimals; shrinks toward min. */
  decimal: (min: number, max: number, places?: number) => number;
  bool: () => boolean;
  /** `make()`, or null one time in `nullOneIn`; shrinks toward null, the smaller reading. */
  nullable: <T>(make: () => T, nullOneIn?: number) => T | null;
  pick: <T>(options: readonly T[]) => T;
  array: <T>(make: () => T, minLength: number, maxLength: number) => T[];
};

type Source = { next: (span: number) => number; used: number[] };

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashName = (name: string) => {
  let hash = 2166136261;
  for (const char of name) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619);
  }
  return hash >>> 0;
};

/** Random offsets, biased toward the ends of each range, where the boundaries live. */
const randomSource = (random: () => number): Source => {
  const used: number[] = [];
  return {
    used,
    next: (span) => {
      const roll = random();
      const offset = roll < 0.06 ? 0 : roll < 0.12 ? span : Math.floor(random() * (span + 1));
      used.push(offset);
      return offset;
    },
  };
};

/** Replays recorded offsets, clamped to each range; an exhausted list reads as 0. */
const replaySource = (choices: readonly number[]): Source => {
  const used: number[] = [];
  let index = 0;
  return {
    used,
    next: (span) => {
      const offset = Math.min(choices[index] ?? 0, span);
      index += 1;
      used.push(offset);
      return offset;
    },
  };
};

const drawFrom = (source: Source): Draw => {
  const int = (min: number, max: number) => min + source.next(max - min);
  return {
    int,
    decimal: (min, max, places = 2) => {
      const scale = 10 ** places;
      return Math.round(Math.round(min * scale) + source.next(Math.round((max - min) * scale))) / scale;
    },
    bool: () => int(0, 1) === 1,
    nullable: (make, nullOneIn = 4) => (int(0, nullOneIn - 1) === 0 ? null : make()),
    pick: (options) => {
      const option = options[int(0, options.length - 1)];
      if (option === undefined) throw new Error("pick from an empty list");
      return option;
    },
    array: (make, minLength, maxLength) => Array.from({ length: int(minLength, maxLength) }, () => make()),
  };
};

type Generate<T> = (draw: Draw) => T;
type Check<T> = (value: T) => void;
type Failure<T> = { value: T; choices: number[]; message: string };

const failureOf = <T>(generate: Generate<T>, check: Check<T>, source: Source): Failure<T> | null => {
  const value = generate(drawFrom(source));
  try {
    check(value);
    return null;
  } catch (error) {
    return { value, choices: [...source.used], message: error instanceof Error ? error.message : String(error) };
  }
};

/** Shorter first, then lexicographically smaller: the order shrinking walks down. */
const isSimpler = (candidate: readonly number[], current: readonly number[]) => {
  if (candidate.length !== current.length) return candidate.length < current.length;
  for (let index = 0; index < candidate.length; index += 1) {
    const a = candidate[index] ?? 0;
    const b = current[index] ?? 0;
    if (a !== b) return a < b;
  }
  return false;
};

function* shrinkCandidates(choices: readonly number[]): Generator<number[]> {
  for (const size of [8, 4, 2, 1]) {
    for (let start = 0; start + size <= choices.length; start += 1) {
      yield [...choices.slice(0, start), ...choices.slice(start + size)];
    }
  }
  for (let index = 0; index < choices.length; index += 1) {
    const choice = choices[index] ?? 0;
    for (const lower of new Set([0, Math.floor(choice / 2), choice - 1])) {
      if (lower >= 0 && lower < choice) {
        yield choices.map((value, at) => (at === index ? lower : value));
      }
    }
  }
}

const SHRINK_BUDGET = 5000;

const shrink = <T>(generate: Generate<T>, check: Check<T>, failure: Failure<T>): Failure<T> => {
  let best = failure;
  let budget = SHRINK_BUDGET;
  let improved = true;
  while (improved && budget > 0) {
    improved = false;
    for (const candidate of shrinkCandidates(best.choices)) {
      budget -= 1;
      if (budget <= 0) break;
      const next = failureOf(generate, check, replaySource(candidate));
      if (next && isSimpler(next.choices, best.choices)) {
        best = next;
        improved = true;
        break;
      }
    }
  }
  return best;
};

const envInt = (name: string, fallback: number) => {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const SEED = envInt("WHETHER_PROPERTY_SEED", 20261021);
const RUNS = envInt("WHETHER_PROPERTY_RUNS", 200);

const findCounterexample = <T>(name: string, generate: Generate<T>, check: Check<T>, runs = RUNS) => {
  const random = mulberry32(SEED ^ hashName(name));
  for (let run = 0; run < runs; run += 1) {
    const failure = failureOf(generate, check, randomSource(random));
    if (failure) return { ...shrink(generate, check, failure), run };
  }
  return null;
};

const property = <T>(name: string, generate: Generate<T>, check: Check<T>, runs?: number) =>
  it(name, () => {
    const failure = findCounterexample(name, generate, check, runs);
    if (failure) {
      assert.fail(
        `Property failed on case ${failure.run + 1} (WHETHER_PROPERTY_SEED=${SEED}).\n` +
          `Shrunk counterexample: ${JSON.stringify(failure.value)}\n${failure.message}`,
      );
    }
  });

// ---------------------------------------------------------------------------
// Readings
// ---------------------------------------------------------------------------

const RECORD_DATE = "2025-06-27";
const DAY_MS = 86_400_000;

const daysBefore = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00.000Z`) - days * DAY_MS).toISOString().slice(0, 10);

const round2 = (value: number) => Math.round(value * 100) / 100;

// Rational sequences, as in tests/engineVersion.test.ts, so the history is exact on every engine.
const pad = (value: number) => String(value).padStart(2, "0");
const POLICY_HISTORY: TreasuryPolicyHistoryPoint[] = Array.from({ length: 150 }, (_, index) => ({
  recordDate: `${2013 + Math.floor(index / 12)}-${pad((index % 12) + 1)}-28`,
  baseRate: index % 17 === 0 ? null : ((index * 37) % 55) / 10,
  curveSlope: index % 19 === 0 ? null : (((index * 23) % 31) - 10) / 10,
}));

/**
 * One reading, compact so a counterexample is legible: the yields, the record
 * basis's market inputs, the inputs outside it, and a weekly one-month-bill
 * trail ending on the record date (the velocity term's history).
 */
type ReadingSpec = {
  oneMonth: number | null;
  threeMonth: number | null;
  twoYear: number | null;
  tenYear: number | null;
  vix: number | null;
  /** The trailing VIX closes the market-stress veto averages; null reads the spot. */
  vixTail: number[] | null;
  chicagoFci: number | null;
  offRecord: OffRecordSpec;
  rateTrail: (number | null)[] | null;
};

type OffRecordSpec = { highYield: number | null; vcVelocity: number | null; layoffs: number | null };

const drawOffRecord = (draw: Draw): OffRecordSpec => ({
  highYield: draw.nullable(() => draw.decimal(2, 12, 1), 2),
  vcVelocity: draw.nullable(() => draw.decimal(-60, 40, 0), 2),
  layoffs: draw.nullable(() => draw.decimal(0, 100, 0), 2),
});

const drawYield = (draw: Draw, complete: boolean, min: number, max: number) =>
  complete ? draw.decimal(min, max) : draw.nullable(() => draw.decimal(min, max), 6);

const drawReading = (draw: Draw, { complete = false } = {}): ReadingSpec => ({
  oneMonth: drawYield(draw, complete, 0, 6.5),
  threeMonth: draw.nullable(() => draw.decimal(0, 6.5), 2),
  twoYear: drawYield(draw, complete, 0, 6),
  tenYear: drawYield(draw, complete, 0, 6),
  vix: draw.nullable(() => draw.decimal(9, 85, 1), 2),
  vixTail: draw.nullable(() => draw.array(() => draw.decimal(9, 85, 1), 10, 12), 2),
  chicagoFci: draw.nullable(() => draw.decimal(-1, 2), 2),
  offRecord: drawOffRecord(draw),
  rateTrail: draw.nullable(() => draw.array(() => draw.nullable(() => draw.decimal(0, 6.5), 8), 1, 20), 3),
});

const historyEnding = (values: readonly (number | null)[], stepDays: number): SeriesHistoryPoint[] =>
  values.map((value, index) => ({ date: daysBefore(RECORD_DATE, (values.length - 1 - index) * stepDays), value }));

const macro = (id: MacroSeriesId, value: number, history: SeriesHistoryPoint[] = []): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "x",
  explanation: "property fixture",
  sourceLabel: "property fixture",
  sourceUrl: "https://example.com",
  formulaUrl: "/formulas",
  record_date: RECORD_DATE,
  fetched_at: `${RECORD_DATE}T00:00:00.000Z`,
  isLive: false,
  history,
});

const macroSeriesOf = (spec: ReadingSpec): MacroSeriesReading[] => {
  const series: MacroSeriesReading[] = [];
  if (spec.vix !== null) series.push(macro("VIX_INDEX", spec.vix, historyEnding(spec.vixTail ?? [], 1)));
  if (spec.chicagoFci !== null) series.push(macro("CHICAGO_FCI", spec.chicagoFci));
  if (spec.offRecord.highYield !== null) series.push(macro("HY_CREDIT_SPREAD", spec.offRecord.highYield));
  if (spec.offRecord.vcVelocity !== null) series.push(macro("VC_FUNDING_VELOCITY", spec.offRecord.vcVelocity));
  if (spec.offRecord.layoffs !== null) series.push(macro("TECH_LAYOFF_TREND", spec.offRecord.layoffs));
  return series;
};

const treasuryOf = (spec: ReadingSpec): TreasuryData => ({
  source: "property fixture",
  record_date: RECORD_DATE,
  fetched_at: `${RECORD_DATE}T00:00:00.000Z`,
  isLive: false,
  yields: { oneMonth: spec.oneMonth, threeMonth: spec.threeMonth, twoYear: spec.twoYear, tenYear: spec.tenYear },
});

const score = (
  spec: ReadingSpec,
  previous: RegimeMachineSnapshot | null = null,
  overrides?: Partial<RegimeThresholds>,
): RegimeScoring =>
  scoreRegime(
    treasuryOf(spec),
    overrides,
    macroSeriesOf(spec),
    previous,
    { baseRateHistory: spec.rateTrail ? historyEnding(spec.rateTrail, 7) : null },
    POLICY_HISTORY,
  );

/** Every reading a score is published from, for "did this input move anything". */
const published = (scoring: RegimeScoring) => ({
  regime: scoring.regime,
  tightness: scoring.scores.tightness,
  riskAppetite: scoring.scores.riskAppetite,
  tightnessPressure: scoring.scores.tightnessPressure,
  transition: scoring.transition,
  diagnostics: scoring.diagnostics,
  warnings: scoring.warnings,
});

const isScore = (value: number | undefined) => Number.isInteger(value) && (value ?? -1) >= 0 && (value ?? 101) <= 100;

const drawThresholds = (draw: Draw) => ({ tightnessRegime: draw.int(0, 100), riskAppetiteRegime: draw.int(0, 100) });

// ---------------------------------------------------------------------------
// Thresholds and score components (lib/regimeEngineCore.ts)
// ---------------------------------------------------------------------------

describe("regime engine properties: score components", () => {
  property(
    "component scores stay on the 0-100 scale, and pressure is the same points with no ceiling",
    (draw) => ({
      baseRate: draw.decimal(-1, 12),
      curveSlope: draw.decimal(-4, 4),
      threshold: draw.decimal(0, 8),
      velocityPoints: draw.int(0, BASE_RATE_VELOCITY_POINTS),
    }),
    ({ baseRate, curveSlope, threshold, velocityPoints }) => {
      const tightness = computeTightnessScore(baseRate, curveSlope, threshold, velocityPoints);
      const pressure = computeTightnessPressure(baseRate, curveSlope, threshold, velocityPoints);
      assert.ok(isScore(tightness), `tightness ${tightness}`);
      assert.ok(isScore(computeRiskAppetiteScore(curveSlope)), "risk appetite");
      assert.ok(Number.isInteger(pressure) && pressure >= 0, `pressure ${pressure}`);
      assert.ok(pressure >= tightness, `pressure ${pressure} below tightness ${tightness}`);
    },
  );

  property(
    "tightness never falls as the base rate, the inversion or the tightening speed rises",
    (draw) => ({
      baseRate: draw.decimal(0, 8),
      curveSlope: draw.decimal(-3, 3),
      threshold: draw.decimal(0, 8),
      velocityPoints: draw.int(0, BASE_RATE_VELOCITY_POINTS),
      rateRise: draw.decimal(0, 3),
      curveFall: draw.decimal(0, 3),
      speedRise: draw.int(0, BASE_RATE_VELOCITY_POINTS),
    }),
    ({ baseRate, curveSlope, threshold, velocityPoints, rateRise, curveFall, speedRise }) => {
      const before = computeTightnessScore(baseRate, curveSlope, threshold, velocityPoints);
      const after = computeTightnessScore(
        baseRate + rateRise,
        curveSlope - curveFall,
        threshold,
        Math.min(BASE_RATE_VELOCITY_POINTS, velocityPoints + speedRise),
      );
      assert.ok(after >= before, `${before} -> ${after}`);
      const pressureBefore = computeTightnessPressure(baseRate, curveSlope, threshold, velocityPoints);
      const pressureAfter = computeTightnessPressure(baseRate + rateRise, curveSlope - curveFall, threshold, velocityPoints);
      assert.ok(pressureAfter >= pressureBefore, `pressure ${pressureBefore} -> ${pressureAfter}`);
    },
  );

  property(
    "tightness never rises with the threshold it is measured from",
    (draw) => ({ baseRate: draw.decimal(0, 8), curveSlope: draw.decimal(-3, 3), threshold: draw.decimal(0, 8), raise: draw.decimal(0, 3) }),
    ({ baseRate, curveSlope, threshold, raise }) => {
      assert.ok(computeTightnessScore(baseRate, curveSlope, threshold + raise) <= computeTightnessScore(baseRate, curveSlope, threshold));
    },
  );

  property(
    "risk appetite never falls as the curve steepens, and is pinned outside the slope range",
    (draw) => ({ slope: draw.decimal(-4, 4), steepen: draw.decimal(0, 4) }),
    ({ slope, steepen }) => {
      assert.ok(computeRiskAppetiteScore(slope + steepen) >= computeRiskAppetiteScore(slope));
      if (slope <= -1) assert.equal(computeRiskAppetiteScore(slope), 0);
      if (slope >= 1.5) assert.equal(computeRiskAppetiteScore(slope), 100);
    },
  );

  property(
    "the velocity term stays in its range, reads nothing below its threshold, and never falls as the rise steepens",
    (draw) => ({
      values: draw.array(() => draw.nullable(() => draw.decimal(0, 6.5), 6), 0, 20),
      stepDays: draw.pick([1, 7, 30]),
      lift: draw.decimal(0, 2),
    }),
    ({ values, stepDays, lift }) => {
      const history = historyEnding(values, stepDays);
      const { points, delta } = computeBaseRateVelocityPoints(history);
      assert.ok(Number.isInteger(points) && points >= 0 && points <= BASE_RATE_VELOCITY_POINTS, `points ${points}`);
      if (delta === null || delta <= BASE_RATE_VELOCITY_THRESHOLD) assert.equal(points, 0);
      // Lifting the latest print can only steepen the measured rise.
      const lastValued = history.reduce((found, point, index) => (point.value === null ? found : index), -1);
      if (lastValued >= 0) {
        const lifted = history.map((point, index) => (index === lastValued && point.value !== null ? { ...point, value: point.value + lift } : point));
        assert.ok(computeBaseRateVelocityPoints(lifted).points >= points);
      }
    },
  );

  property(
    "the velocity window is the latest print against one 60-130 days before it, and a missing print is skipped, not read",
    (draw) => ({
      values: draw.array(() => draw.decimal(0, 6.5), 0, 20),
      stepDays: draw.pick([1, 7, 30]),
      gaps: draw.array(() => draw.int(0, 19), 0, 6),
    }),
    ({ values, stepDays, gaps }) => {
      const history = historyEnding(values, stepDays);
      const pair = resolveBaseRateVelocityPair(history);
      if (pair) {
        const gap = (Date.parse(pair.latest.date) - Date.parse(pair.compare.date)) / DAY_MS;
        assert.ok(gap >= 60 && gap <= 130, `gap ${gap}`);
        assert.deepEqual(pair.latest, history.at(-1));
      }
      // The same history with missing observations interleaved, as FRED serves a holiday.
      const withGaps = history.flatMap((point, index) =>
        gaps.includes(index) ? [{ date: point.date, value: null }, point] : [point],
      );
      assert.deepEqual(resolveBaseRateVelocityPair(withGaps), pair);
      assert.equal(resolveBaseRateVelocityDelta(withGaps), resolveBaseRateVelocityDelta(history));
    },
  );

  property(
    "the four quadrants partition the plane on the two lines, and a higher score never moves a reading back across its line",
    (draw) => ({
      tightness: draw.decimal(0, 100, 1),
      riskAppetite: draw.decimal(0, 100, 1),
      thresholds: drawThresholds(draw),
      tightnessRise: draw.decimal(0, 100, 1),
      riskRise: draw.decimal(0, 100, 1),
    }),
    ({ tightness, riskAppetite, thresholds, tightnessRise, riskRise }) => {
      const isTight = (regime: string) => regime === "SCARCITY" || regime === "DEFENSIVE";
      const isWilling = (regime: string) => regime === "DEFENSIVE" || regime === "EXPANSION";
      const regime = classifyRegime(tightness, riskAppetite, thresholds);
      assert.equal(isTight(regime), tightness > thresholds.tightnessRegime);
      assert.equal(isWilling(regime), riskAppetite > thresholds.riskAppetiteRegime);
      const raised = classifyRegime(tightness + tightnessRise, riskAppetite + riskRise, thresholds);
      if (isTight(regime)) assert.ok(isTight(raised));
      if (isWilling(regime)) assert.ok(isWilling(raised));
    },
  );

  property(
    "a threshold override replaces its own default and nothing else",
    (draw) => ({
      baseRateTightness: draw.nullable(() => draw.decimal(0, 10), 2),
      tightnessRegime: draw.nullable(() => draw.int(0, 100), 2),
      riskAppetiteRegime: draw.nullable(() => draw.int(0, 100), 2),
    }),
    (overrides) => {
      const resolved = resolveThresholds({
        ...(overrides.baseRateTightness === null ? {} : { baseRateTightness: overrides.baseRateTightness }),
        ...(overrides.tightnessRegime === null ? {} : { tightnessRegime: overrides.tightnessRegime }),
        ...(overrides.riskAppetiteRegime === null ? {} : { riskAppetiteRegime: overrides.riskAppetiteRegime }),
      });
      assert.equal(resolved.baseRateTightness, overrides.baseRateTightness ?? DEFAULT_THRESHOLDS.baseRateTightness);
      assert.equal(resolved.tightnessRegime, overrides.tightnessRegime ?? DEFAULT_THRESHOLDS.tightnessRegime);
      assert.equal(resolved.riskAppetiteRegime, overrides.riskAppetiteRegime ?? DEFAULT_THRESHOLDS.riskAppetiteRegime);
    },
  );
});

// ---------------------------------------------------------------------------
// The scorer (lib/regimeEngineScoring.ts)
// ---------------------------------------------------------------------------

describe("regime engine properties: scoreRegime", () => {
  property(
    "every published score is a whole number on its documented scale, and a first reading classifies without a flip",
    (draw) => drawReading(draw),
    (spec) => {
      const { scores, regime, transition, diagnostics } = score(spec);
      assert.ok(isScore(scores.tightness), `tightness ${scores.tightness}`);
      assert.ok(isScore(scores.riskAppetite), `risk appetite ${scores.riskAppetite}`);
      assert.ok(Number.isInteger(scores.tightnessPressure) && (scores.tightnessPressure ?? -1) >= 0, "pressure");
      const velocity = scores.baseRateVelocityPoints ?? -1;
      assert.ok(Number.isInteger(velocity) && velocity >= 0 && velocity <= BASE_RATE_VELOCITY_POINTS, `velocity ${velocity}`);
      assert.ok(diagnostics.nearestThresholdDelta >= 0);
      assert.equal(regime, classifyRegime(scores.tightness, scores.riskAppetite, DEFAULT_THRESHOLDS));
      assert.equal(transition.cause.outcome, "held");
    },
  );

  property(
    "a higher base rate never lowers funding pressure or moves risk appetite",
    (draw) => ({ spec: drawReading(draw, { complete: true }), rise: draw.decimal(0.01, 3) }),
    ({ spec, rise }) => {
      const before = score({ ...spec, threeMonth: null });
      const oneMonth = spec.oneMonth ?? 0;
      const after = score({ ...spec, threeMonth: null, oneMonth: round2(oneMonth + rise) });
      assert.ok(after.scores.tightness >= before.scores.tightness, `tightness ${before.scores.tightness} -> ${after.scores.tightness}`);
      assert.ok((after.scores.tightnessPressure ?? 0) >= (before.scores.tightnessPressure ?? 0), "pressure fell");
      assert.equal(after.scores.riskAppetite, before.scores.riskAppetite);
    },
  );

  property(
    "a steeper curve never lowers risk appetite or raises funding pressure",
    (draw) => ({ spec: drawReading(draw, { complete: true }), steepen: draw.decimal(0.01, 3) }),
    ({ spec, steepen }) => {
      const before = score(spec);
      const after = score({ ...spec, tenYear: round2((spec.tenYear ?? 0) + steepen) });
      assert.ok(after.scores.riskAppetite >= before.scores.riskAppetite, `risk ${before.scores.riskAppetite} -> ${after.scores.riskAppetite}`);
      assert.ok(after.scores.tightness <= before.scores.tightness, `tightness ${before.scores.tightness} -> ${after.scores.tightness}`);
    },
  );

  property(
    "a faster rate rise never lowers funding pressure",
    (draw) => ({
      spec: drawReading(draw, { complete: true }),
      trail: draw.array(() => draw.decimal(0, 6.5), 2, 20),
      lift: draw.decimal(0.01, 2),
    }),
    ({ spec, trail, lift }) => {
      const before = score({ ...spec, rateTrail: trail });
      const lifted = trail.map((value, index) => (index === trail.length - 1 ? round2(value + lift) : value));
      const after = score({ ...spec, rateTrail: lifted });
      assert.ok(after.scores.tightness >= before.scores.tightness, `tightness ${before.scores.tightness} -> ${after.scores.tightness}`);
      assert.ok((after.scores.baseRateVelocityPoints ?? 0) >= (before.scores.baseRateVelocityPoints ?? 0));
    },
  );

  property(
    "more equity volatility never raises risk appetite and never touches funding pressure",
    (draw) => ({ spec: drawReading(draw), vix: draw.decimal(9, 85, 1), rise: draw.decimal(0.1, 40, 1) }),
    ({ spec, vix, rise }) => {
      const before = score({ ...spec, vix });
      const after = score({ ...spec, vix: vix + rise });
      assert.ok(after.scores.riskAppetite <= before.scores.riskAppetite, `risk ${before.scores.riskAppetite} -> ${after.scores.riskAppetite}`);
      assert.equal(after.scores.tightness, before.scores.tightness);
    },
  );

  property(
    "tighter financial conditions never lower funding pressure and never touch risk appetite",
    (draw) => ({ spec: drawReading(draw), fci: draw.decimal(-1, 2), rise: draw.decimal(0.01, 2) }),
    ({ spec, fci, rise }) => {
      const before = score({ ...spec, chicagoFci: fci });
      const after = score({ ...spec, chicagoFci: round2(fci + rise) });
      assert.ok(after.scores.tightness >= before.scores.tightness, `tightness ${before.scores.tightness} -> ${after.scores.tightness}`);
      assert.equal(after.scores.riskAppetite, before.scores.riskAppetite);
    },
  );

  property(
    "inputs outside the record basis move no published score, regime, step or diagnostic",
    (draw) => ({ spec: drawReading(draw), other: drawOffRecord(draw), previous: draw.bool() ? drawReading(draw) : null }),
    ({ spec, other, previous }) => {
      const previousState = previous ? score(previous).transition.snapshot : null;
      assert.deepEqual(published(score({ ...spec, offRecord: other }, previousState)), published(score(spec, previousState)));
    },
  );

  property(
    "replaying a sequence is deterministic, and a machine state that went through JSON replays the same",
    (draw) => draw.array(() => drawReading(draw), 1, 10),
    (specs) => {
      const replay = (throughJson: boolean) => {
        let previous: RegimeMachineSnapshot | null = null;
        return specs.map((spec) => {
          const scoring = score(spec, previous);
          previous = throughJson ? roundTrip(scoring.transition.snapshot) : scoring.transition.snapshot;
          return scoring;
        });
      };
      const first = replay(false);
      assert.deepEqual(replay(false), first);
      assert.deepEqual(replay(true), first);
    },
    100,
  );

  property(
    "a missing yield is never scored as a zero print: it is flagged, scored at its stand-in, and drops the gate to LOW",
    (draw) => ({ spec: drawReading(draw, { complete: true }), field: draw.pick(["oneMonth", "twoYear", "tenYear"] as const) }),
    ({ spec, field }) => {
      const base = { ...spec, threeMonth: null };
      const missing = score(withYield(base, field, null));
      const zero = score(withYield(base, field, 0));
      const code = field === "oneMonth" ? "base-rate-missing" : "curve-slope-missing";
      assert.ok(missing.warnings.some((warning) => warning.code === code), `no ${code} warning`);
      assert.ok(!zero.warnings.some((warning) => warning.code === code), `a zero print raised ${code}`);
      assert.equal(missing.diagnostics.confidence, "LOW");
      if (field === "oneMonth") {
        assert.equal(missing.scores.baseRateUsed, "MISSING");
        assert.equal(zero.scores.baseRateUsed, "1M");
        // The stand-in is the threshold, where the rate component is zero by construction, not a 0% bill.
        const atThreshold = score({ ...base, oneMonth: DEFAULT_THRESHOLDS.baseRateTightness });
        assert.equal(missing.scores.tightness, atThreshold.scores.tightness);
      } else {
        assert.equal(missing.scores.curveSlope, null);
        assert.equal(typeof zero.scores.curveSlope, "number");
        // The stand-in is the most inverted slope in range, so an outage biases toward caution.
        const atFallback = score({ ...base, twoYear: 1, tenYear: 1 + MISSING_SLOPE_FALLBACK });
        assert.equal(missing.scores.tightness, atFallback.scores.tightness);
        assert.equal(missing.scores.riskAppetite, atFallback.scores.riskAppetite);
      }
    },
  );

  /*
   * `RegimeScores.tightnessSaturated` says the published score has stopped
   * responding to the base rate, so a flat score is the clip rather than a flat
   * reading, and the hero prints the ceiling tag from it. Two ceilings pin it:
   * the rate component's own at 90 (`TIGHTNESS_BASE_RATE_POINTS`, a 4.0% base
   * rate) and the score's at 100, which inversion, tightening speed or the
   * Chicago Fed add-on can reach first.
   *
   * Until engine-2026-10-21 the flag was `tightnessPressure > TIGHTNESS_CAP`.
   * That set it at tightness 25 on a 0% bill with a 2.02-point inversion (101
   * points of pressure, all but 25 of them the inversion clip), left it unset
   * from 4.00% to 4.05% on a flat curve with the score already flat at 90, and
   * could not see the add-on, which pressure leaves out. On the bundled
   * month-ends two readings changed, both flat at 90 and now flagged: Nov 2025
   * (bill 4.05%, pressure 99) and Sep 2026 (bill 4.02%, pressure 94).
   */
  const drawRateRise = (draw: Draw) => ({ spec: drawReading(draw, { complete: true }), rise: draw.decimal(0.01, 7) });
  const scoreRateRise = ({ spec, rise }: { spec: ReadingSpec; rise: number }) => ({
    before: score({ ...spec, threeMonth: null }),
    after: score({ ...spec, threeMonth: null, oneMonth: round2((spec.oneMonth ?? 0) + rise) }),
  });

  property("a score flagged as saturated does not respond to a rate rise", drawRateRise, (input) => {
    const { before, after } = scoreRateRise(input);
    if (before.scores.tightnessSaturated) {
      assert.equal(after.scores.tightness, before.scores.tightness, `flagged at ${before.scores.tightness}, then moved`);
    }
  });

  property("a score that has stopped responding to a rate rise says it is saturated", drawRateRise, (input) => {
    const { before, after } = scoreRateRise(input);
    const pressureMoved = (after.scores.tightnessPressure ?? 0) > (before.scores.tightnessPressure ?? 0);
    if (pressureMoved && after.scores.tightness === before.scores.tightness) {
      assert.ok(before.scores.tightnessSaturated, `flat at ${before.scores.tightness} with the flag unset`);
    }
  });

  it("flags the ceilings the pressure test misread", () => {
    const reading = (yields: Pick<ReadingSpec, "oneMonth" | "twoYear" | "tenYear">, chicagoFci: number | null = null) =>
      score({
        ...yields,
        threeMonth: null,
        vix: null,
        vixTail: null,
        chicagoFci,
        offRecord: { highYield: null, vcVelocity: null, layoffs: null },
        rateTrail: null,
      }).scores;
    // The inversion clip: 101 points of pressure, a score of 25 that a rate rise still moves.
    const inverted = reading({ oneMonth: 0, twoYear: 2.02, tenYear: 0 });
    assert.deepEqual([inverted.tightness, inverted.tightnessPressure, inverted.tightnessSaturated], [25, 101, false]);
    // The rate component's own ceiling: flat at 90 from a 4.0% bill.
    const atRateCeiling = reading({ oneMonth: 4, twoYear: 0, tenYear: 0 });
    assert.deepEqual([atRateCeiling.tightness, atRateCeiling.tightnessPressure, atRateCeiling.tightnessSaturated], [90, 90, true]);
    // The Chicago Fed add-on pins the score at 100 on 91 points of pressure.
    const pinnedByIndex = reading({ oneMonth: 3.95, twoYear: 1.2, tenYear: 1 }, 1);
    assert.deepEqual([pinnedByIndex.tightness, pinnedByIndex.tightnessPressure, pinnedByIndex.tightnessSaturated], [TIGHTNESS_CAP, 91, true]);
  });
});

const withYield = (spec: ReadingSpec, field: "oneMonth" | "twoYear" | "tenYear", value: number | null): ReadingSpec => {
  switch (field) {
    case "oneMonth":
      return { ...spec, oneMonth: value };
    case "twoYear":
      return { ...spec, twoYear: value };
    case "tenYear":
      return { ...spec, tenYear: value };
  }
};

/** What a stored snapshot reads back as: JSON drops undefined keys. */
const roundTrip = (snapshot: RegimeMachineSnapshot): RegimeMachineSnapshot => ({
  committedState: snapshot.committedState,
  pendingState: snapshot.pendingState,
  pendingCount: snapshot.pendingCount,
  ...(snapshot.lastSignals
    ? { lastSignals: { tightness: snapshot.lastSignals.tightness, riskAppetite: snapshot.lastSignals.riskAppetite } }
    : {}),
});

// ---------------------------------------------------------------------------
// The state machine (lib/regimeStateMachine.ts)
// ---------------------------------------------------------------------------

type Signal = { tightness: number; riskAppetite: number; imputed: boolean };

const stepMachine = (previous: RegimeMachineSnapshot | null, signal: Signal, thresholds: RegimeThresholds) => {
  const diagnostics = computeDiagnostics(signal.tightness, signal.riskAppetite, thresholds, [], 0, signal.imputed);
  return {
    diagnostics,
    step: advanceRegimeState(previous, { tightness: signal.tightness, riskAppetite: signal.riskAppetite, thresholds, diagnostics }),
  };
};

const runMachine = (signals: readonly Signal[], thresholds: RegimeThresholds) => {
  let previous: RegimeMachineSnapshot | null = null;
  return signals.map((signal) => {
    const before = previous;
    const result = stepMachine(previous, signal, thresholds);
    previous = result.step.snapshot;
    return { ...result, before, signal };
  });
};

/** A random walk on both scores, so sequences wander across the lines rather than jump at random. */
const drawWalk = (draw: Draw, length: [number, number] = [1, 24]): Signal[] => {
  let tightness = draw.int(0, 100);
  let riskAppetite = draw.int(0, 100);
  return draw.array(
    () => {
      tightness = Math.min(100, Math.max(0, tightness + draw.int(-35, 35)));
      riskAppetite = Math.min(100, Math.max(0, riskAppetite + draw.int(-35, 35)));
      return { tightness, riskAppetite, imputed: draw.int(0, 9) === 9 };
    },
    length[0],
    length[1],
  );
};

const drawMachineCase = (draw: Draw) => ({
  thresholds: { ...DEFAULT_THRESHOLDS, ...(draw.bool() ? drawThresholds(draw) : {}) },
  signals: drawWalk(draw),
});

const committedOf = (before: RegimeMachineSnapshot | null, step: RegimeMachineStep) =>
  before?.committedState ?? step.candidateState;

describe("regime engine properties: the state machine", () => {
  property(
    "every step publishes the committed state, which is either the one before or the candidate",
    drawMachineCase,
    ({ thresholds, signals }) => {
      for (const { before, step, signal } of runMachine(signals, thresholds)) {
        const committedBefore = committedOf(before, step);
        assert.equal(step.candidateState, classifyRegime(signal.tightness, signal.riskAppetite, thresholds));
        assert.equal(step.nextState, step.snapshot.committedState);
        assert.ok(step.nextState === committedBefore || step.nextState === step.candidateState);
        assert.deepEqual(step.snapshot.lastSignals, { tightness: signal.tightness, riskAppetite: signal.riskAppetite });
        switch (step.cause.outcome) {
          case "held":
            assert.equal(step.candidateState, committedBefore);
            assert.equal(step.snapshot.pendingState, null);
            assert.equal(step.snapshot.pendingCount, 0);
            break;
          case "pending":
            assert.equal(step.nextState, committedBefore);
            assert.notEqual(step.candidateState, committedBefore);
            assert.equal(step.snapshot.pendingState, step.candidateState);
            assert.equal(step.snapshot.pendingCount, step.cause.pendingCount);
            break;
          case "committed":
            assert.equal(step.nextState, step.candidateState);
            assert.notEqual(step.candidateState, committedBefore);
            assert.equal(step.snapshot.pendingState, null);
            assert.equal(step.snapshot.pendingCount, 0);
            break;
        }
      }
    },
  );

  property(
    "a flip near a line, or on a medium gate, commits only on its second consecutive reading",
    drawMachineCase,
    ({ thresholds, signals }) => {
      const steps = runMachine(signals, thresholds);
      steps.forEach(({ step, diagnostics }, index) => {
        if (step.cause.outcome !== "committed" || step.cause.shock) return;
        const needsConfirmation =
          diagnostics.confidence !== "HIGH" || diagnostics.transitionWatch || diagnostics.nearestThresholdDelta <= 8;
        if (!needsConfirmation) return;
        const previous = steps[index - 1]?.step;
        assert.ok(previous, "committed on the first reading");
        assert.equal(previous.cause.outcome, "pending");
        assert.equal(previous.candidateState, step.candidateState);
      });
    },
  );

  property(
    "a LOW gate (near a line, or an imputed input) never commits a flip without a shock",
    drawMachineCase,
    ({ thresholds, signals }) => {
      for (const { step, diagnostics } of runMachine(signals, thresholds)) {
        if (diagnostics.confidence === "LOW" && step.cause.outcome === "committed") {
          assert.ok(step.cause.shock, "a LOW-gate flip committed as confirmed");
        }
      }
    },
  );

  property(
    "a shock is a crossed line, jumped by at least the shock distance from outside the near band",
    drawMachineCase,
    ({ thresholds, signals }) => {
      for (const { before, step, signal } of runMachine(signals, thresholds)) {
        if (!step.shock) continue;
        assert.equal(step.cause.outcome, "committed");
        const last = before?.lastSignals;
        assert.ok(last, "a shock with no previous reading");
        assert.ok(step.cause.outcome === "committed" && step.cause.crossings.length > 0, "a shock that crossed no line");
        const jumped = [
          { previous: last.tightness, current: signal.tightness, line: thresholds.tightnessRegime },
          { previous: last.riskAppetite, current: signal.riskAppetite, line: thresholds.riskAppetiteRegime },
        ].some(
          (axis) =>
            (axis.previous <= axis.line) !== (axis.current <= axis.line) &&
            Math.abs(axis.current - axis.previous) >= SHOCK_CROSSING_POINTS &&
            Math.abs(axis.previous - axis.line) > REGIME_CONFIDENCE_NEAR_THRESHOLD,
        );
        assert.ok(jumped, "no axis jumped its line");
      }
    },
  );

  property(
    "a reading that alternates sides of a line within 12 points of it never flips the committed regime",
    (draw) => {
      const thresholds = { ...DEFAULT_THRESHOLDS, ...(draw.bool() ? drawThresholds(draw) : {}) };
      const axis = draw.pick(["tightness", "riskAppetite"] as const);
      const fixed = draw.int(0, 100);
      const line = axis === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime;
      const startAbove = draw.bool();
      // Above the line is `> line`; at or below is `<= line`.
      const offsets = draw.array(() => draw.int(0, 11), 2, 24);
      const signals = offsets.map((offset, index) => {
        const above = (index % 2 === 0) === startAbove;
        const moving = above ? line + 1 + offset : line - offset;
        return axis === "tightness"
          ? { tightness: moving, riskAppetite: fixed, imputed: false }
          : { tightness: fixed, riskAppetite: moving, imputed: false };
      });
      return { thresholds, signals };
    },
    ({ thresholds, signals }) => {
      const steps = runMachine(signals, thresholds);
      const first = steps[0]?.step.nextState;
      for (const { step } of steps) {
        assert.equal(step.nextState, first, `flipped to ${step.nextState} on ${step.cause.outcome}`);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// The pause and resume lines (lib/report/boundedDecisionRules.ts)
// ---------------------------------------------------------------------------

const rulesFor = (thresholds: { tightnessRegime: number; riskAppetiteRegime: number }) =>
  buildCanonicalBoundedDecisionRules({ regime: "VOLATILE", thresholds, scores: { tightness: 50, riskAppetite: 50 } });

type Scores = { tightness: number; riskAppetite: number };

const areaSides = (thresholds: { tightnessRegime: number; riskAppetiteRegime: number }, scores: Scores) =>
  rulesFor(thresholds).map((rule) => ({
    area: rule.area,
    pause: rule.pause.conditions.some((line) => isRuleConditionMet(line, scores[line.metric])),
    resume:
      rule.resume.conditions.length > 0 && rule.resume.conditions.every((line) => isRuleConditionMet(line, scores[line.metric])),
  }));

const drawScores = (draw: Draw): Scores => ({ tightness: draw.int(0, 100), riskAppetite: draw.int(0, 100) });

describe("regime engine properties: pause and resume lines", () => {
  it("draws the corridor at pause 76 and resume 66 on the default lines", () => {
    assert.deepEqual(sharedDecisionLines(DEFAULT_THRESHOLDS), {
      tightnessPause: 76,
      tightnessResume: 66,
      riskPause: 44,
      riskResume: 54,
    });
  });

  property(
    "no reading both pauses and resumes an area, on any thresholds",
    (draw) => ({ thresholds: drawThresholds(draw), scores: drawScores(draw) }),
    ({ thresholds, scores }) => {
      for (const side of areaSides(thresholds, scores)) {
        assert.ok(!(side.pause && side.resume), `${side.area} pauses and resumes at once`);
      }
    },
  );

  property(
    "a sequence that stays inside the corridor never pauses, resumes, or fires a plan-line alert",
    (draw) => {
      const thresholds = draw.bool() ? drawThresholds(draw) : DEFAULT_THRESHOLDS;
      const lines = sharedDecisionLines(thresholds);
      const readings = draw.array(
        () => ({
          tightness: draw.int(lines.tightnessResume, Math.max(lines.tightnessResume, lines.tightnessPause)),
          riskAppetite: draw.int(lines.riskPause, Math.max(lines.riskPause, lines.riskResume)),
        }),
        2,
        24,
      );
      return { thresholds, readings };
    },
    ({ thresholds, readings }) => {
      const planLines = planLinesFromRules(rulesFor(thresholds));
      readings.forEach((reading, index) => {
        for (const side of areaSides(thresholds, reading)) {
          assert.ok(!side.pause && !side.resume, `${side.area} left hold at ${JSON.stringify(reading)}`);
        }
        const previous = readings[index - 1];
        if (previous) assert.deepEqual(evaluatePlanLineCrossings(planLines, reading, previous), []);
      });
    },
  );

  property(
    "going from a pause to a resume takes a move wider than the corridor, on any thresholds",
    (draw) => ({ thresholds: drawThresholds(draw), from: drawScores(draw), to: drawScores(draw) }),
    ({ thresholds, from, to }) => {
      const before = areaSides(thresholds, from);
      const after = areaSides(thresholds, to);
      const moved = Math.max(Math.abs(to.tightness - from.tightness), Math.abs(to.riskAppetite - from.riskAppetite));
      before.forEach((side, index) => {
        if (side.pause && after[index]?.resume) assert.ok(moved > 10, `${side.area} went from pause to resume on a ${moved}-point move`);
      });
    },
  );

  /*
   * Until 2026-10-21 the tightness pause line, `tightnessRegime + 6`, was the
   * one shared line not clamped to the 0-100 scale, so a regime line of 95 or
   * more (the advanced threshold controls allow up to 100) printed
   * "Funding pressure > 101".
   */
  property("every shared pause and resume line sits on the 0-100 scale", drawThresholds, (thresholds) => {
    for (const [name, value] of Object.entries(sharedDecisionLines(thresholds))) {
      assert.ok(value >= 0 && value <= 100, `${name} at ${value}`);
    }
  });
});

// ---------------------------------------------------------------------------
// FRED missing values (lib/fred.ts, scripts/regimeArchiveContext.ts)
// ---------------------------------------------------------------------------

const MISSING_KINDS = ["blank", "dot", "space"] as const;
type FieldKind = "value" | "zero" | (typeof MISSING_KINDS)[number];

const rawField = (kind: FieldKind, value: number, places: number) => {
  switch (kind) {
    case "value":
      return value.toFixed(places);
    case "zero":
      return (0).toFixed(places);
    case "blank":
      return "";
    case "dot":
      return ".";
    case "space":
      return " ";
  }
};

describe("regime engine properties: FRED missing values", () => {
  property(
    "every FRED parser reads an empty, dotted or blank field as missing and every printed value, zero included, as itself",
    (draw) => ({
      rows: draw.array(
        () => ({
          kind: draw.pick<FieldKind>(["value", "value", "zero", ...MISSING_KINDS]),
          value: draw.decimal(-2, 90),
          places: draw.int(0, 3),
        }),
        1,
        30,
      ),
      crlf: draw.bool(),
    }),
    ({ rows, crlf }) => {
      const fields = rows.map((row, index) => ({
        date: daysBefore(RECORD_DATE, rows.length - 1 - index),
        raw: rawField(row.kind, row.value, row.places),
        missing: row.kind !== "value" && row.kind !== "zero",
      }));
      const expected = fields.map((field) => ({ date: field.date, value: field.missing ? null : Number(field.raw) }));
      const present = expected.flatMap((row) => (row.value === null ? [] : [{ date: row.date, value: row.value }]));
      const csv = ["observation_date,DGS1MO", ...fields.map((field) => `${field.date},${field.raw}`)].join(crlf ? "\r\n" : "\n");

      for (const field of fields) assert.equal(isMissingFredValue(field.raw), field.missing, JSON.stringify(field.raw));
      assert.deepEqual(parseFredCsvRows(csv), present);
      assert.deepEqual([...parseFredCsvSeries(csv)].map(([date, value]) => ({ date, value })), expected);
      const series = parseSeries(csv);
      assert.deepEqual(series.points.map(({ date, value }) => ({ date, value })), expected);
      assert.deepEqual([...series.map].map(([date, value]) => ({ date, value })), present);
      assert.deepEqual(
        parseFredApiObservations({ observations: fields.map((field) => ({ date: field.date, value: field.raw })) }),
        present,
      );
    },
  );
});
