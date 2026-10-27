/**
 * Shared evaluation context for the archive generators.
 *
 * The generators walk history sequentially, so they can supply what a
 * point-in-time `evaluateRegime` call cannot: the machine snapshot threaded
 * forward (flips confirm through the gate), the trailing base-rate window the
 * tightening-speed term reads, the period's VIX reading that drives the
 * shock haircut and the market-stress veto, and the Chicago Fed financial
 * conditions index (the record basis's two market inputs,
 * `RECORD_BASIS_MARKET_INPUTS`). Each generator fetches the series once per run
 * and slices per period here.
 *
 * Everything the three generators shared lives here once: the series fetch,
 * the coverage check, the record-date search, the Treasury snapshot, the
 * provenance labels and the period replay. They each carried a copy of all of
 * it until 2026-10-06.
 */
import { execFileSync } from "node:child_process";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import { FRED_BASE_URL, isMissingFredValue } from "../lib/fred";
import { resolveBaseRateVelocityPair, type RegimeAssessment } from "../lib/regimeEngine";
import { buildReplayChicagoFciReading, buildReplayVixReading, replayRegimeWalk } from "../lib/timeMachine/regimeReplay";

export type SeriesPoint = { date: string; time: number; value: number | null };
export type SeriesDataset = { points: SeriesPoint[]; map: Map<string, number> };

export const MS_PER_DAY = 86400000;

const VIX_LOOKBACK_DAYS = 130;

/**
 * Parse a FRED CSV export into the dataset shape the generators slice.
 *
 * A missing observation stays in `points` as a null, so the calendar is intact
 * for date arithmetic, and stays out of `map`. The export marks a missing value
 * with an empty field today and marked it "." before; both are absences
 * (`isMissingFredValue`), never a print of 0. The three generators each carried
 * a copy of this parser that guarded only against ".", so every market holiday
 * in the window read as a 0 yield or a 0 VIX close — seven month-end records
 * published with tightness 0 as a result.
 */
export const parseSeries = (csv: string): SeriesDataset => {
  const lines = csv.trim().split(/\r?\n/);
  const points: SeriesPoint[] = [];

  for (const line of lines.slice(1)) {
    const [date, rawValue] = line.split(",");
    if (!date) {
      continue;
    }
    const value = isMissingFredValue(rawValue) ? null : Number(rawValue);
    points.push({
      date,
      time: Date.parse(`${date}T00:00:00Z`),
      value: Number.isFinite(value) ? value : null,
    });
  }

  const map = new Map<string, number>();
  for (const point of points) {
    if (point.value !== null) {
      map.set(point.date, point.value);
    }
  }

  return { points, map };
};

/** The last point that carries a value — a holiday placeholder is skipped —
 *  or null when nothing in the range does. */
export const getLatestValidDate = (points: SeriesPoint[]): (SeriesPoint & { value: number }) | null => {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    const { value } = point;
    if (value !== null) {
      return { ...point, value };
    }
  }
  return null;
};

/**
 * Fetch one FRED series in full through the CSV export: `fetch()` first, and
 * when that fails for any reason, `curl` — which has succeeded where Bun's
 * fetch has not on some networks — with one warning naming the failure.
 */
export const fetchSeries = async (seriesId: string): Promise<SeriesDataset> => {
  const sourceUrl = `${FRED_BASE_URL}?id=${seriesId}`;

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`FRED series fetch failed for ${seriesId}: ${response.status}`);
    }
    return parseSeries(await response.text());
  } catch (error) {
    const csv = execFileSync("curl", ["-fsSL", sourceUrl], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (error instanceof Error) {
      console.warn(`fetch() failed for ${seriesId}; retried with curl fallback (${error.message}).`);
    }
    return parseSeries(csv);
  }
};

/** Trailing base-rate window for the velocity term: every observation at or
 *  before the record date inside the lookback, ascending. */
export const resolveBaseRateWindow = (
  dataset: SeriesDataset,
  recordDate: string,
  asOfTime: number,
): { date: string; value: number | null }[] => {
  const cutoffMs = asOfTime - VIX_LOOKBACK_DAYS * MS_PER_DAY;
  return dataset.points
    .filter((point) => point.time <= asOfTime && point.time >= cutoffMs)
    .map((point) => ({ date: point.date, value: point.value }));
};

export type BaseRateVelocityWindow = {
  compareDate: string;
  compareValue: number;
  latestDate: string;
  latestValue: number;
};

