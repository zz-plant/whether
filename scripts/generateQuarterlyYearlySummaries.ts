/**
 * Quarterly + yearly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready summaries for historical review.
 */
import { writeSummaryArchive } from "./summaryArchive";
import { buildQuarterlySummary } from "../lib/summary/quarterlySummary";
import { buildYearlySummary } from "../lib/summary/yearlySummary";
import { evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";
import type { RegimeMachineSnapshot } from "../lib/report/regimeStateMachine";
import { resolveHistoricalDate } from "../lib/timeMachine/timeMachine";
import { resolveYearRange } from "./summaryRange";
import {
  fetchSeries,
  getLatestValidDate,
  resolveBaseRateWindow,
  resolveVixReading,
  type SeriesDataset,
  type SeriesPoint,
} from "./regimeArchiveContext";

const START_YEAR = 2010;

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
    .filter((point) => point !== null)
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

const buildInputSourceUrls = (baseRateUsed: "FED" | "1M" | "3M" | "MISSING") => {
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
  /**
   * One threaded walk across quarters and years: machine state carries forward
   * so flips confirm through the gate, and each period supplies its trailing
   * base-rate window and VIX reading. A partial run (`HISTORY_START_YEAR`)
   * still walks from the first year and only filters which records it writes,
   * so a merge lands with the same confirmations a full replay produces.
   */
  let machineState: RegimeMachineSnapshot | null = null;
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
  const effectiveEndYear = new Date(effectiveEndTime).getUTCFullYear();
  const { startYear, endYear, isPartial } = resolveYearRange({
    defaultStartYear: START_YEAR,
    defaultEndYear: effectiveEndYear,
    minYear: START_YEAR,
    maxYear: effectiveEndYear,
  });

  for (let year = START_YEAR; year <= endYear; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const month = quarter * 3;
      const asOf = resolveHistoricalDate(year, month);
      const asOfTime = Date.parse(`${asOf}T00:00:00Z`);
      if (asOfTime > effectiveEndTime) {
        break;
      }
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
      const vixReading = resolveVixReading(vixDataset, recordDate, asOfTime, fetchedAt);
      const assessment = evaluateRegime(
        treasury,
        undefined,
        vixReading ? [vixReading] : [],
        machineState,
        { baseRateHistory: resolveBaseRateWindow(datasets.oneMonth, recordDate, asOfTime) },
      );
      machineState = assessment.regimeTransition?.snapshot ?? machineState;
      if (year < startYear) {
        continue;
      }
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
    if (yearAsOfTime > effectiveEndTime) {
      continue;
    }
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
    const yearVixReading = resolveVixReading(vixDataset, yearRecordDate, yearAsOfTime, fetchedAt);
    const yearAssessment = evaluateRegime(
      yearTreasury,
      undefined,
      yearVixReading ? [yearVixReading] : [],
      machineState,
      { baseRateHistory: resolveBaseRateWindow(datasets.oneMonth, yearRecordDate, yearAsOfTime) },
    );
    machineState = yearAssessment.regimeTransition?.snapshot ?? machineState;
    if (year < startYear) {
      continue;
    }
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
    mode: isPartial ? "merge" : "replace",
  });
};

generateQuarterlyAndYearlySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
