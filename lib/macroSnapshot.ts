/**
 * Macro snapshot loader for non-yield-curve signals.
 * Prefers live series fetches and falls back to checked-in snapshot data.
 */
import macroSnapshot from "../data/macro_snapshot.json";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { MacroSeriesId, MacroSeriesReading, SeriesHistoryPoint } from "./types";

type MacroSnapshotPayload = {
  fetched_at: string;
  isLive: boolean;
  series: Array<
    Omit<MacroSeriesReading, "fetched_at" | "isLive"> & {
      fetched_at?: string;
      isLive?: boolean;
    }
  >;
};

type LiveSeriesValue = {
  value: number;
  recordDate: string;
  sourceLabel: string;
  sourceUrl: string;
  history: SeriesHistoryPoint[];
};

type LiveSeriesDefinition = {
  id: MacroSeriesId;
  load: (fetcher: typeof fetch) => Promise<Omit<LiveSeriesValue, "sourceLabel" | "sourceUrl">>;
  sourceLabel: string;
  sourceUrl: string;
};

const payload = macroSnapshot as MacroSnapshotPayload;

const MACRO_SERIES_REVALIDATE_SECONDS = 900;
const BLS_YOY_LOOKBACK_YEARS = 2;
const YEAR_OVER_YEAR_PERCENT_MULTIPLIER = 100;
const RECENT_HISTORY_WINDOW_DAYS = 92;
const RECENT_HISTORY_WINDOW_MS = RECENT_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const MACRO_RETRY_ATTEMPTS = 2;
const MACRO_RETRY_BACKOFF_MS = 300;

const getBlsApiKey = (): string | null => {
  const key = (globalThis as { BLS_API_KEY?: string }).BLS_API_KEY ?? process.env.BLS_API_KEY;
  return typeof key === "string" && key.length > 0 ? key : null;
};

const withRetry = async <T>(fn: () => Promise<T>, attempts = MACRO_RETRY_ATTEMPTS): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, MACRO_RETRY_BACKOFF_MS * (attempt + 1)));
      }
    }
  }
  throw lastError;
};

const SIGNAL_SANITY_RANGES: Partial<Record<MacroSeriesId, { min: number; max: number }>> = {
  CPI_YOY: { min: -5, max: 20 },
  UNEMPLOYMENT_RATE: { min: 0, max: 25 },
  BBB_CREDIT_SPREAD: { min: 0, max: 10 },
  HY_CREDIT_SPREAD: { min: 0, max: 25 },
  CHICAGO_FCI: { min: -5, max: 5 },
  VIX_INDEX: { min: 5, max: 100 },
};

const validateSignalValue = (id: MacroSeriesId, value: number): boolean => {
  const range = SIGNAL_SANITY_RANGES[id];
  if (!range) return true;
  return value >= range.min && value <= range.max;
};

const snapshotSeries: MacroSeriesReading[] = payload.series.map((series) => ({
  ...series,
  fetched_at: series.fetched_at ?? payload.fetched_at,
  isLive: series.isLive ?? payload.isLive,
}));

export const macroSeries: MacroSeriesReading[] = snapshotSeries;

const sortHistoryAscending = (points: SeriesHistoryPoint[]) =>
  [...points].sort((left, right) => {
    const leftMs = Date.parse(`${left.date}T00:00:00.000Z`);
    const rightMs = Date.parse(`${right.date}T00:00:00.000Z`);
    return leftMs - rightMs;
  });

const dedupeHistoryByDate = (points: SeriesHistoryPoint[]) => {
  const byDate = new Map<string, number | null>();
  points.forEach((point) => {
    byDate.set(point.date, point.value);
  });

  return sortHistoryAscending(
    Array.from(byDate.entries()).map(([date, value]) => ({ date, value })),
  );
};