/**
 * The two observations the tightening-speed term resolves its delta from: the
 * latest base-rate print at or before the period, and the one its gap to the
 * lookback window favors. The daily series is too heavy to store per cache
 * entry, so the runtime replay carries this pair instead and evaluates the
 * same delta the archive generators compute from the full window. The search
 * is the engine's own (`resolveBaseRateVelocityPair`) over the same window the
 * generators score with, so the pair cannot pick a different observation than
 * the score did.
 */
export const resolveBaseRateVelocityWindow = (
  dataset: SeriesDataset,
  asOfTime: number,
): BaseRateVelocityWindow | null => {
  const pair = resolveBaseRateVelocityPair(resolveBaseRateWindow(dataset, "", asOfTime));
  return pair
    ? {
        compareDate: pair.compare.date,
        compareValue: pair.compare.value,
        latestDate: pair.latest.date,
        latestValue: pair.latest.value,
      }
    : null;
};

export type VixReading = MacroSeriesReading;

/*
 * The Chicago Fed index is weekly: each observation is dated the Friday its week
 * ends and published the following Wednesday, so on a given day the newest value
 * a reader could have seen is dated at least five days back. A period takes the
 * last observation dated five or more days before it, as the live read would have
 * had it, not the one published after the period closed. Twenty-one days past
 * that is three missed releases, and then the period has no reading. The stored
 * history is every observation a reader had in the 60 days before, so a weekly
 * replay can rebuild the series from the month-end entries alone.
 */
const CHICAGO_FCI_PUBLICATION_LAG_DAYS = 5;
const CHICAGO_FCI_STALE_AFTER_DAYS = 21;
const CHICAGO_FCI_HISTORY_DAYS = 60;

/**
 * The period's Chicago Fed financial conditions reading, or null when the
 * series has no observation a reader would have had. A holiday or a revision
 * gap sits in the series as a null placeholder (`isMissingFredValue`) and is
 * skipped, never read as a zero.
 */
export const resolveChicagoFciReading = (
  dataset: SeriesDataset,
  asOfTime: number,
  fetchedAt: string,
): MacroSeriesReading | null => {
  const publishedBy = asOfTime - CHICAGO_FCI_PUBLICATION_LAG_DAYS * MS_PER_DAY;
  const latest = getLatestValidDate(dataset.points.filter((point) => point.time <= publishedBy));
  if (!latest || publishedBy - latest.time > CHICAGO_FCI_STALE_AFTER_DAYS * MS_PER_DAY) {
    return null;
  }
  const history = dataset.points
    .filter((point) => point.time <= publishedBy && point.time >= publishedBy - CHICAGO_FCI_HISTORY_DAYS * MS_PER_DAY)
    .map((point) => ({ date: point.date, value: point.value }));
  return buildReplayChicagoFciReading({ value: latest.value, recordDate: latest.date, fetchedAt, history });
};

/**
 * The period's VIX reading, or null when the series could not be fetched or has
 * no observation for the period. Null is the honest absence: the engine then
 * evaluates without the haircut and veto, the same as before they existed.
 */
export const resolveVixReading = (
  dataset: SeriesDataset | null,
  recordDate: string,
  asOfTime: number,
  fetchedAt: string,
): VixReading | null => {
  if (!dataset) {
    return null;
  }
  const atOrBefore = dataset.points.filter((point) => point.time <= asOfTime);
  // A holiday sits in the series as a null placeholder. The period's reading
  // is the last close, not the placeholder; the staleness rule below still
  // refuses one from more than a week back.
  const latest = getLatestValidDate(atOrBefore);
  if (!latest) {
    return null;
  }
  // Stale beyond a week is an absence, not a reading — a monthly archive
  // period must not inherit a volatility print from the previous month.
  if (asOfTime - latest.time > 7 * MS_PER_DAY) {
    return null;
  }
  const history = atOrBefore
    .filter((point) => point.time >= asOfTime - VIX_LOOKBACK_DAYS * MS_PER_DAY)
    .map((point) => ({ date: point.date, value: point.value }));

  return buildReplayVixReading({ value: latest.value, recordDate: latest.date, fetchedAt, history });
};

const SERIES_CATALOG = {
  oneMonth: "DGS1MO",
  threeMonth: "DGS3MO",
  twoYear: "DGS2",
  tenYear: "DGS10",
} as const;

const FRED_SERIES_URL = "https://fred.stlouisfed.org/series/";

const SERIES_SOURCE_URLS = {
  oneMonth: `${FRED_SERIES_URL}${SERIES_CATALOG.oneMonth}`,
  threeMonth: `${FRED_SERIES_URL}${SERIES_CATALOG.threeMonth}`,
  twoYear: `${FRED_SERIES_URL}${SERIES_CATALOG.twoYear}`,
  tenYear: `${FRED_SERIES_URL}${SERIES_CATALOG.tenYear}`,
} as const;

