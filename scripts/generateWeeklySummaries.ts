/**
 * Weekly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready weekly summaries for historical review.
 */
import { buildWeeklySummary, type WeeklySummary } from "../lib/summary/weeklySummary";
import { evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";
import type { RegimeMachineSnapshot } from "../lib/report/regimeStateMachine";
import { writeSummaryArchive } from "./summaryArchive";
import { writeSummaryFile } from "./summaryFile";
import { resolveYearRange } from "./summaryRange";
import { refreshDerivedSummaryHistory } from "./refreshDerivedSummaryHistory";
import {
  fetchSeries,
  getLatestValidDate,
  resolveBaseRateWindow,
  resolveVixReading,
  type SeriesDataset,
  type SeriesPoint,
} from "./regimeArchiveContext";

const START_YEAR = 2018;
const END_YEAR = new Date().getUTCFullYear();
const OUTPUT_PATH = (endYear: number) =>
  `data/weekly_summaries_${START_YEAR}_${endYear}.json`;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatDateValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatTimestampValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : timestampFormatter.format(date);
};

const formatAgeLabel = (value: string, now: Date) => {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) {
    return "—";
  }
  const hours = Math.max(0, Math.round((now.getTime() - timestamp.getTime()) / 36e5));
  return `${hours}h.`;
};

const FRED_SERIES_URL = "https://fred.stlouisfed.org/series/";

const seriesCatalog = {
  oneMonth: "DGS1MO",
  threeMonth: "DGS3MO",
  twoYear: "DGS2",
  tenYear: "DGS10",
} as const;

const seriesSourceUrls = {
  oneMonth: `${FRED_SERIES_URL}${seriesCatalog.oneMonth}`,
  threeMonth: `${FRED_SERIES_URL}${seriesCatalog.threeMonth}`,
  twoYear: `${FRED_SERIES_URL}${seriesCatalog.twoYear}`,
  tenYear: `${FRED_SERIES_URL}${seriesCatalog.tenYear}`,
} as const;

type SeriesKey = keyof typeof seriesCatalog;

type WeekDescriptor = {
  year: number;
  week: number;
  asOf: string;
};

const MS_PER_DAY = 86400000;
const MAX_WEEKLY_DATA_LAG_DAYS = 7;
const HISTORY_WEEKS_ENV = "HISTORY_WEEKS";

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

const assertCoverageForAsOf = (
  asOf: string,
  asOfTime: number,
  datasets: Record<SeriesKey, SeriesDataset>
) => {
  const requiredCoverage = [
    { key: "twoYear" as const, label: "DGS2" },
    { key: "tenYear" as const, label: "DGS10" },
  ];
  const fallbackCoverage = [
    { key: "oneMonth" as const, label: "DGS1MO" },
    { key: "threeMonth" as const, label: "DGS3MO" },
  ];

  for (const series of requiredCoverage) {
    const latest = getLatestValidDate(datasets[series.key].points);
    if (
      !latest ||
      (latest.time < asOfTime &&
        asOfTime - latest.time >= MAX_WEEKLY_DATA_LAG_DAYS * MS_PER_DAY)
    ) {
      throw new Error(
        `FRED coverage for ${series.label} does not include the week ending ${asOf}; latest value is ${latest?.date ?? "unknown"}.`
      );
    }
  }

  const fallbackLatest = fallbackCoverage
    .map((series) => getLatestValidDate(datasets[series.key].points))
    .filter((point) => point !== null)
    .sort((a, b) => b.time - a.time)[0];

  if (
    !fallbackLatest ||
    (fallbackLatest.time < asOfTime &&
      asOfTime - fallbackLatest.time >= MAX_WEEKLY_DATA_LAG_DAYS * MS_PER_DAY)
  ) {
    throw new Error(
      `FRED coverage for DGS1MO/DGS3MO does not include the week ending ${asOf}; latest value is ${fallbackLatest?.date ?? "unknown"}.`
    );
  }
};

const findLatestCommonDate = (
  asOfTime: number,
  basePoints: SeriesPoint[],
  requiredMaps: SeriesDataset[],
  fallbackMaps: SeriesDataset[]
) => {
  for (let index = basePoints.length - 1; index >= 0; index -= 1) {
    const candidate = basePoints[index];
    if (candidate.time > asOfTime) {
      continue;
    }
    const hasRequired = requiredMaps.every((series) => series.map.has(candidate.date));
    const hasFallback = fallbackMaps.some((series) => series.map.has(candidate.date));
    if (hasRequired && hasFallback) {
      return candidate.date;
    }
  }
  return null;
};

