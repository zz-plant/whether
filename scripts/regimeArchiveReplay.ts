/**
 * What each archive generator writes, built from the fetched series and a clock.
 *
 * The three `generate*Summaries.ts` scripts fetch the series, call one of these
 * and write the result; everything between is here so it can be run offline
 * on fixture series (`tests/regimeArchiveGolden.test.ts` replays every cadence
 * from the bundled data and holds it to the archive on record). Each builder
 * resolves its periods, scores them as one threaded walk
 * (`replayArchivePeriods`), and turns each reading into the archived entry.
 */
import { ENGINE_VERSION } from "../lib/regimeEngine";
import { buildMonthlySummary, type MonthlySummary } from "../lib/summary/monthlySummary";
import { buildQuarterlySummary } from "../lib/summary/quarterlySummary";
import { buildWeeklySummary, type WeeklySummary } from "../lib/summary/weeklySummary";
import { buildYearlySummary } from "../lib/summary/yearlySummary";
import { resolveHistoricalDate } from "../lib/timeMachine/timeMachine";
import type { TreasuryData } from "../lib/types";
import {
  buildArchiveProvenance,
  formatArchiveDate,
  replayArchivePeriods,
  resolveBaseRateVelocityWindow,
  resolveEffectiveEndTime,
  withArchiveInputSources,
  type BaseRateVelocityWindow,
  type SeriesDataset,
  type TreasuryDatasets,
} from "./regimeArchiveContext";
import { resolveYearRange } from "./summaryRange";

type ArchiveInputs = {
  datasets: TreasuryDatasets;
  vixDataset: SeriesDataset | null;
  /** The Chicago Fed index, weekly; on the record basis since engine-2026-10-09b. */
  chicagoFciDataset: SeriesDataset;
  /** The run's clock: fetch timestamps, data ages and the last completed week. */
  now: Date;
};

type ArchiveMode = "replace" | "merge";

/**
 * Which engine calibration scored an entry. Every entry these builders write
 * carries it; entries written before it existed do not, so readers treat it as
 * optional.
 */
type EngineStamp = { engineVersion: string };

// ── Weekly ──

const WEEKLY_START_YEAR = 2018;
const HISTORY_WEEKS_ENV = "HISTORY_WEEKS";

export type WeeklySummaryArchiveEntry = {
  year: number;
  week: number;
  asOf: string;
  record_date: string;
  summary: WeeklySummary;
} & EngineStamp;

