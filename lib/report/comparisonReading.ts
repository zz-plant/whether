import {
  MACRO_ADJUSTMENT_CONSTANTS,
  resolveBaseRateVelocityPair,
  type evaluateRegime,
  type RegimeKey,
  type RegimeScores,
  type RegimeThresholds,
} from "../regimeEngine";
import type { MacroSeriesReading, SeriesHistoryPoint, TreasuryData } from "../types";
import type { PublishedBrief } from "./publishedBriefs";

/**
 * The earlier reading a week's moves are measured against.
 *
 * "What changed this week" compares the reading with last week's published brief:
 * the record the archive froze from the live brief a week ago. It is like-for-like
 * only when the same engine scored both. A record scored by today's `ENGINE_VERSION`
 * is compared as stored. One scored by another engine is compared only if it
 * stored the inputs that engine scored (`inputs`, stored from 2026-10-07), which
 * the current engine then scores again (`rescoreStoredInputs`): a scoring change
 * used to leave no brief to compare with for a week or two, until one frozen by
 * the new engine was five days old. Until 2026-10-07 every week compared with the
 * previous Time Machine snapshot, the last month-end, so each brief in a month
 * restated the same move (§1.1.26 and §1.1.28 of docs/feature-specs-current.md).
 * The month-end is now the fallback, used only where no brief from the previous
 * one to two weeks can be compared with, and named by its date like any other
 * basis. The month-end is re-scored by the current engine on every load, so it is
 * like-for-like either way (§1.1.51, §1.1.53).
 */
export type ComparisonReading = {
  /** The earlier reading's record date, ISO: a brief's, or the month-end snapshot's. */
  recordDate: string;
  /** The conditions it was published or scored as. */
  regime: RegimeKey;
  scores: {
    tightness: number;
    riskAppetite: number;
    /** Null where the earlier reading did not record it: that row prints no comparison rather than an invented one. */
    baseRate: number | null;
    curveSlope: number | null;
  };
};

/*
 * How far back last week's brief can be. Five days at the near end, so a mid-week
 * read compares with the previous week's brief and never with this week's own
 * record (frozen from the same Monday reading, or later); fourteen at the far end,
 * so a missed freeze reaches back one more week before the month-end takes over.
 */
const NEAREST_DAYS = 5;
const FURTHEST_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dayOf = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);

/**
 * A reading's short-term rate, or null where it had none. The engine scores a
 * missing rate as 0 (`baseRateUsed: "MISSING"`), which is not a reading: compared
 * as one, a feed failure printed as the rate falling to zero.
 */
export const observedBaseRate = (scores: Pick<RegimeScores, "baseRate" | "baseRateUsed">): number | null =>
  scores.baseRateUsed === "MISSING" ? null : scores.baseRate;

/** What a record stores of the inputs its engine scored (`PublishedBriefSchema.inputs`). */
type StoredInputs = NonNullable<PublishedBrief["inputs"]>;

/*
 * The market series the engine scores (`applyMacroAdjustments`), and no other:
 * the record-basis ones that move the published scores, and the ones outside
 * the record that move only `scores.offRecord`, which a later engine needs to
 * say what a stored week counted (`describePublishedWeekBasis`). The policy
 * layer also reads the BBB spread, inflation and unemployment with their
 * histories, but nothing it computes reaches the scores or the conditions, and
 * a comparison reads nothing else, so a record does not store them.
 * tests/weeklyComparison.test.tsx moves every series the engine knows and fails
 * if the set that moves a score, published or not counted, stops being this one.
 */
const SCORED_MACRO_SERIES = [
  "HY_CREDIT_SPREAD",
  "CHICAGO_FCI",
  "VIX_INDEX",
  "VC_FUNDING_VELOCITY",
  "TECH_LAYOFF_TREND",
] as const satisfies readonly (keyof StoredInputs["macro"])[];

