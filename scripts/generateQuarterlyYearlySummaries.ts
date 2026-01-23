/**
 * Quarterly + yearly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready summaries for historical review.
 */
import { writeSummaryArchive } from "./summaryArchive";
import { buildQuarterlySummary } from "../lib/quarterlySummary";
import { buildYearlySummary } from "../lib/yearlySummary";
import { evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";
import { resolveHistoricalDate } from "../lib/timeMachine";

const START_YEAR = 2010;
const END_YEAR = 2025;

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

type QuarterlySummaryArchiveEntry = {
  year: number;
  quarter: number;
  asOf: string;
  record_date: string;
  summary: ReturnType<typeof buildQuarterlySummary>;
};

type YearlySummaryArchiveEntry = {
  year: number;
  asOf: string;
  record_date: string;
  summary: ReturnType<typeof buildYearlySummary>;
};

const buildProvenance = (fetchedAt: string, now: Date) => {
  return {
    sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
    sourceUrl: seriesSourceUrls.tenYear,
    timestampLabel: formatTimestampValue(fetchedAt),
    ageLabel: formatAgeLabel(fetchedAt, now),
    statusLabel: "Historical (simulated)",
  };
};

const buildInputSourceUrls = (baseRateUsed: "1M" | "3M" | "MISSING") => {
  const baseRateSourceUrl =
    baseRateUsed === "3M" ? seriesSourceUrls.threeMonth : seriesSourceUrls.oneMonth;
  return {
    "base-rate": baseRateSourceUrl,
    "two-year": seriesSourceUrls.twoYear,
    "ten-year": seriesSourceUrls.tenYear,
    "curve-slope": seriesSourceUrls.tenYear,
  } as const;
};

const generateQuarterlyAndYearlySummaries = async () => {
  const quarterlyOutput: QuarterlySummaryArchiveEntry[] = [];
  const yearlyOutput: YearlySummaryArchiveEntry[] = [];
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

  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const month = quarter * 3;
      const asOf = resolveHistoricalDate(year, month);
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
      if (!isSameQuarterAndYear(recordDate, asOf)) {
        throw new Error(
          `Latest available yield curve data ${recordDate} does not fall within Q${quarter} ${year}.`
        );
      }

      const treasury = buildTreasurySnapshot(recordDate, fetchedAt, datasets);
      const assessment = evaluateRegime(treasury);
      const recordDateLabel = formatDateValue(treasury.record_date);
      const inputSourceUrls = buildInputSourceUrls(assessment.scores.baseRateUsed);
      const provenance = buildProvenance(treasury.fetched_at, now);
      const summary = buildQuarterlySummary({
        assessment,
        provenance,
        recordDateLabel,
        periodLabel: `Q${quarter} ${year}`,
      });
      const adjustedSummary = {
        ...summary,
        inputs: summary.inputs.map((input) => ({
          ...input,
          sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
          sourceUrl: inputSourceUrls[input.id],
        })),
      };

      quarterlyOutput.push({
        year,
        quarter,
        asOf,
        record_date: treasury.record_date,
        summary: adjustedSummary,
      });
    }

    const yearAsOf = resolveHistoricalDate(year, 12);
    const yearAsOfTime = Date.parse(`${yearAsOf}T00:00:00Z`);
    assertCoverageForAsOf(yearAsOf, yearAsOfTime, datasets);
    const yearRecordDate = findLatestCommonDate(
      yearAsOfTime,
      basePoints,
      requiredMaps,
      fallbackMaps
    );

    if (!yearRecordDate) {
      throw new Error(`No yield curve data found before ${yearAsOf}.`);
    }
    if (!isSameYear(yearRecordDate, yearAsOf)) {
      throw new Error(
        `Latest available yield curve data ${yearRecordDate} does not fall within ${year}.`
      );
    }

    const yearTreasury = buildTreasurySnapshot(yearRecordDate, fetchedAt, datasets);
    const yearAssessment = evaluateRegime(yearTreasury);
    const yearRecordDateLabel = formatDateValue(yearTreasury.record_date);
    const yearInputSourceUrls = buildInputSourceUrls(yearAssessment.scores.baseRateUsed);
    const yearProvenance = buildProvenance(yearTreasury.fetched_at, now);
    const yearSummary = buildYearlySummary({
      assessment: yearAssessment,
      provenance: yearProvenance,
      recordDateLabel: yearRecordDateLabel,
      periodLabel: `${year}`,
    });
    const yearAdjustedSummary = {
      ...yearSummary,
      inputs: yearSummary.inputs.map((input) => ({
        ...input,
        sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
        sourceUrl: yearInputSourceUrls[input.id],
      })),
    };

    yearlyOutput.push({
      year,
      asOf: yearAsOf,
      record_date: yearTreasury.record_date,
      summary: yearAdjustedSummary,
    });
  }

  await writeSummaryArchive({
    quarterlyEntries: quarterlyOutput,
    yearlyEntries: yearlyOutput,
  });
};

generateQuarterlyAndYearlySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
