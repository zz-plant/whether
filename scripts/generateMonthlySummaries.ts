/**
 * Monthly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready monthly summaries for historical review.
 */
import { buildMonthlySummary, type MonthlySummary } from "../lib/summary/monthlySummary";
import { evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";
import type { RegimeMachineSnapshot } from "../lib/report/regimeStateMachine";
import { resolveHistoricalDate } from "../lib/timeMachine/timeMachine";
import { readFile, writeFile } from "node:fs/promises";
import { writeSummaryArchive } from "./summaryArchive";
import { writeSummaryFile } from "./summaryFile";
import { resolveYearRange } from "./summaryRange";
import { refreshDerivedSummaryHistory } from "./refreshDerivedSummaryHistory";
import {
  resolveBaseRateVelocityWindow,
  fetchSeries,
  getLatestValidDate,
  resolveBaseRateWindow,
  resolveVixReading,
  type SeriesDataset,
  type SeriesPoint,
} from "./regimeArchiveContext";

const DEFAULT_START_YEAR = 2012;
const OUTPUT_PATH = "data/monthly_summaries_2012_2025.json";
const TIME_MACHINE_CACHE_PATH = "data/time_machine_cache.json";

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

type MonthlySummaryArchiveEntry = {
  year: number;
  month: number;
  asOf: string;
  record_date: string;
  summary: MonthlySummary;
  tightness: number;
  riskAppetite: number;
};

type TimeMachineCacheEntry = TreasuryData & {
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
  baseRateVelocityWindow?: {
    compareDate: string;
    compareValue: number;
    latestDate: string;
    latestValue: number;
  } | null;
};

const writeJson = async (filePath: string, value: unknown) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const readTimeMachineCacheEntries = async (): Promise<TimeMachineCacheEntry[]> => {
  try {
    const raw = await readFile(TIME_MACHINE_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as TimeMachineCacheEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const resolvedError = error as NodeJS.ErrnoException;
    if (resolvedError.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const writeTimeMachineCache = async ({
  entries,
  mode,
}: {
  entries: TimeMachineCacheEntry[];
  mode: "replace" | "merge";
}) => {
  const nextEntries = mode === "merge"
    ? (() => {
        const merged = new Map<string, TimeMachineCacheEntry>();
        return readTimeMachineCacheEntries().then((existing) => {
          existing.forEach((entry) => merged.set(`${entry.year}-${entry.month}`, entry));
          entries.forEach((entry) => merged.set(`${entry.year}-${entry.month}`, entry));
          return Array.from(merged.values());
        });
      })()
    : Promise.resolve(entries);

  const sorted = (await nextEntries).sort(
    (left, right) => new Date(left.record_date).getTime() - new Date(right.record_date).getTime(),
  );
  await writeJson(TIME_MACHINE_CACHE_PATH, sorted);
};

const generateMonthlySummaries = async () => {
  const output: MonthlySummaryArchiveEntry[] = [];
  const timeMachineEntries: TimeMachineCacheEntry[] = [];
  const now = new Date();
  const fetchedAt = now.toISOString();
  const datasets = {
    oneMonth: await fetchSeries(seriesCatalog.oneMonth),
    threeMonth: await fetchSeries(seriesCatalog.threeMonth),
    twoYear: await fetchSeries(seriesCatalog.twoYear),
    tenYear: await fetchSeries(seriesCatalog.tenYear),
  };
  // Volatility drives the shock haircut and the market-stress veto, so the
  // replay needs the period's reading, not just the curve. Fetched separately
  // because it is not a yield: unavailable means the replay proceeds without
  // it, with a warning, never a crash.
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
  const effectiveEndYear = new Date(effectiveEndTime).getUTCFullYear();

  const { startYear, endYear, isPartial } = resolveYearRange({
    defaultStartYear: DEFAULT_START_YEAR,
    defaultEndYear: effectiveEndYear,
    minYear: DEFAULT_START_YEAR,
    maxYear: effectiveEndYear,
  });

  /**
   * The replay is one threaded walk, not independent point reads. The machine
   * snapshot carries forward so flips confirm through the gate (or commit as
   * marked shocks), each month supplies its trailing base-rate window for the
   * tightening-speed term, and each month supplies its VIX reading. Point
   * evaluation here is what produced the old record's 22 instant-commit flips.
   *
   * A partial run (`HISTORY_START_YEAR`, which `time-machine:update-summaries`
   * sets to 2024 by default) still walks from the first year and only filters
   * which records it writes. Starting the walk at the requested year began it
   * with no machine state, so the first selected month instant-committed its
   * quadrant and later confirmations could differ from the full replay the
   * merge target was built from.
   */
  let machineState: RegimeMachineSnapshot | null = null;

  for (let year = DEFAULT_START_YEAR; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const asOf = resolveHistoricalDate(year, month);
      const asOfTime = Date.parse(`${asOf}T00:00:00Z`);
      if (year === effectiveEndYear && asOfTime > effectiveEndTime) {
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
      if (!isSameMonthAndYear(recordDate, asOf)) {
        throw new Error(
          `Latest available yield curve data ${recordDate} does not fall within ${year}-${String(
            month
          ).padStart(2, "0")}.`
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
      timeMachineEntries.push({
        year,
        month,
        vix: vixReading?.value ?? null,
        vixHistory: vixReading?.history ?? null,
        baseRateVelocityWindow: resolveBaseRateVelocityWindow(datasets.oneMonth, asOfTime),
        ...treasury,
      });
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
        tightness: assessment.scores.tightness,
        riskAppetite: assessment.scores.riskAppetite,
      });
    }
  }

  const mode = isPartial ? "merge" : "replace";
  await writeSummaryFile({
    path: OUTPUT_PATH,
    entries: output,
    mode,
    getKey: (entry) => `${entry.year}-${entry.month}`,
  });
  await writeSummaryArchive({ monthlyEntries: output, mode });
  await writeTimeMachineCache({ entries: timeMachineEntries, mode });
  await refreshDerivedSummaryHistory();
};

generateMonthlySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