const resolveHistoryWeeksLimit = () => {
  const value = process.env[HISTORY_WEEKS_ENV];
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${HISTORY_WEEKS_ENV} must be a positive integer (received "${value}").`
    );
  }

  return parsed;
};

const getIsoWeekInfo = (date: Date) => {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: target.getUTCFullYear(), week };
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const getNextFriday = (date: Date) => {
  const day = date.getUTCDay();
  const daysToFriday = (5 - day + 7) % 7;
  return addDays(date, daysToFriday);
};

const getPreviousFriday = (date: Date) => {
  const day = date.getUTCDay();
  const daysSinceFriday = (day - 5 + 7) % 7;
  return addDays(date, -daysSinceFriday);
};

const getLatestCompletedWeekEnd = (latestDataDate: Date, now: Date) => {
  const candidate = getNextFriday(latestDataDate);
  return candidate.getTime() <= now.getTime() ? candidate : getPreviousFriday(latestDataDate);
};

const buildWeekDescriptors = (
  startYear: number,
  endYear: number,
  endDateOverride?: Date
): { year: number; week: number; asOf: string }[] => {
  const startDate = new Date(Date.UTC(startYear, 0, 1));
  const endDate = endDateOverride ?? new Date(Date.UTC(endYear, 11, 31));
  const weeks: { year: number; week: number; asOf: string }[] = [];
  let weekEnd = getNextFriday(startDate);

  while (weekEnd <= endDate) {
    const isoWeek = getIsoWeekInfo(weekEnd);
    weeks.push({
      year: isoWeek.year,
      week: isoWeek.week,
      asOf: toIsoDate(weekEnd),
    });
    weekEnd = addDays(weekEnd, 7);
  }

  return weeks.filter((week) => week.year >= startYear && week.year <= endYear);
};

/**
 * Every Friday-ending week from 2018 to the last completed one. The walk
 * threads every week of the range even when `HISTORY_WEEKS` scopes the write,
 * so a merge lands with the confirmations a full replay would have produced.
 */
export const buildWeeklyArchive = ({ datasets, vixDataset, chicagoFciDataset, now }: ArchiveInputs): {
  entries: WeeklySummaryArchiveEntry[];
  effectiveEndYear: number;
  mode: ArchiveMode;
} => {
  const fetchedAt = now.toISOString();
  const effectiveEndTime = resolveEffectiveEndTime(datasets);
  const effectiveEndDate = new Date(effectiveEndTime);
  const effectiveEndYear = effectiveEndDate.getUTCFullYear();
  const latestCompletedWeekEnd = getLatestCompletedWeekEnd(effectiveEndDate, now);

  const { startYear, endYear, isPartial } = resolveYearRange({
    defaultStartYear: WEEKLY_START_YEAR,
    defaultEndYear: Math.min(now.getUTCFullYear(), effectiveEndYear),
    minYear: WEEKLY_START_YEAR,
    maxYear: effectiveEndYear,
  });
  const endDateOverride =
    endYear === effectiveEndYear
      ? latestCompletedWeekEnd
      : new Date(Date.UTC(endYear, 11, 31));
  const weeks = buildWeekDescriptors(startYear, endYear, endDateOverride);
  const historyWeeksLimit = resolveHistoryWeeksLimit();
  const scopedWeeks =
    historyWeeksLimit === null ? weeks : weeks.slice(Math.max(0, weeks.length - historyWeeksLimit));
  const scopedAsOfs = new Set(scopedWeeks.map((week) => week.asOf));

  const entries = replayArchivePeriods({
    periods: weeks,
    datasets,
    vixDataset,
    chicagoFciDataset,
    fetchedAt,
    coverage: "week-lag",
  })
    .filter(({ period }) => scopedAsOfs.has(period.asOf))
    .map(({ period: { year, week, asOf }, treasury, assessment }) => {
      // Weekly artifacts should display the week-ending label even when the
      // underlying Treasury series falls back to the latest common prior day.
      const summary = buildWeeklySummary({
        assessment,
        provenance: buildArchiveProvenance(treasury.fetched_at, now),
        recordDateLabel: formatArchiveDate(asOf),
      });
      return {
        year,
        week,
        asOf,
        record_date: treasury.record_date,
        summary: withArchiveInputSources(summary, assessment.scores.baseRateUsed),
        engineVersion: ENGINE_VERSION,
      };
    });

  return {
    entries,
    effectiveEndYear,
    mode: isPartial || historyWeeksLimit !== null ? "merge" : "replace",
  };
};

// ── Monthly ──

const MONTHLY_START_YEAR = 2012;

export type MonthlySummaryArchiveEntry = {
  year: number;
  month: number;
  asOf: string;
  record_date: string;
  summary: MonthlySummary;
  tightness: number;
  riskAppetite: number;
} & EngineStamp;

export type TimeMachineCacheEntry = TreasuryData & {
  year: number;
  month: number;
  vix?: number | null;
  /** Trailing daily VIX observations for the entry. The runtime replay's
   *  market-stress veto means the last 10 daily closes, the same cadence this
   *  walk uses; without the stored tail it could only approximate the veto with
   *  month-end values and drift from the archives. */
  vixHistory?: { date: string; value: number | null }[] | null;
  /** The two observations the tightening-speed term resolves its delta from.
   *  The runtime replay evaluates the same delta from this pair that this walk
   *  computes from the full daily window. */
  baseRateVelocityWindow?: BaseRateVelocityWindow | null;
  /** The Chicago Fed index a reader had at the entry's date (published five days
   *  after the week it measures), and the weekly observations a reader had in
   *  the 60 days before, so a replay can rebuild the series from the entries alone. */
  chicagoFci?: number | null;
  chicagoFciHistory?: { date: string; value: number | null }[] | null;
};

const isSameMonthAndYear = (value: string, asOf: string) => {
  const valueDate = new Date(`${value}T00:00:00Z`);
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  return (
    valueDate.getUTCFullYear() === asOfDate.getUTCFullYear() &&
    valueDate.getUTCMonth() === asOfDate.getUTCMonth()
  );
};

/**
 * Every month-end from 2012. A partial run (`HISTORY_START_YEAR`, which
 * `time-machine:update-summaries` sets to 2024 by default) still walks from
 * the first year and only filters which records it writes. Starting the walk at
 * the requested year began it with no machine state, so the first selected
 * month instant-committed its quadrant and later confirmations could differ
 * from the full replay the merge target was built from.
 */
export const buildMonthlyArchive = ({ datasets, vixDataset, chicagoFciDataset, now }: ArchiveInputs): {
  entries: MonthlySummaryArchiveEntry[];
  timeMachineEntries: TimeMachineCacheEntry[];
  mode: ArchiveMode;
} => {
  const fetchedAt = now.toISOString();
  const effectiveEndTime = resolveEffectiveEndTime(datasets);
  const effectiveEndYear = new Date(effectiveEndTime).getUTCFullYear();
  const { startYear, endYear, isPartial } = resolveYearRange({
    defaultStartYear: MONTHLY_START_YEAR,
    defaultEndYear: effectiveEndYear,
    minYear: MONTHLY_START_YEAR,
    maxYear: effectiveEndYear,
  });

  const periods: { year: number; month: number; asOf: string }[] = [];
  for (let year = MONTHLY_START_YEAR; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const asOf = resolveHistoricalDate(year, month);
      if (year === effectiveEndYear && Date.parse(`${asOf}T00:00:00Z`) > effectiveEndTime) {
        break;
      }
      periods.push({ year, month, asOf });
    }
  }

  const readings = replayArchivePeriods({
    periods,
    datasets,
    vixDataset,
    chicagoFciDataset,
    fetchedAt,
    coverage: "period-end",
    checkRecordDate: ({ year, month, asOf }, recordDate) =>
      isSameMonthAndYear(recordDate, asOf)
        ? null
        : `Latest available yield curve data ${recordDate} does not fall within ${year}-${String(
            month
          ).padStart(2, "0")}.`,
  }).filter(({ period }) => period.year >= startYear);

  return {
    entries: readings.map(({ period: { year, month, asOf }, treasury, assessment }) => {
      const summary = buildMonthlySummary({
        assessment,
        provenance: buildArchiveProvenance(treasury.fetched_at, now),
        recordDateLabel: formatArchiveDate(treasury.record_date),
      });
      return {
        year,
        month,
        asOf,
        record_date: treasury.record_date,
        summary: withArchiveInputSources(summary, assessment.scores.baseRateUsed),
        tightness: assessment.scores.tightness,
        riskAppetite: assessment.scores.riskAppetite,
        engineVersion: ENGINE_VERSION,
      };
    }),
    timeMachineEntries: readings.map(({ period: { year, month }, asOfTime, treasury, vixReading, chicagoFciReading }) => ({
      year,
      month,
      vix: vixReading?.value ?? null,
      vixHistory: vixReading?.history ?? null,
      baseRateVelocityWindow: resolveBaseRateVelocityWindow(datasets.oneMonth, asOfTime),
      chicagoFci: chicagoFciReading?.value ?? null,
      chicagoFciHistory: chicagoFciReading?.history ?? null,
      ...treasury,
    })),
    mode: isPartial ? "merge" : "replace",
  };
};

// ── Quarterly and yearly ──

const QUARTERLY_START_YEAR = 2010;

export type QuarterlySummaryArchiveEntry = {
  year: number;
  quarter: number;
  asOf: string;
  record_date: string;
  summary: ReturnType<typeof buildQuarterlySummary>;
} & EngineStamp;

export type YearlySummaryArchiveEntry = {
  year: number;
  asOf: string;
  record_date: string;
  summary: ReturnType<typeof buildYearlySummary>;
} & EngineStamp;

type QuarterOrYear =
  | { kind: "quarter"; year: number; quarter: number; asOf: string }
  | { kind: "year"; year: number; asOf: string };

const isSameQuarterAndYear = (value: string, asOf: string) => {
  const valueDate = new Date(`${value}T00:00:00Z`);
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  const valueQuarter = Math.floor(valueDate.getUTCMonth() / 3);
  const asOfQuarter = Math.floor(asOfDate.getUTCMonth() / 3);
  return (
    valueDate.getUTCFullYear() === asOfDate.getUTCFullYear() &&
    valueQuarter === asOfQuarter
  );
};

const isSameYear = (value: string, asOf: string) => {
  const valueDate = new Date(`${value}T00:00:00Z`);
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  return valueDate.getUTCFullYear() === asOfDate.getUTCFullYear();
};

/**
 * One threaded walk across quarters and years: each year's four quarter-ends,
 * then the year-end read once more as the year. The year re-reads December, so
 * the machine sees that reading twice; that is how the archive on record was
 * built, and the replay keeps it. A partial run (`HISTORY_START_YEAR`) still
 * walks from the first year and only filters which records it writes.
 */
export const buildQuarterlyYearlyArchive = ({ datasets, vixDataset, chicagoFciDataset, now }: ArchiveInputs): {
  quarterlyEntries: QuarterlySummaryArchiveEntry[];
  yearlyEntries: YearlySummaryArchiveEntry[];
  mode: ArchiveMode;
} => {
  const fetchedAt = now.toISOString();
  const effectiveEndTime = resolveEffectiveEndTime(datasets);
  const effectiveEndYear = new Date(effectiveEndTime).getUTCFullYear();
  const { startYear, endYear, isPartial } = resolveYearRange({
    defaultStartYear: QUARTERLY_START_YEAR,
    defaultEndYear: effectiveEndYear,
    minYear: QUARTERLY_START_YEAR,
    maxYear: effectiveEndYear,
  });

  const periods: QuarterOrYear[] = [];
  for (let year = QUARTERLY_START_YEAR; year <= endYear; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const asOf = resolveHistoricalDate(year, quarter * 3);
      if (Date.parse(`${asOf}T00:00:00Z`) > effectiveEndTime) {
        break;
      }
      periods.push({ kind: "quarter", year, quarter, asOf });
    }
    const yearAsOf = resolveHistoricalDate(year, 12);
    if (Date.parse(`${yearAsOf}T00:00:00Z`) <= effectiveEndTime) {
      periods.push({ kind: "year", year, asOf: yearAsOf });
    }
  }

  const readings = replayArchivePeriods({
    periods,
    datasets,
    vixDataset,
    chicagoFciDataset,
    fetchedAt,
    coverage: "period-end",
    checkRecordDate: (period, recordDate) => {
      if (period.kind === "quarter") {
        return isSameQuarterAndYear(recordDate, period.asOf)
          ? null
          : `Latest available yield curve data ${recordDate} does not fall within Q${period.quarter} ${period.year}.`;
      }
      return isSameYear(recordDate, period.asOf)
        ? null
        : `Latest available yield curve data ${recordDate} does not fall within ${period.year}.`;
    },
  }).filter(({ period }) => period.year >= startYear);

  const quarterlyEntries: QuarterlySummaryArchiveEntry[] = [];
  const yearlyEntries: YearlySummaryArchiveEntry[] = [];
  for (const { period, treasury, assessment } of readings) {
    const provenance = buildArchiveProvenance(treasury.fetched_at, now);
    const recordDateLabel = formatArchiveDate(treasury.record_date);
    if (period.kind === "quarter") {
      const summary = buildQuarterlySummary({
        assessment,
        provenance,
        recordDateLabel,
        periodLabel: `Q${period.quarter} ${period.year}`,
      });
      quarterlyEntries.push({
        year: period.year,
        quarter: period.quarter,
        asOf: period.asOf,
        record_date: treasury.record_date,
        summary: withArchiveInputSources(summary, assessment.scores.baseRateUsed),
        engineVersion: ENGINE_VERSION,
      });
    } else {
      const summary = buildYearlySummary({
        assessment,
        provenance,
        recordDateLabel,
        periodLabel: `${period.year}`,
      });
      yearlyEntries.push({
        year: period.year,
        asOf: period.asOf,
        record_date: treasury.record_date,
        summary: withArchiveInputSources(summary, assessment.scores.baseRateUsed),
        engineVersion: ENGINE_VERSION,
      });
    }
  }

  return { quarterlyEntries, yearlyEntries, mode: isPartial ? "merge" : "replace" };
};
