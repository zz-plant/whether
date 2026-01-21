/**
 * Monthly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready monthly summaries for historical review.
 */
import { writeFile } from "node:fs/promises";
import { buildMonthlySummary, type MonthlySummary } from "../lib/monthlySummary";
import { evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";
import { resolveHistoricalDate } from "../lib/timeMachine";
import { writeSummaryArchive } from "./summaryArchive";

const START_YEAR = 2012;
const END_YEAR = 2025;
const OUTPUT_PATH = "data/monthly_summaries_2012_2025.json";

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

const isSameMonthAndYear = (value: string, asOf: string) => {
  const valueDate = new Date(`${value}T00:00:00Z`);
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  return (
    valueDate.getUTCFullYear() === asOfDate.getUTCFullYear() &&
    valueDate.getUTCMonth() === asOfDate.getUTCMonth()
  );
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

type MonthlySummaryArchiveEntry = {
  year: number;
  month: number;
  asOf: string;
  record_date: string;
  summary: MonthlySummary;
};

const generateMonthlySummaries = async () => {
  const output: MonthlySummaryArchiveEntry[] = [];
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
    for (let month = 1; month <= 12; month += 1) {
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
      if (!isSameMonthAndYear(recordDate, asOf)) {
        throw new Error(
          `Latest available yield curve data ${recordDate} does not fall within ${year}-${String(
            month
          ).padStart(2, "0")}.`
        );
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
      const summary = buildMonthlySummary({
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
        month,
        asOf,
        record_date: treasury.record_date,
        summary: adjustedSummary,
      });
    }
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await writeSummaryArchive({ monthlyEntries: output });
};

generateMonthlySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
