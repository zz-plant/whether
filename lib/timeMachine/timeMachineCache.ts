/**
 * Time Machine cache loader for pre-fetched Treasury snapshots.
 * Keeps historical lookups local to avoid third-party calls in replay mode.
 */
import { z } from "zod";
import type { SeriesHistoryPoint, TreasuryData } from "../types";
import { TreasuryDataSchema } from "../treasury/treasurySchema";
import type { RegimeAssessment, RegimeKey, RegimeThresholds } from "../regimeEngine";
import rawCache from "../../data/time_machine_cache.json";
import { snapshotData } from "../snapshot";
import { buildReplayVixReading, replayRegimeWalk } from "./regimeReplay";

const SeriesHistoryPointSchema = z.object({
  date: z.string(),
  value: z.number().nullable(),
});

const BaseRateVelocityWindowSchema = z.object({
  compareDate: z.string(),
  compareValue: z.number(),
  latestDate: z.string(),
  latestValue: z.number(),
});

const TimeMachineSnapshotSchema = TreasuryDataSchema.extend({
  year: z.number(),
  month: z.number(),
  /** VIX close for the period, when the generator fetched one. Feeds the
   *  market-stress haircut and veto in the replay walk; absent for caches
   *  written before the field existed, which replay without the veto. */
  vix: z.number().nullable().optional(),
  /** Trailing daily VIX observations stored with the entry. The market-stress
   *  veto means the last 10 *daily* closes, the cadence the archive generators
   *  replay with; without the stored tail the walk could only approximate it
   *  with month-end values and published a different regime than the archives
   *  for the same dates. Absent for caches written before the field existed. */
  vixHistory: z.array(SeriesHistoryPointSchema).nullable().optional(),
  /** The two observations the tightening-speed term resolves its delta from —
   *  the latest daily base-rate print for the period and the one the 91-day
   *  lookback favors. The archive generators resolve this from the full daily
   *  series; a month-cadence approximation here scored tightening speed
   *  differently than the archives for the same dates. Absent for caches
   *  written before the field existed. */
  baseRateVelocityWindow: BaseRateVelocityWindowSchema.nullable().optional(),
});

type TimeMachineSnapshot = z.infer<typeof TimeMachineSnapshotSchema>;

const TimeMachineCacheSchema = z.array(TimeMachineSnapshotSchema);
export const DEFAULT_REGIME_SERIES_MONTHS = 24;
const DEFAULT_ROLLING_YIELD_MONTHS = 12;
const MIN_ROLLING_YIELD_MONTHS = 1;
const TIME_MACHINE_STRICT_CACHE_VALIDATION_ENV =
  process.env.TIME_MACHINE_STRICT_CACHE_VALIDATION;
const STRICT_CACHE_VALIDATION_ENABLED =
  TIME_MACHINE_STRICT_CACHE_VALIDATION_ENV === "1" ||
  TIME_MACHINE_STRICT_CACHE_VALIDATION_ENV === "true";
const MAX_REGIME_SERIES_CACHE_ENTRIES = 50;

const deriveYearMonth = (recordDate: string) => {
  const parsedDate = new Date(recordDate);
  if (Number.isNaN(parsedDate.valueOf())) {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }

  return {
    year: parsedDate.getUTCFullYear(),
    month: parsedDate.getUTCMonth() + 1,
  };
};

const buildValidationFallbackSnapshot = (): TimeMachineSnapshot => {
  const { year, month } = deriveYearMonth(snapshotData.record_date);
  return {
    ...snapshotData,
    year,
    month,
  };
};

export const parseTimeMachineCache = (input: unknown): TimeMachineSnapshot[] => {
  const parsedCache = TimeMachineCacheSchema.safeParse(input);

  if (parsedCache.success) {
    return parsedCache.data;
  }

  if (STRICT_CACHE_VALIDATION_ENABLED) {
    throw new Error(
      `Time Machine cache failed validation: ${parsedCache.error.message}`
    );
  }

  const fallback = [buildValidationFallbackSnapshot()];
  console.error(
    "Time Machine cache failed validation. Falling back to latest snapshot.",
    parsedCache.error.format()
  );
  return fallback;
};

