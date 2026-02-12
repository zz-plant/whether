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

const snapshotSeries: MacroSeriesReading[] = payload.series.map((series) => ({
  ...series,
  fetched_at: series.fetched_at ?? payload.fetched_at,
  isLive: series.isLive ?? payload.isLive,
}));

export const macroSeries: MacroSeriesReading[] = snapshotSeries;

const readFredLatestValue = async (seriesId: string, fetcher: typeof fetch) => {
  const response = await fetcher(
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`,
    { cache: "no-store" },
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
    cache: "no-store",
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

const buildLiveSeries = async (fetcher: typeof fetch): Promise<MacroSeriesReading[]> => {
  const [cpi, unemployment, bbbSpread] = await Promise.all([
    readBlsLatestValue("CUUR0000SA0", fetcher),
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