/**
 * The inputs a reading's scores and conditions were scored from, as a published
 * record stores them, so a later engine can score them again
 * (`rescoreStoredInputs`). Only what the scorer reads for those:
 *
 * - the Treasury yields the short-term rate and the curve come from (`getBaseRate`,
 *   `computeCurveSlope`);
 * - the two short-term-rate prints the tightening-speed term measures between
 *   (`resolveBaseRateVelocityPair`), not the 92 days of history they were found
 *   in: the term reads the pair, as the Time Machine cache stores it;
 * - each scored market series' value, where the reading had one;
 * - the VIX closes the market-stress veto means, the last `vixVetoMeanWindow`,
 *   where the reading had that many (with fewer the veto reads the close alone).
 */
export const buildStoredInputs = (
  treasury: Pick<TreasuryData, "yields" | "oneMonthHistory">,
  macroSeries: readonly MacroSeriesReading[],
): StoredInputs => {
  const { fedFunds, oneMonth, threeMonth, twoYear, tenYear } = treasury.yields;
  const pair = resolveBaseRateVelocityPair(treasury.oneMonthHistory);
  const macro: StoredInputs["macro"] = {};
  for (const id of SCORED_MACRO_SERIES) {
    const value = macroSeries.find((entry) => entry.id === id)?.value;
    if (typeof value === "number") macro[id] = value;
  }
  const vixCloses = (macroSeries.find((entry) => entry.id === "VIX_INDEX")?.history ?? [])
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number")
    .slice(-MACRO_ADJUSTMENT_CONSTANTS.vixVetoMeanWindow);
  return {
    /* Keys the reading did not carry stay out, so the record re-reads as written. */
    yields: {
      ...(fedFunds === undefined ? {} : { fedFunds }),
      oneMonth,
      ...(threeMonth === undefined ? {} : { threeMonth }),
      twoYear,
      tenYear,
    },
    ...(pair
      ? {
          baseRateWindow: {
            compareDate: pair.compare.date,
            compareValue: pair.compare.value,
            latestDate: pair.latest.date,
            latestValue: pair.latest.value,
          },
        }
      : {}),
    macro,
    ...(vixCloses.length === MACRO_ADJUSTMENT_CONSTANTS.vixVetoMeanWindow ? { vixCloses } : {}),
  };
};

/** Scores a record's stored inputs with the current engine, as a comparison reads them: the conditions and the scores. */
export type RescoreStoredInputs = (inputs: StoredInputs, recordDate: string) => Pick<ComparisonReading, "regime" | "scores">;

/*
 * The engine reads a market series' id, value and history; the rest of the shape
 * is filled to type and never leaves the re-scorer, which returns the conditions
 * and the scores alone. The veto means the closes' values, not their dates, so
 * they are dated by the record they were stored with.
 */
const storedSeries = (
  id: (typeof SCORED_MACRO_SERIES)[number],
  value: number | null,
  recordDate: string,
  history: SeriesHistoryPoint[] = [],
): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "index",
  explanation: "",
  sourceLabel: "",
  sourceUrl: "",
  formulaUrl: "",
  record_date: recordDate,
  fetched_at: recordDate,
  isLive: false,
  history,
});

/**
 * A record's stored inputs scored by the engine passed in, under the
 * thresholds passed in, with no machine state: the whole assessment, for a
 * caller that needs more than the comparison reads (what the record's
 * inputs outside the record would have made its scores).
 */
export const scoreStoredInputs = (
  evaluate: typeof evaluateRegime,
  thresholds: RegimeThresholds,
  inputs: StoredInputs,
  recordDate: string,
) => {
  const treasury: TreasuryData = {
    source: "",
    record_date: recordDate,
    fetched_at: recordDate,
    isLive: false,
    yields: { ...inputs.yields },
  };
  const macroSeries = SCORED_MACRO_SERIES.flatMap((id) => {
    const value = inputs.macro[id] ?? null;
    if (id === "VIX_INDEX" && inputs.vixCloses) {
      return [storedSeries(id, value, recordDate, inputs.vixCloses.map((close) => ({ date: recordDate, value: close })))];
    }
    return value === null ? [] : [storedSeries(id, value, recordDate)];
  });
  const pair = inputs.baseRateWindow;
  const baseRateHistory = pair
    ? [
        { date: pair.compareDate, value: pair.compareValue },
        { date: pair.latestDate, value: pair.latestValue },
      ]
    : undefined;
  return evaluate(treasury, thresholds, macroSeries, null, { baseRateHistory });
};

