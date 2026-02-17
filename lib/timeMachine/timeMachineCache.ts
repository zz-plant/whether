/**
 * Time Machine cache loader for pre-fetched Treasury snapshots.
 * Keeps historical lookups local to avoid third-party calls in replay mode.
 */
import { z } from "zod";
import type { SeriesHistoryPoint, TreasuryData } from "../types";
import { TreasuryDataSchema } from "../treasury/treasurySchema";
import { evaluateRegime } from "../regimeEngine";
import type { RegimeThresholds } from "../regimeEngine";
import rawCache from "../../data/time_machine_cache.json";
import { snapshotData } from "../snapshot";

const TimeMachineSnapshotSchema = TreasuryDataSchema.extend({
  year: z.number(),
  month: z.number(),
});

type TimeMachineSnapshot = z.infer<typeof TimeMachineSnapshotSchema>;

const TimeMachineCacheSchema = z.array(TimeMachineSnapshotSchema);

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

  const fallback = [buildValidationFallbackSnapshot()];
  console.error("Time Machine cache failed validation.", parsedCache.error.format());
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

const timeMachineCoverage = (() => {
  const earliest = sortedSnapshots[0];
  const latest = sortedSnapshots.at(-1);
  return {
    earliest: earliest?.record_date ?? null,
    latest: latest?.record_date ?? null,
  };
})();

const timeMachineYears = (() => {
  const years = new Set<number>();
  sortedSnapshots.forEach((snapshot) => years.add(snapshot.year));
  return Array.from(years).sort((a, b) => b - a);
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

export const getTimeMachineYears = () => {
  return timeMachineYears;
};

export const getTimeMachineMonthsByYear = () => {
  return timeMachineMonthsByYear;
};

export const hasTimeMachineEntry = (year: number, month: number) => {
  return timeMachineEntryKeys.has(`${year}-${month}`);
};

export const getLatestTimeMachineSnapshot = () => {
  return sortedSnapshots.at(-1) ?? null;
};

export type TimeMachineRegimeEntry = {
  year: number;
  month: number;
  recordDate: string;
  regime: ReturnType<typeof evaluateRegime>["regime"];
  summary: string;
};

const timeMachineRegimeSeriesCache = new Map<string, TimeMachineRegimeEntry[]>();

const buildRegimeSeriesCacheKey = (
  months: number,
  overrides?: Partial<RegimeThresholds>
) => {
  if (!overrides) {
    return `${months}:default`;
  }

  return [
    months,
    overrides.baseRateTightness ?? "default",
    overrides.tightnessRegime ?? "default",
    overrides.riskAppetiteRegime ?? "default",
  ].join(":");
};

export const getTimeMachineRegimeSeries = (
  months = 24,
  overrides?: Partial<RegimeThresholds>
): TimeMachineRegimeEntry[] => {
  const cacheKey = buildRegimeSeriesCacheKey(months, overrides);
  const cached = timeMachineRegimeSeriesCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const sliceStart = Math.max(sortedSnapshots.length - months, 0);
  const series = sortedSnapshots.slice(sliceStart).map((snapshot) => {
    const assessment = evaluateRegime(snapshot, overrides);
    return {
      year: snapshot.year,
      month: snapshot.month,
      recordDate: snapshot.record_date,
      regime: assessment.regime,
      summary: assessment.description,
    };
  });
  timeMachineRegimeSeriesCache.set(cacheKey, series);
  return series;
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

export const getTimeMachineRollingYieldSeries = (
  months = 12,
  asOf?: string
): {
  oneMonth: SeriesHistoryPoint[];
  threeMonth: SeriesHistoryPoint[];
  twoYear: SeriesHistoryPoint[];
  tenYear: SeriesHistoryPoint[];
} => {
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
