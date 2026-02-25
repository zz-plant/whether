/**
 * Macro snapshot loader for non-yield-curve signals.
 * Prefers live series fetches and falls back to checked-in snapshot data.
 */
import macroSnapshot from "../data/macro_snapshot.json";
import type { MacroSeriesReading } from "./types";

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

const payload = macroSnapshot as MacroSnapshotPayload;

const MACRO_SERIES_REVALIDATE_SECONDS = 900;

const snapshotSeries: MacroSeriesReading[] = payload.series.map((series) => ({
  ...series,
  fetched_at: series.fetched_at ?? payload.fetched_at,
  isLive: series.isLive ?? payload.isLive,
}));

export const macroSeries: MacroSeriesReading[] = snapshotSeries;

const readFredLatestValue = async (seriesId: string, fetcher: typeof fetch) => {
  const response = await fetcher(
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`,
    { next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS } },
  );

  if (!response.ok) {
    throw new Error(`FRED request failed for ${seriesId}`);
  }

  const csv = await response.text();
  const rows = csv.trim().split(/\r?\n/).slice(1);
  const latestRow = rows
    .map((row) => row.split(","))
    .reverse()
    .find((parts) => parts.length >= 2 && parts[1] !== "." && !Number.isNaN(Number(parts[1])));

  if (!latestRow) {
    throw new Error(`No FRED rows for ${seriesId}`);
  }

  return {
    recordDate: latestRow[0],
    value: Number(latestRow[1]),
  };
};

const readBlsLatestValue = async (seriesId: string, fetcher: typeof fetch) => {
  const response = await fetcher("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS },
    body: JSON.stringify({ seriesid: [seriesId], latest: true }),
  });

  if (!response.ok) {
    throw new Error(`BLS request failed for ${seriesId}`);
  }

  const payload = (await response.json()) as {
    Results?: { series?: Array<{ data?: Array<{ year: string; period: string; value: string }> }> };
  };

  const point = payload.Results?.series?.[0]?.data?.[0];
  if (!point?.year || !point.period || !point.value) {
    throw new Error(`No BLS rows for ${seriesId}`);
  }

  const month = point.period.replace("M", "");
  return {
    recordDate: `${point.year}-${month}-01`,
    value: Number(point.value),
  };
};

const readBlsLatestYearOverYear = async (seriesId: string, fetcher: typeof fetch) => {
  const currentYear = new Date().getUTCFullYear();
  const response = await fetcher("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    next: { revalidate: MACRO_SERIES_REVALIDATE_SECONDS },
    body: JSON.stringify({
      seriesid: [seriesId],
      startyear: String(currentYear - 2),
      endyear: String(currentYear),
    }),
  });

  if (!response.ok) {
    throw new Error(`BLS request failed for ${seriesId}`);
  }

  const payload = (await response.json()) as {
    Results?: { series?: Array<{ data?: Array<{ year: string; period: string; value: string }> }> };
  };

  const points = (payload.Results?.series?.[0]?.data ?? [])
    .filter((point) => /^M\d{2}$/.test(point.period) && point.period !== "M13")
    .sort((a, b) => `${b.year}${b.period}`.localeCompare(`${a.year}${a.period}`));
  const latest = points[0];

  if (!latest) {
    throw new Error(`No BLS rows for ${seriesId}`);
  }

  const previousYearPoint = points.find(
    (point) => point.period === latest.period && point.year === String(Number(latest.year) - 1),
  );

  if (!previousYearPoint) {
    throw new Error(`No prior year BLS row for ${seriesId}`);
  }

  const latestValue = Number(latest.value);
  const previousYearValue = Number(previousYearPoint.value);
  if (!Number.isFinite(latestValue) || !Number.isFinite(previousYearValue) || previousYearValue === 0) {
    throw new Error(`Invalid BLS rows for ${seriesId}`);
  }

  const month = latest.period.replace("M", "");
  return {
    recordDate: `${latest.year}-${month}-01`,
    value: ((latestValue - previousYearValue) / previousYearValue) * 100,
  };
};

const buildLiveSeries = async (fetcher: typeof fetch): Promise<MacroSeriesReading[]> => {
  const [cpi, unemployment, bbbSpread] = await Promise.all([
    readBlsLatestYearOverYear("CUUR0000SA0", fetcher),
    readBlsLatestValue("LNS14000000", fetcher),
    readFredLatestValue("BAA10Y", fetcher),
  ]);

  return snapshotSeries.map((series) => {
    if (series.id === "CPI_YOY") {
      return {
        ...series,
        value: cpi.value,
        record_date: cpi.recordDate,
        fetched_at: new Date().toISOString(),
        isLive: true,
        sourceLabel: "BLS public API",
        sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
      };
    }

    if (series.id === "UNEMPLOYMENT_RATE") {
      return {
        ...series,
        value: unemployment.value,
        record_date: unemployment.recordDate,
        fetched_at: new Date().toISOString(),
        isLive: true,
        sourceLabel: "BLS public API",
        sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
      };
    }

    return {
      ...series,
      value: bbbSpread.value,
      record_date: bbbSpread.recordDate,
      fetched_at: new Date().toISOString(),
      isLive: true,
      sourceLabel: "FRED",
      sourceUrl: "https://fred.stlouisfed.org/series/BAA10Y",
    };
  });
};

export const loadMacroSeries = async (fetcher: typeof fetch = fetch): Promise<MacroSeriesReading[]> => {
  try {
    return await buildLiveSeries(fetcher);
  } catch {
    return snapshotSeries;
  }
};
