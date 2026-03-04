/**
 * Treasury client for fetching yield curve data with explicit metadata and fallback support.
 * Keeps network access isolated behind a small interface for future Cloudflare migration.
 */
import type { TreasuryData } from "../types";
import { findTimeMachineSnapshot } from "../timeMachine/timeMachineCache";
import { fetchWithTimeout } from "../fetchWithTimeout";

const PRIMARY_FETCH_TIMEOUT_MS = 12_000;
const RETRY_FETCH_TIMEOUT_MS = 20_000;
const FISCAL_DATA_ENDPOINT =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/daily_treasury_yield_curve?sort=-record_date&page%5Bsize%5D=5";

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

const parseFiscalDataNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const fetchTreasuryFromFiscalData = async (fetcher: typeof fetch, fetchedAt: string) => {
  const response = await fetchWithTimeout(fetcher, FISCAL_DATA_ENDPOINT, undefined, PRIMARY_FETCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`FiscalData Treasury fetch error: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: Array<Record<string, unknown>> };
  const rows = payload.data?.filter((row) => typeof row.record_date === "string") ?? [];
  if (!rows.length) {
    throw new Error("FiscalData Treasury series returned no data or invalid payload.");
  }

  for (const row of rows) {
    const recordDate = row.record_date;
    if (typeof recordDate !== "string") {
      continue;
    }

    const oneMonth = parseFiscalDataNumber(row.bc_1month);
    const threeMonth = parseFiscalDataNumber(row.bc_3month);
    const twoYear = parseFiscalDataNumber(row.bc_2year);
    const tenYear = parseFiscalDataNumber(row.bc_10year);
    if ([oneMonth, threeMonth, twoYear, tenYear].some((value) => value === null)) {
      continue;
    }

    return {
      source: "https://api.fiscaldata.treasury.gov",
      record_date: recordDate,
      fetched_at: fetchedAt,
      isLive: true,
      yields: {
        oneMonth,
        threeMonth,
        twoYear,
        tenYear,
      },
    } satisfies TreasuryData;
  }

  throw new Error("FiscalData Treasury series missing one or more required tenors.");
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

const isAbortLikeError = (error: unknown) => {
  if (!error) {
    return false;
  }

  const name =
    typeof error === "object" && "name" in error && typeof error.name === "string"
      ? error.name.toLowerCase()
      : "";
  const message =
    typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return name.includes("abort") || message.includes("aborted") || message.includes("timeout");
};

const formatFetchError = (error: unknown) => {
  if (isAbortLikeError(error)) {
    return `Treasury live fetch timed out after ${PRIMARY_FETCH_TIMEOUT_MS / 1_000}s (retried once).`;
  }

  return error instanceof Error ? error.message : "Unknown Treasury fetch error";
};

const fetchSeriesWithRetry = async (fetcher: typeof fetch, endpoint: string) => {
  try {
    return await fetchWithTimeout(fetcher, endpoint, undefined, PRIMARY_FETCH_TIMEOUT_MS);
  } catch (error) {
    if (!isAbortLikeError(error)) {
      throw error;
    }

    return fetchWithTimeout(fetcher, endpoint, undefined, RETRY_FETCH_TIMEOUT_MS);
  }
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
        fetchSeriesWithRetry(fetcher, endpoints.oneMonth),
        fetchSeriesWithRetry(fetcher, endpoints.threeMonth),
        fetchSeriesWithRetry(fetcher, endpoints.twoYear),
        fetchSeriesWithRetry(fetcher, endpoints.tenYear),
      ]);

    const responses = [oneMonthResponse, threeMonthResponse, twoYearResponse, tenYearResponse];
    const badResponse = responses.find((response) => !response.ok);
    if (badResponse) {
      throw new Error(`FRED Treasury fetch error: ${badResponse.status}`);
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
      throw new Error("FRED Treasury series returned no data or invalid payload.");
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
    try {
      return await fetchTreasuryFromFiscalData(fetcher, fetched_at);
    } catch {
      // If FiscalData also fails, preserve the primary FRED failure reason for clearer diagnostics.
    }

    if (options.snapshotFallback) {
      const message = formatFetchError(error);
      return buildFallbackSnapshot(options.snapshotFallback, message);
    }

    const message = formatFetchError(error);
    throw new Error(message);
  }
};
