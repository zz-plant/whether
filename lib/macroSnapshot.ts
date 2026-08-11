/**
 * Macro snapshot loader for non-yield-curve signals.
 * Prefers live series fetches and falls back to checked-in snapshot data.
 */
import macroSnapshot from "../data/macro_snapshot.json";
import { computeYearOverYearPoints, fetchFredCsv, parseFredCsvRows } from "./fred";
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


const RECENT_HISTORY_WINDOW_DAYS = 92;
const RECENT_HISTORY_WINDOW_MS = RECENT_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

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

// The rendered window is RECENT_HISTORY_WINDOW_DAYS; fetch that plus margin for
// publication lag rather than the series' full multi-decade history. YoY series
// additionally need the prior-year observation for every point in the window.
const HISTORY_FETCH_LOOKBACK_DAYS = RECENT_HISTORY_WINDOW_DAYS + 90;
const YOY_FETCH_LOOKBACK_DAYS = RECENT_HISTORY_WINDOW_DAYS + 460;

const readFredSeriesHistory = async (seriesId: string, fetcher: typeof fetch) => {
  const csv = await fetchFredCsv(fetcher, seriesId, { lookbackDays: HISTORY_FETCH_LOOKBACK_DAYS });
  const parsedHistory = trimHistoryToRecentWindow(parseFredCsvRows(csv));
  const latest = parsedHistory.at(-1);

  if (!latest) {
    throw new Error(`No FRED rows for ${seriesId}`);
  }

  return {
    recordDate: latest.date,
    value: latest.value,
    history: parsedHistory,
  };
};

const readFredYearOverYearPoints = async (seriesId: string, fetcher: typeof fetch) => {
  const csv = await fetchFredCsv(fetcher, seriesId, { lookbackDays: YOY_FETCH_LOOKBACK_DAYS });
  const yoyHistory = trimHistoryToRecentWindow(
    computeYearOverYearPoints(parseFredCsvRows(csv), seriesId),
  );

  const latest = yoyHistory.at(-1);
  if (!latest) {
    throw new Error(`No YoY rows for ${seriesId}`);
  }

  return {
    recordDate: latest.date,
    value: latest.value,
    history: yoyHistory,
  };
};

const liveSeriesDefinitions: LiveSeriesDefinition[] = [
  {
    id: "CPI_YOY",
    load: (fetcher) => readFredYearOverYearPoints("CPIAUCSL", fetcher),
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/CPIAUCSL",
  },
  {
    id: "UNEMPLOYMENT_RATE",
    load: (fetcher) => readFredSeriesHistory("UNRATE", fetcher),
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/UNRATE",
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
