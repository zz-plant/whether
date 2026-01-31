/**
 * Weekly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready weekly summaries for historical review.
 */
import { buildWeeklySummary, type WeeklySummary } from "../lib/summary/weeklySummary";
import { evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";
import { writeSummaryArchive } from "./summaryArchive";
import { writeSummaryFile } from "./summaryFile";
import { resolveYearRange } from "./summaryRange";

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

const FRED_BASE_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=";
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
type SeriesPoint = { date: string; time: number; value: number | null };
type SeriesDataset = { points: SeriesPoint[]; map: Map<string, number> };

type WeekDescriptor = {
  year: number;
  week: number;
  asOf: string;
};

const parseSeries = (csv: string) => {
  const lines = csv.trim().split("\n");
  const points: SeriesPoint[] = [];

  for (const line of lines.slice(1)) {
    const [date, rawValue] = line.split(",");
    if (!date) {
      continue;
    }
    const value = rawValue === "." ? null : Number(rawValue);
    points.push({
      date,
      time: Date.parse(`${date}T00:00:00Z`),
      value: Number.isFinite(value) ? value : null,
    });
  }

  const map = new Map<string, number>();
  points.forEach((point) => {
    if (point.value !== null) {
      map.set(point.date, point.value);
    }
  });

  return { points, map };
};

const getLatestValidDate = (points: SeriesPoint[]) => {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].value !== null) {
      return points[index];
    }
  }
  return null;
};

const fetchSeries = async (seriesId: string) => {
  const response = await fetch(`${FRED_BASE_URL}${seriesId}`);
  if (!response.ok) {
    throw new Error(`FRED series fetch failed for ${seriesId}: ${response.status}`);
  }
  const csv = await response.text();
  return parseSeries(csv);
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
    if (!latest || latest.time < asOfTime) {
      throw new Error(
        `FRED coverage for ${series.label} ends on ${latest?.date ?? "unknown"}, which is before ${asOf}.`
      );
    }
  }

  const fallbackLatest = fallbackCoverage
    .map((series) => getLatestValidDate(datasets[series.key].points))
    .filter((point): point is SeriesPoint => Boolean(point))
    .sort((a, b) => b.time - a.time)[0];

  if (!fallbackLatest || fallbackLatest.time < asOfTime) {
    throw new Error(
      `FRED coverage for DGS1MO/DGS3MO ends on ${fallbackLatest?.date ?? "unknown"}, which is before ${asOf}.`
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
  const basePoints = datasets.tenYear.points;
  const requiredMaps = [datasets.twoYear, datasets.tenYear];
  const fallbackMaps = [datasets.oneMonth, datasets.threeMonth];

  const latestRequired = [
    getLatestValidDate(datasets.twoYear.points),
    getLatestValidDate(datasets.tenYear.points),
  ]
    .filter((point): point is SeriesPoint => Boolean(point))
    .map((point) => point.time)
    .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
  const latestFallback = [
    getLatestValidDate(datasets.oneMonth.points),
    getLatestValidDate(datasets.threeMonth.points),
  ]
    .filter((point): point is SeriesPoint => Boolean(point))
    .map((point) => point.time)
    .reduce((max, value) => Math.max(max, value), 0);
  const effectiveEndTime = Math.min(latestRequired, latestFallback);
  const effectiveEndDate = new Date(effectiveEndTime);
  const effectiveEndYear = effectiveEndDate.getUTCFullYear();

  const { startYear, endYear, isPartial } = resolveYearRange({
    defaultStartYear: START_YEAR,
    defaultEndYear: Math.min(END_YEAR, effectiveEndYear),
    minYear: START_YEAR,
    maxYear: effectiveEndYear,
  });
  const endDateOverride =
    endYear === effectiveEndYear
      ? effectiveEndDate
      : new Date(Date.UTC(endYear, 11, 31));
  const weeks = buildWeekDescriptors(startYear, endYear, endDateOverride);

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
    const assessment = evaluateRegime(treasury);
    const recordDateLabel = formatDateValue(treasury.record_date);
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

  const mode = isPartial ? "merge" : "replace";
  await writeSummaryFile({
    path: OUTPUT_PATH(effectiveEndYear),
    entries: output,
    mode,
    getKey: (entry) => `${entry.year}-${entry.week}`,
  });
  await writeSummaryArchive({ weeklyEntries: output, mode });
};

generateWeeklySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