/** The four Treasury series every archive period reads, keyed by yield. */
export type TreasuryDatasets = Record<keyof typeof SERIES_CATALOG, SeriesDataset>;

/**
 * Fetch the four Treasury series, VIX and the Chicago Fed index for one run.
 * Volatility drives the shock haircut and the market-stress veto, so the replay
 * needs it, but it is not a yield: unavailable means the replay proceeds
 * without it, with a warning, never a crash. The Chicago Fed index has no such
 * allowance: it is on the record basis since engine-2026-10-09b, and an archive
 * written without it would be scored on a different basis from the live call,
 * so a failed fetch fails the run before anything is written.
 */
export const fetchArchiveDatasets = async (): Promise<{
  datasets: TreasuryDatasets;
  vixDataset: SeriesDataset | null;
  chicagoFciDataset: SeriesDataset;
}> => {
  const datasets = {
    oneMonth: await fetchSeries(SERIES_CATALOG.oneMonth),
    threeMonth: await fetchSeries(SERIES_CATALOG.threeMonth),
    twoYear: await fetchSeries(SERIES_CATALOG.twoYear),
    tenYear: await fetchSeries(SERIES_CATALOG.tenYear),
  };
  let vixDataset: SeriesDataset | null = null;
  try {
    vixDataset = await fetchSeries("VIXCLS");
  } catch (error) {
    console.warn(
      `VIX series unavailable (${error instanceof Error ? error.message : String(error)}); replaying without the market-stress adjustments.`,
    );
  }
  const chicagoFciDataset = await fetchSeries("NFCI");
  return { datasets, vixDataset, chicagoFciDataset };
};

/**
 * The last day every period can be scored on: the earlier of the 2Y/10Y
 * series' last print and the later of the two bill series' last print.
 */
export const resolveEffectiveEndTime = (datasets: TreasuryDatasets): number => {
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
  return Math.min(latestRequired, latestFallback);
};

const MAX_WEEKLY_DATA_LAG_DAYS = 7;

/**
 * How far behind a period the series may end. A month, quarter or year must be
 * covered through its last day; a week tolerates a series that ends up to a
 * week before its Friday, since the week is labelled by its end even when the
 * data stops a day or two short.
 */
type CoverageRule = "period-end" | "week-lag";

const assertCoverageForAsOf = (
  asOf: string,
  asOfTime: number,
  datasets: TreasuryDatasets,
  rule: CoverageRule,
) => {
  const requiredCoverage = [
    { key: "twoYear" as const, label: "DGS2" },
    { key: "tenYear" as const, label: "DGS10" },
  ];
  const fallbackCoverage = [
    { key: "oneMonth" as const, label: "DGS1MO" },
    { key: "threeMonth" as const, label: "DGS3MO" },
  ];
  const isShort = (latest: SeriesPoint | null) =>
    !latest ||
    (latest.time < asOfTime &&
      (rule === "period-end" || asOfTime - latest.time >= MAX_WEEKLY_DATA_LAG_DAYS * MS_PER_DAY));
  const describeShortfall = (label: string, latest: SeriesPoint | null) =>
    rule === "period-end"
      ? `FRED coverage for ${label} ends on ${latest?.date ?? "unknown"}, which is before ${asOf}.`
      : `FRED coverage for ${label} does not include the week ending ${asOf}; latest value is ${latest?.date ?? "unknown"}.`;

  for (const series of requiredCoverage) {
    const latest = getLatestValidDate(datasets[series.key].points);
    if (isShort(latest)) {
      throw new Error(describeShortfall(series.label, latest));
    }
  }

  const fallbackLatest = fallbackCoverage
    .map((series) => getLatestValidDate(datasets[series.key].points))
    .filter((point) => point !== null)
    .sort((a, b) => b.time - a.time)[0];

  if (isShort(fallbackLatest ?? null)) {
    throw new Error(describeShortfall("DGS1MO/DGS3MO", fallbackLatest ?? null));
  }
};