const sortedSnapshots = parseTimeMachineCache(rawCache)
  .map((snapshot) => ({
    ...snapshot,
    isLive: false,
  }))
  .sort(
    (a, b) =>
      new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
  );

const snapshotTimestamps = sortedSnapshots.map((snapshot) =>
  new Date(snapshot.record_date).getTime()
);

const timeMachineEntryKeys = new Set(
  sortedSnapshots.map((snapshot) => `${snapshot.year}-${snapshot.month}`)
);

export const buildUniqueMonthEntries = (
  snapshots: Pick<TimeMachineSnapshot, "year" | "month">[]
) => {
  const entries: { year: number; month: number }[] = [];
  const seen = new Set<string>();

  snapshots.forEach((snapshot) => {
    const key = `${snapshot.year}-${snapshot.month}`;
    if (seen.has(key)) {
      return;
    }

    entries.push({ year: snapshot.year, month: snapshot.month });
    seen.add(key);
  });

  return entries;
};

const timeMachineEntries = buildUniqueMonthEntries(sortedSnapshots);

const timeMachineEntryIndex = new Map(
  timeMachineEntries.map((entry, index) => [`${entry.year}-${entry.month}`, index])
);

const timeMachineCoverage = (() => {
  const earliest = sortedSnapshots[0];
  const latest = sortedSnapshots.at(-1);
  return {
    earliest: earliest?.record_date ?? null,
    latest: latest?.record_date ?? null,
  };
})();

const timeMachineMonthsByYear = (() => {
  const monthsByYear: Record<number, number[]> = {};
  sortedSnapshots.forEach((snapshot) => {
    if (!monthsByYear[snapshot.year]) {
      monthsByYear[snapshot.year] = [];
    }
    if (!monthsByYear[snapshot.year].includes(snapshot.month)) {
      monthsByYear[snapshot.year].push(snapshot.month);
    }
  });
  Object.keys(monthsByYear).forEach((year) => {
    monthsByYear[Number(year)].sort((a, b) => a - b);
  });
  return monthsByYear;
})();

export const getTimeMachineCoverage = () => {
  return timeMachineCoverage;
};

export const getTimeMachineMonthsByYear = () => {
  return timeMachineMonthsByYear;
};

export const hasTimeMachineEntry = (year: number, month: number) => {
  return timeMachineEntryKeys.has(`${year}-${month}`);
};

export const getAdjacentTimeMachineEntry = (
  year: number,
  month: number,
  direction: "previous" | "next"
) => {
  const index = timeMachineEntryIndex.get(`${year}-${month}`);
  if (index === undefined) {
    return null;
  }

  const adjacentIndex = direction === "previous" ? index - 1 : index + 1;
  if (adjacentIndex < 0 || adjacentIndex >= timeMachineEntries.length) {
    return null;
  }

  return timeMachineEntries[adjacentIndex] ?? null;
};

export const getLatestTimeMachineSnapshot = () => {
  return sortedSnapshots.at(-1) ?? null;
};

export type TimeMachineRegimeEntry = {
  year: number;
  month: number;
  recordDate: string;
  regime: RegimeKey;
  summary: string;
  tightness: number;
  riskAppetite: number;
  /** True when this entry's flip committed as a shock crossing — the axis
   *  jumped its line from beyond the near-band, so no published reversal
   *  condition fired. Surfaces list the change either way; this marks the ones
   *  that were structurally unforecastable. */
  shock?: boolean;
};

const timeMachineRegimeSeriesCache = new Map<string, TimeMachineRegimeEntry[]>();

const setRegimeSeriesCache = (key: string, value: TimeMachineRegimeEntry[]) => {
  if (timeMachineRegimeSeriesCache.has(key)) {
    timeMachineRegimeSeriesCache.delete(key);
  }

  timeMachineRegimeSeriesCache.set(key, value);

  if (timeMachineRegimeSeriesCache.size <= MAX_REGIME_SERIES_CACHE_ENTRIES) {
    return;
  }

  const oldestKey = timeMachineRegimeSeriesCache.keys().next().value;
  if (oldestKey) {
    timeMachineRegimeSeriesCache.delete(oldestKey);
  }
};

