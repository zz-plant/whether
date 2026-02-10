/**
 * Treasury client for fetching yield curve data with explicit metadata and fallback support.
 * Keeps network access isolated behind a small interface for future Cloudflare migration.
 */
import type { TreasuryData } from "../types";
import { findTimeMachineSnapshot } from "../timeMachine/timeMachineCache";

export const TREASURY_ENDPOINTS = {
  oneMonth: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS1MO",
  threeMonth: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3MO",
  twoYear: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS2",
  tenYear: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10",
} as const;

export interface TreasuryFetchOptions {
  fetcher?: typeof fetch;
  endpoint?: string;
  snapshotFallback?: TreasuryData;
  asOf?: string;
}

const buildFallbackSnapshot = (snapshot: TreasuryData, reason: string): TreasuryData => {
  return {
    ...snapshot,
    isLive: false,
    fallback_at: new Date().toISOString(),
    fallback_reason: reason,
  };
};

const parseFredCsv = (csv: string) => {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (!header) {
    return new Map<string, number | null>();
  }

  const values = new Map<string, number | null>();
  for (const row of rows) {
    const [date, value] = row.split(",");
    if (!date) {
      continue;
    }
    if (!value || value === ".") {
      values.set(date, null);
      continue;
    }
    const numeric = Number(value);
    values.set(date, Number.isFinite(numeric) ? numeric : null);
  }

  return values;
};

const findLatestCommonDate = (seriesMaps: Map<string, number | null>[]) => {
  const firstSeriesDates = Array.from(seriesMaps[0]?.keys() ?? []);

  for (let index = firstSeriesDates.length - 1; index >= 0; index -= 1) {
    const candidateDate = firstSeriesDates[index];
    if (!candidateDate) {
      continue;
    }

    const hasAllValues = seriesMaps.every((series) => {
      const value = series.get(candidateDate);
      return typeof value === "number";
    });

    if (hasAllValues) {
      return candidateDate;
    }
  }

  return null;
};

const buildSeriesEndpoint = (baseEndpoint: string | undefined, seriesId: string, fallback: string) => {
  if (!baseEndpoint) {
    return fallback;
  }

  const url = new URL(baseEndpoint);
  url.searchParams.set("id", seriesId);
  return url.toString();
};

export const fetchTreasuryData = async (
  options: TreasuryFetchOptions = {}
): Promise<TreasuryData> => {
  if (options.asOf) {
    const cachedSnapshot = findTimeMachineSnapshot(options.asOf);
    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    if (options.snapshotFallback) {
      return buildFallbackSnapshot(
        options.snapshotFallback,
        "Time Machine cache miss for historical selection."
      );
    }

    throw new Error("Time Machine cache miss for historical selection.");
  }

  const fetcher = options.fetcher ?? fetch;
  const baseEndpoint = options.endpoint;
  const fetched_at = new Date().toISOString();
  const endpoints = {
    oneMonth: buildSeriesEndpoint(baseEndpoint, "DGS1MO", TREASURY_ENDPOINTS.oneMonth),
    threeMonth: buildSeriesEndpoint(baseEndpoint, "DGS3MO", TREASURY_ENDPOINTS.threeMonth),
    twoYear: buildSeriesEndpoint(baseEndpoint, "DGS2", TREASURY_ENDPOINTS.twoYear),
    tenYear: buildSeriesEndpoint(baseEndpoint, "DGS10", TREASURY_ENDPOINTS.tenYear),
  };

  try {
    const [oneMonthResponse, threeMonthResponse, twoYearResponse, tenYearResponse] =
      await Promise.all([
        fetcher(endpoints.oneMonth),
        fetcher(endpoints.threeMonth),
        fetcher(endpoints.twoYear),
        fetcher(endpoints.tenYear),
      ]);

    const responses = [oneMonthResponse, threeMonthResponse, twoYearResponse, tenYearResponse];
    const badResponse = responses.find((response) => !response.ok);
    if (badResponse) {
      throw new Error(`Treasury API error: ${badResponse.status}`);
    }

    const [oneMonthCsv, threeMonthCsv, twoYearCsv, tenYearCsv] = await Promise.all(
      responses.map((response) => response.text())
    );

    const oneMonthSeries = parseFredCsv(oneMonthCsv);
    const threeMonthSeries = parseFredCsv(threeMonthCsv);
    const twoYearSeries = parseFredCsv(twoYearCsv);
    const tenYearSeries = parseFredCsv(tenYearCsv);

    const recordDate = findLatestCommonDate([
      oneMonthSeries,
      threeMonthSeries,
      twoYearSeries,
      tenYearSeries,
    ]);

    if (!recordDate) {
      throw new Error("Treasury API returned no data or invalid payload.");
    }

    return {
      source: "https://fred.stlouisfed.org",
      record_date: recordDate,
      fetched_at,
      isLive: true,
      yields: {
        oneMonth: oneMonthSeries.get(recordDate) ?? null,
        threeMonth: threeMonthSeries.get(recordDate) ?? null,
        twoYear: twoYearSeries.get(recordDate) ?? null,
        tenYear: tenYearSeries.get(recordDate) ?? null,
      },
    };
  } catch (error) {
    if (options.snapshotFallback) {
      const message =
        error instanceof Error ? error.message : "Unknown Treasury fetch error";
      return buildFallbackSnapshot(options.snapshotFallback, message);
    }

    const message = error instanceof Error ? error.message : "Unknown Treasury fetch error";
    throw new Error(message);
  }
};