/** The latest date at or before the period that carries both long yields and at least one bill. */
const findLatestCommonDate = (asOfTime: number, datasets: TreasuryDatasets) => {
  const basePoints = datasets.tenYear.points;
  const requiredMaps = [datasets.twoYear, datasets.tenYear];
  const fallbackMaps = [datasets.oneMonth, datasets.threeMonth];
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
  datasets: TreasuryDatasets,
): TreasuryData => {
  return {
    source: SERIES_SOURCE_URLS.oneMonth,
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

/** One period of an archive replay, after its inputs were resolved and scored. */
export type ArchivePeriodReading<Period> = {
  period: Period;
  asOfTime: number;
  treasury: TreasuryData;
  vixReading: MacroSeriesReading | null;
  chicagoFciReading: MacroSeriesReading | null;
  assessment: RegimeAssessment;
};

/**
 * Resolve every period's inputs from the fetched series and score them as one
 * threaded walk (`replayRegimeWalk`, the walk the runtime replays too).
 *
 * A period that cannot be scored throws before anything is written: the series
 * must cover it (`coverage`), a common record date must exist at or before it,
 * and `checkRecordDate` may refuse one that falls outside the period. Callers
 * walk from the first period even when they write a later range, so a partial
 * run lands with the confirmations a full replay would have produced.
 */
export const replayArchivePeriods = <Period extends { asOf: string }>({
  periods,
  datasets,
  vixDataset,
  chicagoFciDataset,
  fetchedAt,
  coverage,
  checkRecordDate,
}: {
  periods: readonly Period[];
  datasets: TreasuryDatasets;
  vixDataset: SeriesDataset | null;
  chicagoFciDataset: SeriesDataset;
  fetchedAt: string;
  coverage: CoverageRule;
  /** Return an error message when the record date does not belong to the period. */
  checkRecordDate?: (period: Period, recordDate: string) => string | null;
}): ArchivePeriodReading<Period>[] => {
  const steps = periods.map((period) => {
    const { asOf } = period;
    const asOfTime = Date.parse(`${asOf}T00:00:00Z`);
    assertCoverageForAsOf(asOf, asOfTime, datasets, coverage);
    const recordDate = findLatestCommonDate(asOfTime, datasets);
    if (!recordDate) {
      throw new Error(`No yield curve data found before ${asOf}.`);
    }
    const refusal = checkRecordDate?.(period, recordDate) ?? null;
    if (refusal) {
      throw new Error(refusal);
    }
    const treasury = buildTreasurySnapshot(recordDate, fetchedAt, datasets);
    const vixReading = resolveVixReading(vixDataset, recordDate, asOfTime, fetchedAt);
    const chicagoFciReading = resolveChicagoFciReading(chicagoFciDataset, asOfTime, fetchedAt);
    return {
      period,
      asOfTime,
      treasury,
      vixReading,
      chicagoFciReading,
      macroSeries: [vixReading, chicagoFciReading].filter((reading): reading is MacroSeriesReading => reading !== null),
      baseRateHistory: resolveBaseRateWindow(datasets.oneMonth, recordDate, asOfTime),
    };
  });

  return replayRegimeWalk(steps).map(({ step, assessment }) => ({
    period: step.period,
    asOfTime: step.asOfTime,
    treasury: step.treasury,
    vixReading: step.vixReading,
    chicagoFciReading: step.chicagoFciReading,
    assessment,
  }));
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export const formatArchiveDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatArchiveTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : timestampFormatter.format(date);
};

const formatArchiveAge = (value: string, now: Date) => {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) {
    return "—";
  }
  const hours = Math.max(0, Math.round((now.getTime() - timestamp.getTime()) / 36e5));
  return `${hours}h.`;
};

const ARCHIVE_SOURCE_LABEL = "US Treasury Daily Treasury Yield Curve Rates (via FRED)";

/** The provenance block every archived summary carries. */
export const buildArchiveProvenance = (fetchedAt: string, now: Date) => ({
  sourceLabel: ARCHIVE_SOURCE_LABEL,
  sourceUrl: SERIES_SOURCE_URLS.tenYear,
  timestampLabel: formatArchiveTimestamp(fetchedAt),
  ageLabel: formatArchiveAge(fetchedAt, now),
  statusLabel: "Historical (simulated)",
});

/**
 * A summary's inputs cited to the FRED series each was read from, rather than
 * to the live client's combined source label.
 */
export const withArchiveInputSources = <Summary extends { inputs: RegimeAssessment["inputs"] }>(
  summary: Summary,
  baseRateUsed: RegimeAssessment["scores"]["baseRateUsed"],
): Summary => {
  const inputSourceUrls = {
    "base-rate": baseRateUsed === "3M" ? SERIES_SOURCE_URLS.threeMonth : SERIES_SOURCE_URLS.oneMonth,
    "two-year": SERIES_SOURCE_URLS.twoYear,
    "ten-year": SERIES_SOURCE_URLS.tenYear,
    "curve-slope": SERIES_SOURCE_URLS.tenYear,
  } as const;
  return {
    ...summary,
    inputs: summary.inputs.map((input) => ({
      ...input,
      sourceLabel: ARCHIVE_SOURCE_LABEL,
      sourceUrl: inputSourceUrls[input.id],
    })),
  };
};