const buildRegimeSeriesCacheKey = (
  months: number,
  overrides?: Partial<RegimeThresholds>,
  asOf?: string
) => {
  const normalizedAsOf = asOf ?? "latest";

  if (!overrides) {
    return `${months}:default:${normalizedAsOf}`;
  }

  return [
    months,
    overrides.baseRateTightness ?? "default",
    overrides.tightnessRegime ?? "default",
    overrides.riskAppetiteRegime ?? "default",
    normalizedAsOf,
  ].join(":");
};

/** Overrides serialization for the full-walk memo: an asOf only selects a slice
 *  of the same walk, so the walk is memoized per threshold set, not per window. */
const buildRegimeWalkCacheKey = (overrides?: Partial<RegimeThresholds>) =>
  overrides
    ? [
        overrides.baseRateTightness ?? "default",
        overrides.tightnessRegime ?? "default",
        overrides.riskAppetiteRegime ?? "default",
      ].join(":")
    : "default";

const regimeWalkMemo = new Map<string, TimeMachineRegimeEntry[]>();
/** Full assessments per walk key, keyed by record date. The walk is the
 *  canonical governed record — surfaces that resolve a historical read must
 *  evaluate against its threaded machine state, not a point read. */
const regimeAssessmentMemo = new Map<string, Map<string, RegimeAssessment>>();

/**
 * The regime series replayed as one threaded walk.
 *
 * Each entry used to be evaluated independently — `evaluateRegime(snapshot)` per
 * point — which is an instant-commit quadrant read. Every published flip
 * committed the moment a line crossed, no confirmation, no shock marking, and
 * the resulting record showed it: 22 flips over 176 months, 9 of them
 * single-month spells. The walk threads the machine snapshot forward (flips
 * confirm through the gate, shocks commit and get marked) and supplies each
 * entry its trailing base-rate window (the velocity term) plus its VIX reading
 * with the daily tail stored alongside it (the haircut and the market-stress
 * veto) when the cache carries one. The threading itself is `replayRegimeWalk`,
 * the same loop the archive generators run.
 */
const buildThreadedRegimeWalk = (overrides?: Partial<RegimeThresholds>): TimeMachineRegimeEntry[] => {
  const walkKey = buildRegimeWalkCacheKey(overrides);
  const memoized = regimeWalkMemo.get(walkKey);
  if (memoized) {
    return memoized;
  }

  const replay = replayRegimeWalk(
    sortedSnapshots.map((snapshot, index) => {
      const velocityWindow = snapshot.baseRateVelocityWindow;
      const baseRateHistory = velocityWindow
        ? [
            { date: velocityWindow.compareDate, value: velocityWindow.compareValue },
            { date: velocityWindow.latestDate, value: velocityWindow.latestValue },
          ]
        : sortedSnapshots
            .slice(Math.max(0, index - 5), index + 1)
            .map((entry) => ({ date: entry.record_date, value: entry.yields.oneMonth ?? null }));
      const macroSeries =
        typeof snapshot.vix === "number"
          ? [
              buildReplayVixReading({
                value: snapshot.vix,
                recordDate: snapshot.record_date,
                fetchedAt: snapshot.fetched_at,
                history: snapshot.vixHistory ?? [],
              }),
            ]
          : [];
      return { treasury: snapshot, snapshot, macroSeries, baseRateHistory };
    }),
    overrides,
  );

  const assessments = new Map<string, RegimeAssessment>();
  const walk: TimeMachineRegimeEntry[] = replay.map(({ step: { snapshot }, assessment }) => {
    assessments.set(snapshot.record_date, assessment);
    return {
      year: snapshot.year,
      month: snapshot.month,
      recordDate: snapshot.record_date,
      regime: assessment.regime,
      summary: assessment.description,
      tightness: assessment.scores.tightness,
      riskAppetite: assessment.scores.riskAppetite,
      shock: assessment.regimeTransition?.shock || undefined,
    };
  });

  regimeWalkMemo.set(walkKey, walk);
  regimeAssessmentMemo.set(walkKey, assessments);
  return walk;
};