const trimHistoryToRecentWindow = (points: SeriesHistoryPoint[]) => {
  const deduped = dedupeHistoryByDate(points).filter(
    (point): point is SeriesHistoryPoint & { value: number } => typeof point.value === "number",
  );
  const latest = deduped.at(-1);
  if (!latest) {
    return [];
  }

  const latestMs = Date.parse(`${latest.date}T00:00:00.000Z`);
  if (Number.isNaN(latestMs)) {
    return deduped;
  }

  const cutoffMs = latestMs - RECENT_HISTORY_WINDOW_MS;
  return deduped.filter((point) => {
    const pointMs = Date.parse(`${point.date}T00:00:00.000Z`);
    return Number.isFinite(pointMs) && pointMs >= cutoffMs;
  });
};

const readFredSeriesHistory = async (seriesId: string, fetcher: typeof fetch) => {
  const { value, recordDate, history } = await withRetry(async () => {
    const response = await fetchWithTimeout(
      fetcher,
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`,
      { next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS } },
    );

    if (!response.ok) {
      throw new Error(`FRED request failed for ${seriesId}`);
    }

    const csv = await response.text();
    const parsedHistory = trimHistoryToRecentWindow(
      csv
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .map((row) => row.split(","))
        .filter((parts) => parts.length >= 2 && parts[1] !== "." && !Number.isNaN(Number(parts[1])))
        .map((parts) => ({
          date: parts[0] ?? "",
          value: Number(parts[1]),
        })),
    );
    const latest = parsedHistory.at(-1);

    if (!latest) {
      throw new Error(`No FRED rows for ${seriesId}`);
    }

    return {
      recordDate: latest.date,
      value: latest.value,
      history: parsedHistory,
    };
  });

  return { value, recordDate, history };
};

const readBlsMonthlyPoints = async (seriesId: string, fetcher: typeof fetch) => {
  const { value, recordDate, history } = await withRetry(async () => {
    const currentYear = new Date().getUTCFullYear();
    const apiKey = getBlsApiKey();
    const body: Record<string, unknown> = {
      seriesid: [seriesId],
      startyear: String(currentYear - BLS_YOY_LOOKBACK_YEARS),
      endyear: String(currentYear),
    };
    if (apiKey) body.registrationkey = apiKey;

    const response = await fetchWithTimeout(fetcher, "https://api.bls.gov/publicAPI/v2/timeseries/data/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`BLS request failed for ${seriesId}`);
    }

    const payload = (await response.json()) as {
      Results?: { series?: Array<{ data?: Array<{ year: string; period: string; value: string }> }> };
    };

    const points = trimHistoryToRecentWindow(
      (payload.Results?.series?.[0]?.data ?? [])
        .filter((point) => /^M\d{2}$/.test(point.period) && point.period !== "M13")
        .map((point) => {
          const month = point.period.replace("M", "").padStart(2, "0");
          return {
            date: `${point.year}-${month}-01`,
            value: Number(point.value),
          };
        })
        .filter((point) => Number.isFinite(point.value)),
    );

    if (!points.length) {
      throw new Error(`No BLS rows for ${seriesId}`);
    }

    return {
      recordDate: points[points.length - 1]?.date ?? "",
      value: points[points.length - 1]?.value ?? Number.NaN,
      history: points,
    };
  });

  return { value, recordDate, history };
};

const readBlsYearOverYearPoints = async (seriesId: string, fetcher: typeof fetch) => {
  const { value, recordDate, history } = await withRetry(async () => {
    const currentYear = new Date().getUTCFullYear();
    const apiKey = getBlsApiKey();
    const body: Record<string, unknown> = {
      seriesid: [seriesId],
      startyear: String(currentYear - BLS_YOY_LOOKBACK_YEARS),
      endyear: String(currentYear),
    };
    if (apiKey) body.registrationkey = apiKey;

    const response = await fetchWithTimeout(fetcher, "https://api.bls.gov/publicAPI/v2/timeseries/data/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`BLS request failed for ${seriesId}`);
    }

    const payload = (await response.json()) as {
      Results?: { series?: Array<{ data?: Array<{ year: string; period: string; value: string }> }> };
    };

    const rawPoints = (payload.Results?.series?.[0]?.data ?? [])
      .filter((point) => /^M\d{2}$/.test(point.period) && point.period !== "M13")
      .sort((a, b) => `${a.year}${a.period}`.localeCompare(`${b.year}${b.period}`));

    const parsedHistory = trimHistoryToRecentWindow(
      rawPoints.flatMap((point) => {
        const previousYearPoint = rawPoints.find(
          (candidate) => candidate.period === point.period && candidate.year === String(Number(point.year) - 1),
        );
        if (!previousYearPoint) {
          return [];
        }

        const latestValue = Number(point.value);
        const previousYearValue = Number(previousYearPoint.value);
        if (!Number.isFinite(latestValue) || !Number.isFinite(previousYearValue) || previousYearValue === 0) {
          return [];
        }

        const month = point.period.replace("M", "").padStart(2, "0");
        return [{
          date: `${point.year}-${month}-01`,
          value: ((latestValue - previousYearValue) / previousYearValue) * YEAR_OVER_YEAR_PERCENT_MULTIPLIER,
        }];
      }),
    );

    const latest = parsedHistory.at(-1);
    if (!latest) {
      throw new Error(`No prior year BLS row for ${seriesId}`);
    }

    return {
      recordDate: latest.date,
      value: latest.value,
      history: parsedHistory,
    };
  });

  return { value, recordDate, history };
};

const liveSeriesDefinitions: LiveSeriesDefinition[] = [
  {
    id: "CPI_YOY",
    load: (fetcher) => readBlsYearOverYearPoints("CUUR0000SA0", fetcher),
    sourceLabel: "BLS public API",
    sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
  },
  {
    id: "UNEMPLOYMENT_RATE",
    load: (fetcher) => readBlsMonthlyPoints("LNS14000000", fetcher),
    sourceLabel: "BLS public API",
    sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
  },
  {
    id: "BBB_CREDIT_SPREAD",
    load: (fetcher) => readFredSeriesHistory("BAA10Y", fetcher),
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/BAA10Y",
  },
  {
    id: "HY_CREDIT_SPREAD",
    load: (fetcher) => readFredSeriesHistory("BAMLH0A0HYM2", fetcher),
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/BAMLH0A0HYM2",
  },
  {
    id: "CHICAGO_FCI",
    load: (fetcher) => readFredSeriesHistory("NFCI", fetcher),
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/NFCI",
  },
  {
    id: "VIX_INDEX",
    load: (fetcher) => readFredSeriesHistory("VIXCLS", fetcher),
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/VIXCLS",
  },
];

const buildLiveSeries = async (fetcher: typeof fetch): Promise<MacroSeriesReading[]> => {
  const settled = await Promise.allSettled(
    liveSeriesDefinitions.map(async (definition) => {
      const reading = await definition.load(fetcher);
      return [
        definition.id,
        {
          value: reading.value,
          recordDate: reading.recordDate,
          sourceLabel: definition.sourceLabel,
          sourceUrl: definition.sourceUrl,
          history: reading.history,
        } satisfies LiveSeriesValue,
      ] as const;
    }),
  );

  const liveById: Partial<Record<MacroSeriesId, LiveSeriesValue>> = {};
  for (const result of settled) {
    if (result.status !== "fulfilled") {
      continue;
    }

    const [id, reading] = result.value;
    if (!validateSignalValue(id, reading.value)) {
      continue;
    }
    liveById[id] = reading;
  }

  if (Object.keys(liveById).length === 0) {
    throw new Error("No live macro series available.");
  }

  const nowIso = new Date().toISOString();
  return snapshotSeries.map((series) => {
    const live = liveById[series.id];
    if (!live) {
      return series;
    }

    return {
      ...series,
      value: live.value,
      record_date: live.recordDate,
      fetched_at: nowIso,
      isLive: true,
      sourceLabel: live.sourceLabel,
      sourceUrl: live.sourceUrl,
      history: live.history.length > 0 ? live.history : series.history,
    };
  });
};

export const loadMacroSeries = async (fetcher: typeof fetch = fetch): Promise<MacroSeriesReading[]> => {
  try {
    return await buildLiveSeries(fetcher);
  } catch (error) {
    console.warn("[macroSnapshot] Live fetch failed, falling back to snapshot:", error instanceof Error ? error.message : error);
    return snapshotSeries;
  }
};
