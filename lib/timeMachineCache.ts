/**
 * Time Machine cache loader for pre-fetched Treasury snapshots.
 * Keeps historical lookups local to avoid third-party calls in replay mode.
 */
import { z } from "zod";
import type { TreasuryData } from "./types";
import { TreasuryDataSchema } from "./treasurySchema";
import { evaluateRegime } from "./regimeEngine";
import rawCache from "../data/time_machine_cache.json";

const TimeMachineSnapshotSchema = TreasuryDataSchema.extend({
  year: z.number(),
  month: z.number(),
});

const TimeMachineCacheSchema = z.array(TimeMachineSnapshotSchema);

const parsedCache = TimeMachineCacheSchema.safeParse(rawCache);

if (!parsedCache.success) {
  throw new Error("Time Machine cache failed validation.");
}

const sortedSnapshots = parsedCache.data
  .map((snapshot) => ({
    ...snapshot,
    isLive: false,
  }))
  .sort(
    (a, b) =>
      new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
  );

export const getTimeMachineCoverage = () => {
  const earliest = sortedSnapshots[0];
  const latest = sortedSnapshots.at(-1);
  return {
    earliest: earliest?.record_date ?? null,
    latest: latest?.record_date ?? null,
  };
};

export const getTimeMachineYears = () => {
  const years = new Set<number>();
  sortedSnapshots.forEach((snapshot) => years.add(snapshot.year));
  return Array.from(years).sort((a, b) => b - a);
};

export const getTimeMachineMonthsByYear = () => {
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
};

export const hasTimeMachineEntry = (year: number, month: number) => {
  return sortedSnapshots.some(
    (snapshot) => snapshot.year === year && snapshot.month === month
  );
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

export const getTimeMachineRegimeSeries = (months = 24): TimeMachineRegimeEntry[] => {
  const sliceStart = Math.max(sortedSnapshots.length - months, 0);
  return sortedSnapshots.slice(sliceStart).map((snapshot) => {
    const assessment = evaluateRegime(snapshot);
    return {
      year: snapshot.year,
      month: snapshot.month,
      recordDate: snapshot.record_date,
      regime: assessment.regime,
      summary: assessment.description,
    };
  });
};

export const getPreviousTimeMachineSnapshot = (asOf: string): TreasuryData | null => {
  const target = new Date(asOf);
  if (Number.isNaN(target.valueOf())) {
    return null;
  }

  const candidate = [...sortedSnapshots].reverse().find((snapshot) => {
    const recordDate = new Date(snapshot.record_date);
    return recordDate < target;
  });

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

  const candidate = [...sortedSnapshots].reverse().find((snapshot) => {
    const recordDate = new Date(snapshot.record_date);
    return recordDate <= target;
  });

  if (!candidate) {
    return null;
  }

  const { year: _year, month: _month, ...data } = candidate;
  return data;
};