/**
 * The governed assessment for a cache record date, replayed with the machine
 * state threaded through the full prefix walk. Historical selections resolve
 * against this instead of a point evaluation, which would read today's live
 * machine snapshot and disagree with /history and the archives for the same
 * dates. Null when the date is outside the walk or the overrides key has not
 * been walked.
 */
export const findTimeMachineGovernedAssessment = (
  recordDate: string,
  overrides?: Partial<RegimeThresholds>,
): RegimeAssessment | null => {
  const walkKey = buildRegimeWalkCacheKey(overrides);
  let assessments = regimeAssessmentMemo.get(walkKey);
  if (!assessments) {
    buildThreadedRegimeWalk(overrides);
    assessments = regimeAssessmentMemo.get(walkKey);
  }
  return assessments?.get(recordDate) ?? null;
};

export const getTimeMachineRegimeSeries = (
  months = DEFAULT_REGIME_SERIES_MONTHS,
  overrides?: Partial<RegimeThresholds>,
  asOf?: string
): TimeMachineRegimeEntry[] => {
  const cacheKey = buildRegimeSeriesCacheKey(months, overrides, asOf);
  const cached = timeMachineRegimeSeriesCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const resolvedMonths = Math.max(months, 1);
  const asOfTime = asOf ? new Date(asOf).getTime() : Number.NaN;
  const asOfIndex =
    asOf && Number.isFinite(asOfTime)
      ? findSnapshotIndexAtOrBefore(asOfTime)
      : sortedSnapshots.length - 1;
  const lastIndex =
    typeof asOfIndex === "number" && asOfIndex >= 0
      ? asOfIndex
      : sortedSnapshots.length - 1;
  const sliceStart = Math.max(lastIndex + 1 - resolvedMonths, 0);
  const series = buildThreadedRegimeWalk(overrides).slice(sliceStart, lastIndex + 1);
  setRegimeSeriesCache(cacheKey, series);
  return series;
};

export const getRegimeSeriesCacheSize = () => timeMachineRegimeSeriesCache.size;

export type TimeMachineYieldCurveEntry = {
  year: number;
  month: number;
  recordDate: string;
  oneMonth: number | null;
  threeMonth: number | null;
  twoYear: number | null;
  tenYear: number | null;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
  curveSignal: number | null;
};

export const getTimeMachineYieldCurveSeries = (
  months = DEFAULT_REGIME_SERIES_MONTHS,
  asOf?: string
): TimeMachineYieldCurveEntry[] => {
  const resolvedMonths = Math.max(months, MIN_ROLLING_YIELD_MONTHS);
  const asOfTime = asOf ? new Date(asOf).getTime() : Number.NaN;
  const asOfIndex =
    asOf && Number.isFinite(asOfTime)
      ? findSnapshotIndexAtOrBefore(asOfTime)
      : sortedSnapshots.length - 1;
  const lastIndex =
    typeof asOfIndex === "number" && asOfIndex >= 0
      ? asOfIndex
      : sortedSnapshots.length - 1;
  const sliceStart = Math.max(lastIndex + 1 - resolvedMonths, 0);

  return sortedSnapshots.slice(sliceStart, lastIndex + 1).map((snapshot) => {
    const oneMonth = snapshot.yields.oneMonth ?? null;
    const threeMonth = snapshot.yields.threeMonth ?? null;
    const twoYear = snapshot.yields.twoYear ?? null;
    const tenYear = snapshot.yields.tenYear ?? null;
    const spread10Y2Y =
      typeof tenYear === "number" && typeof twoYear === "number"
        ? tenYear - twoYear
        : null;
    const spread2Y3M =
      typeof twoYear === "number" && typeof threeMonth === "number"
        ? twoYear - threeMonth
        : null;
    const curveSignal =
      typeof spread10Y2Y === "number" && typeof spread2Y3M === "number"
        ? 0.7 * spread10Y2Y + 0.3 * spread2Y3M
        : null;

    return {
      year: snapshot.year,
      month: snapshot.month,
      recordDate: snapshot.record_date,
      oneMonth,
      threeMonth,
      twoYear,
      tenYear,
      spread10Y2Y,
      spread2Y3M,
      curveSignal,
    };
  });
};