/**
 * A re-scorer for stored inputs: the engine passed in (the loader's
 * `evaluateRegime`) under the thresholds passed in (the reading's own). The
 * scores are the engine's for those inputs, and the same engine reproduces a
 * record's stored scores exactly (`buildPublishedBriefRecord` stores inputs only
 * when it does).
 *
 * No machine state is passed, as none is for the month-end the loader re-scores
 * (`evaluateRegime(previousSnapshot, thresholds)`): the conditions are the ones
 * the scores sit in. A published regime can differ from that where the machine
 * was holding a flip that week, and then the comparison names the quadrant the
 * re-scored scores are in, as the month-end comparison always has. Threading a
 * machine state would mean storing one, from an engine that is no longer
 * scoring.
 */
export const rescoreStoredInputs =
  (evaluate: typeof evaluateRegime, thresholds: RegimeThresholds): RescoreStoredInputs =>
  (inputs, recordDate) => {
    const { regime, scores } = scoreStoredInputs(evaluate, thresholds, inputs, recordDate);
    return {
      regime,
      scores: {
        tightness: scores.tightness,
        riskAppetite: scores.riskAppetite,
        baseRate: observedBaseRate(scores),
        curveSlope: scores.curveSlope,
      },
    };
  };

/**
 * The most recent published brief whose record date is five to fourteen days
 * before `currentRecordDate`, as the reading this week compares with; null when
 * the archive has none in that window, and then the caller compares with the
 * month-end. A record scored by `engineVersion` is read as stored. One scored by
 * another engine, or by one it did not record (every record frozen before
 * 2026-10-07), is scored again by `rescore` from the inputs it stored, and passed
 * over where it stored none: across a scoring change the move would be the
 * code's, printed as the market's. A record with neither scores nor inputs cannot
 * be compared with and is passed over too. A record dated on or after the reading
 * never qualifies. Pure: the engine arrives in `rescore`, which is called once at
 * most, for the record chosen.
 */
export const findWeeklyComparisonReading = (
  records: readonly Pick<PublishedBrief, "recordDate" | "regime" | "scores" | "inputs">[],
  currentRecordDate: string,
  engineVersion: string,
  rescore: RescoreStoredInputs,
): ComparisonReading | null => {
  const current = dayOf(currentRecordDate);
  if (!Number.isFinite(current)) return null;

  const latest = records
    .flatMap((record) => {
      const recorded = dayOf(record.recordDate);
      const daysBefore = (current - recorded) / MS_PER_DAY;
      const comparable = record.scores?.engineVersion === engineVersion || record.inputs !== undefined;
      return comparable && Number.isFinite(recorded) && daysBefore >= NEAREST_DAYS && daysBefore <= FURTHEST_DAYS
        ? [{ record, recorded }]
        : [];
    })
    .sort((left, right) => right.recorded - left.recorded)[0];
  if (!latest) return null;

  const { record } = latest;
  if (record.scores?.engineVersion === engineVersion) {
    return {
      recordDate: record.recordDate,
      regime: record.regime,
      scores: {
        tightness: record.scores.tightness,
        riskAppetite: record.scores.riskAppetite,
        baseRate: record.scores.baseRate ?? null,
        curveSlope: record.scores.curveSlope ?? null,
      },
    };
  }
  return record.inputs ? { recordDate: record.recordDate, ...rescore(record.inputs, record.recordDate) } : null;
};