const buildTreasurySnapshot = (
  recordDate: string,
  fetched_at: string,
  datasets: Record<SeriesKey, SeriesDataset>
): TreasuryData => {
  return {
    source: seriesSourceUrls.oneMonth,
    record_date: recordDate,
    fetched_at,
    isLive: false,
    yields: {
      oneMonth: datasets.oneMonth.map.get(recordDate) ?? null,
      threeMonth: datasets.threeMonth.map.get(recordDate) ?? null,
      twoYear: datasets.twoYear.map.get(recordDate) ?? null,
      tenYear: datasets.tenYear.map.get(recordDate) ?? null,
    },
  };
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
): WeekDescriptor[] => {
  const startDate = new Date(Date.UTC(startYear, 0, 1));
  const endDate = endDateOverride ?? new Date(Date.UTC(endYear, 11, 31));
  const weeks: WeekDescriptor[] = [];
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

type WeeklySummaryArchiveEntry = {
  year: number;
  week: number;
  asOf: string;
  record_date: string;
  summary: WeeklySummary;
};

const generateWeeklySummaries = async () => {
  const output: WeeklySummaryArchiveEntry[] = [];
  const now = new Date();
  const fetchedAt = now.toISOString();
  const datasets = {
    oneMonth: await fetchSeries(seriesCatalog.oneMonth),
    threeMonth: await fetchSeries(seriesCatalog.threeMonth),
    twoYear: await fetchSeries(seriesCatalog.twoYear),
    tenYear: await fetchSeries(seriesCatalog.tenYear),
  };
  // Volatility drives the shock haircut and the market-stress veto; unavailable
  // means the replay proceeds without it, with a warning, never a crash.
  let vixDataset: SeriesDataset | null = null;
  try {
    vixDataset = await fetchSeries("VIXCLS");
  } catch (error) {
    console.warn(
      `VIX series unavailable (${error instanceof Error ? error.message : String(error)}); replaying without the market-stress adjustments.`,
    );
  }
  const basePoints = datasets.tenYear.points;
  const requiredMaps = [datasets.twoYear, datasets.tenYear];
  const fallbackMaps = [datasets.oneMonth, datasets.threeMonth];

  const latestRequired = [
    getLatestValidDate(datasets.twoYear.points),
    getLatestValidDate(datasets.tenYear.points),
  ]
    .filter((point) => point !== null)
    .map((point) => point.time)
    .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
  const latestFallback = [
    getLatestValidDate(datasets.oneMonth.points),
    getLatestValidDate(datasets.threeMonth.points),
  ]
    .filter((point) => point !== null)
    .map((point) => point.time)
    .reduce((max, value) => Math.max(max, value), 0);
  const effectiveEndTime = Math.min(latestRequired, latestFallback);
  const effectiveEndDate = new Date(effectiveEndTime);
  const effectiveEndYear = effectiveEndDate.getUTCFullYear();
  const latestCompletedWeekEnd = getLatestCompletedWeekEnd(effectiveEndDate, now);

  const { startYear, endYear, isPartial } = resolveYearRange({
    defaultStartYear: START_YEAR,
    defaultEndYear: Math.min(END_YEAR, effectiveEndYear),
    minYear: START_YEAR,
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

  /**
   * The replay is one threaded walk over every week, not independent point
   * reads of the scoped window: machine state carries forward (flips confirm
   * through the gate, shocks commit and get marked), each week supplies its
   * trailing base-rate window for the tightening-speed term, and each week
   * supplies its VIX reading for the haircut and the market-stress veto. A
   * partial `HISTORY_WEEKS` run still threads from the start so a merge lands
   * with the same confirmations a full replay would have produced.
   */
  let machineState: RegimeMachineSnapshot | null = null;

  for (const { year, week, asOf } of weeks) {
    const asOfTime = Date.parse(`${asOf}T00:00:00Z`);
    assertCoverageForAsOf(asOf, asOfTime, datasets);
    const recordDate = findLatestCommonDate(
      asOfTime,
      basePoints,
      requiredMaps,
      fallbackMaps
    );

    if (!recordDate) {
      throw new Error(`No yield curve data found before ${asOf}.`);
    }

    const treasury = buildTreasurySnapshot(recordDate, fetchedAt, datasets);
    const vixReading = resolveVixReading(vixDataset, recordDate, asOfTime, fetchedAt);
    const assessment = evaluateRegime(
      treasury,
      undefined,
      vixReading ? [vixReading] : [],
      machineState,
      { baseRateHistory: resolveBaseRateWindow(datasets.oneMonth, recordDate, asOfTime) },
    );
    machineState = assessment.regimeTransition?.snapshot ?? machineState;
    if (!scopedAsOfs.has(asOf)) {
      continue;
    }
    // Weekly artifacts should display the week-ending label even when the
    // underlying Treasury series falls back to the latest common prior day.
    const recordDateLabel = formatDateValue(asOf);
    const baseRateSourceUrl =
      assessment.scores.baseRateUsed === "3M"
        ? seriesSourceUrls.threeMonth
        : seriesSourceUrls.oneMonth;
    const inputSourceUrls = {
      "base-rate": baseRateSourceUrl,
      "two-year": seriesSourceUrls.twoYear,
      "ten-year": seriesSourceUrls.tenYear,
      "curve-slope": seriesSourceUrls.tenYear,
    } as const;
    const provenance = {
      sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
      sourceUrl: seriesSourceUrls.tenYear,
      timestampLabel: formatTimestampValue(treasury.fetched_at),
      ageLabel: formatAgeLabel(treasury.fetched_at, now),
      statusLabel: "Historical (simulated)",
    };
    const summary = buildWeeklySummary({
      assessment,
      provenance,
      recordDateLabel,
    });
    const adjustedSummary = {
      ...summary,
      inputs: summary.inputs.map((input) => ({
        ...input,
        sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
        sourceUrl: inputSourceUrls[input.id],
      })),
    };

    output.push({
      year,
      week,
      asOf,
      record_date: treasury.record_date,
      summary: adjustedSummary,
    });
  }

  const mode = isPartial || historyWeeksLimit !== null ? "merge" : "replace";
  await writeSummaryFile({
    path: OUTPUT_PATH(effectiveEndYear),
    entries: output,
    mode,
    getKey: (entry) => `${entry.year}-${entry.week}`,
  });
  await writeSummaryArchive({ weeklyEntries: output, mode });
  await refreshDerivedSummaryHistory();
};

generateWeeklySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