export const getPreviousTimeMachineSnapshot = (asOf: string): TreasuryData | null => {
  const target = new Date(asOf);
  if (Number.isNaN(target.valueOf())) {
    return null;
  }

  const targetTime = target.getTime();
  const index = findSnapshotIndexAtOrBefore(targetTime);
  const candidateIndex =
    index === null
      ? null
      : snapshotTimestamps[index] < targetTime
        ? index
        : index - 1;
  const candidate =
    candidateIndex === null || candidateIndex < 0
      ? null
      : sortedSnapshots[candidateIndex];

  if (!candidate) {
    return null;
  }

  const { year: _year, month: _month, ...data } = candidate;
  return data;
};

export const findTimeMachineSnapshot = (asOf: string): TreasuryData | null => {
  const target = new Date(asOf);
  if (Number.isNaN(target.valueOf())) {
    return null;
  }

  const targetTime = target.getTime();
  const index = findSnapshotIndexAtOrBefore(targetTime);
  const candidate = index === null ? null : sortedSnapshots[index];

  if (!candidate) {
    return null;
  }

  const { year: _year, month: _month, ...data } = candidate;
  return data;
};

export const getTimeMachineSnapshots = (): TimeMachineSnapshot[] => {
  return sortedSnapshots.map((snapshot) => ({ ...snapshot }));
};

export const getTimeMachineRollingYieldSeries = (
  months = DEFAULT_ROLLING_YIELD_MONTHS,
  asOf?: string
): {
  oneMonth: SeriesHistoryPoint[];
  threeMonth: SeriesHistoryPoint[];
  twoYear: SeriesHistoryPoint[];
  tenYear: SeriesHistoryPoint[];
} => {
  const resolvedMonths = Math.max(months, MIN_ROLLING_YIELD_MONTHS);
  const asOfTime = asOf ? new Date(asOf).getTime() : Number.NaN;
  const asOfIndex =
    asOf && Number.isFinite(asOfTime)
      ? findSnapshotIndexAtOrBefore(asOfTime)
      : sortedSnapshots.length - 1;
  const lastIndex =
    typeof asOfIndex === "number" && asOfIndex >= 0
      ? asOfIndex
      : sortedSnapshots.length - 1;
  const sliceStart = Math.max(lastIndex + 1 - resolvedMonths, 0);
  const rollingSnapshots = sortedSnapshots.slice(sliceStart, lastIndex + 1);

  return {
    oneMonth: rollingSnapshots.map((snapshot) => ({
      date: snapshot.record_date,
      value: snapshot.yields.oneMonth ?? null,
    })),
    threeMonth: rollingSnapshots.map((snapshot) => ({
      date: snapshot.record_date,
      value: snapshot.yields.threeMonth ?? null,
    })),
    twoYear: rollingSnapshots.map((snapshot) => ({
      date: snapshot.record_date,
      value: snapshot.yields.twoYear ?? null,
    })),
    tenYear: rollingSnapshots.map((snapshot) => ({
      date: snapshot.record_date,
      value: snapshot.yields.tenYear ?? null,
    })),
  };
};

const findSnapshotIndexAtOrBefore = (targetTime: number): number | null => {
  if (snapshotTimestamps.length === 0) {
    return null;
  }

  let low = 0;
  let high = snapshotTimestamps.length - 1;
  let candidate: number | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const currentTime = snapshotTimestamps[mid];

    if (currentTime <= targetTime) {
      candidate = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return candidate;
};
