/**
 * Treasury client for fetching yield curve data with explicit metadata and fallback support.
 * Keeps network access isolated behind a small interface for future Cloudflare migration.
 */
import type { TreasuryData } from "../types";
import { findTimeMachineSnapshot } from "../timeMachine/timeMachineCache";
import { fetchWithTimeout } from "../fetchWithTimeout";

const TREASURY_FETCH_HEADERS = {
  accept: "text/csv,application/csv;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "user-agent": "Mozilla/5.0 (compatible; WhetherApp/1.0)",
} as const;

const PRIMARY_FETCH_TIMEOUT_MS = 1_500;
const RETRY_FETCH_TIMEOUT_MS = 2_500;
const MAX_SERIES_FETCH_ATTEMPTS = 2;
// See lib/fred.ts: stubbed upstreams fail instantly under `bun test`, so the
// backoff sleep is pure suite wall clock. The retry path still runs.
const RETRY_BACKOFF_MS =
  typeof process !== "undefined" && process.env?.NODE_ENV === "test" ? 0 : 250;
/**
 * Year-scoped rather than `/current/all`: that path answers 200 with a
 * zero-byte body -- an empty object cached at the CDN, not an error -- so the
 * client fell through to FRED, which refuses Worker-originated requests, and
 * production served a June snapshot into late August. The year file carries the
 * same columns and the same current row, and is served normally.
 */
const buildTreasuryRatesEndpoint = (year: number) =>
  `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all` +
  `?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&_format=csv`;
/*
 * A `fedFunds` entry (DFF) sat here from the commit that introduced this object until 2026-09-03
 * and was never added to the `endpoints` the client builds below, so it never produced a request.
 * Its presence was read as evidence that DFF was a live input -- it reached the source label and
 * the trust page's formula reference, both of which told visitors the Fed's policy rate was in
 * use while `getBaseRate` was falling through to the one-month bill on every render. Wiring it up
 * is a live change to the base rate and belongs to whoever owns that call; naming it without
 * reading it is not.
 */
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

const parseTreasuryCsvNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTreasuryCsvDate = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, month, day, year] = match;
  return `${year}-${month}-${day}`;
};

const parseCsvRow = (row: string) => {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"') {
      if (inQuotes && row[index + 1] === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values;
};

const fetchTreasuryYearCsv = async (fetcher: typeof fetch, fetchedAt: string, year: number) => {
  const response = await fetchWithTimeout(
    fetcher,
    buildTreasuryRatesEndpoint(year),
    { headers: TREASURY_FETCH_HEADERS },
    PRIMARY_FETCH_TIMEOUT_MS
  );
  if (!response.ok) {
    throw new Error(`Treasury daily rates CSV fetch error: ${response.status}`);
  }

  const csv = await response.text();
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (!header || !rows.length) {
    throw new Error("Treasury daily rates CSV returned no data.");
  }

  const columns = parseCsvRow(header).map((column) => column.trim());
  const getColumnValue = (rowValues: string[], column: string) => {
    const index = columns.indexOf(column);
    if (index === -1) {
      return undefined;
    }

    return rowValues[index];
  };

  let latestValidRow: TreasuryData | null = null;

  for (const row of rows) {
    const rowValues = parseCsvRow(row);
    const recordDate = parseTreasuryCsvDate(getColumnValue(rowValues, "Date"));
    const oneMonth = parseTreasuryCsvNumber(getColumnValue(rowValues, "1 Mo"));
    const threeMonth = parseTreasuryCsvNumber(getColumnValue(rowValues, "3 Mo"));
    const twoYear = parseTreasuryCsvNumber(getColumnValue(rowValues, "2 Yr"));
    const tenYear = parseTreasuryCsvNumber(getColumnValue(rowValues, "10 Yr"));

    if (!recordDate || [oneMonth, threeMonth, twoYear, tenYear].some((value) => value === null)) {
      continue;
    }

    const parsedRow = {
      source: "https://home.treasury.gov",
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

    if (!latestValidRow || parsedRow.record_date > latestValidRow.record_date) {
      latestValidRow = parsedRow;
    }
  }

  if (latestValidRow) {
    return latestValidRow;
  }

  throw new Error("Treasury daily rates CSV missing one or more required tenors.");
};

/**
 * The current year's file, then the previous one: in the first days of January
 * the new file can be empty or not yet published, and the latest curve is still
 * the prior year's last session.
 */
const fetchTreasuryFromDailyRatesCsv = async (fetcher: typeof fetch, fetchedAt: string) => {
  const currentYear = new Date(fetchedAt).getUTCFullYear();
  let firstError: unknown;

  for (const year of [currentYear, currentYear - 1]) {
    try {
      return await fetchTreasuryYearCsv(fetcher, fetchedAt, year);
    } catch (error) {
      firstError ??= error;
    }
  }

  throw firstError ?? new Error("Treasury daily rates CSV returned no data.");
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

// Only the latest common observation date is consumed, so bound the default
// FRED requests to a recent window instead of the series' full history
// (hundreds of KB per series without `cosd`). Custom endpoints keep whatever
// range parameters the caller encoded.
const SERIES_LOOKBACK_DAYS = 90;

const withRecentObservationWindow = (endpoint: string) => {
  const url = new URL(endpoint);
  const start = new Date(Date.now() - SERIES_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  url.searchParams.set("cosd", start.toISOString().slice(0, 10));
  return url.toString();
};

const buildSeriesEndpoint = (baseEndpoint: string | undefined, seriesId: string, fallback: string) => {
  if (!baseEndpoint) {
    return withRecentObservationWindow(fallback);
  }

  const url = new URL(baseEndpoint);
  url.searchParams.set("id", seriesId);
  return url.toString();
};

/**
 * Lowercased text of an unknown throw.
 *
 * Was `String(error).toLowerCase()` in two places, which turns a thrown object
 * without a `message` into "[object Object]" and then matches that against
 * "aborted" / "timeout" — a comparison that can only ever be false, dressed as
 * a check. A throw with no readable message has no text, and says so.
 */
const errorMessageText = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message.toLowerCase();
  }
  return typeof error === "string" ? error.toLowerCase() : "";
};

const isAbortLikeError = (error: unknown) => {
  if (!error) {
    return false;
  }

  const name =
    typeof error === "object" && "name" in error && typeof error.name === "string"
      ? error.name.toLowerCase()
      : "";
  const message = errorMessageText(error);

  return name.includes("abort") || message.includes("aborted") || message.includes("timeout");
};

const isTransientFetchError = (error: unknown) => {
  if (!error) {
    return false;
  }

  const message = errorMessageText(error);
  const code =
    typeof error === "object" && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
      ? String(error.cause.code).toLowerCase()
      : "";

  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timed out") ||
    code.includes("enetunreach") ||
    code.includes("econnreset") ||
    code.includes("etimedout")
  );
};

const formatFetchError = (error: unknown) => {
  if (isAbortLikeError(error)) {
    return `Treasury live fetch timed out after ${PRIMARY_FETCH_TIMEOUT_MS / 1_000}s (retried once).`;
  }

  return error instanceof Error ? error.message : "Unknown Treasury fetch error";
};

const pause = (durationMs: number) => new Promise<void>((resolve) => setTimeout(resolve, durationMs));

const fetchSeriesWithRetry = async (fetcher: typeof fetch, endpoint: string) => {
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < MAX_SERIES_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        fetcher,
        endpoint,
        {
          headers: TREASURY_FETCH_HEADERS,
        },
        attempt === 0 ? PRIMARY_FETCH_TIMEOUT_MS : RETRY_FETCH_TIMEOUT_MS
      );

      if (response.ok) {
        return response;
      }

      lastResponse = response;
      const shouldRetryStatus = response.status >= 500 || response.status === 429;
      if (!shouldRetryStatus) {
        return response;
      }

      if (attempt < MAX_SERIES_FETCH_ATTEMPTS - 1) {
        await pause(RETRY_BACKOFF_MS * (attempt + 1));
      }
    } catch (error) {
      lastError = error;
      const shouldRetryError = isAbortLikeError(error) || isTransientFetchError(error);
      if (!shouldRetryError || attempt >= MAX_SERIES_FETCH_ATTEMPTS - 1) {
        throw error;
      }

      await pause(RETRY_BACKOFF_MS * (attempt + 1));
    }
  }

  if (lastResponse) {
    if (lastResponse.status === 520) {
      throw new Error(
        `FRED Treasury upstream unavailable (HTTP 520) after ${MAX_SERIES_FETCH_ATTEMPTS} attempts.`
      );
    }

    return lastResponse;
  }

  throw (lastError ?? new Error("Unknown Treasury fetch error"));
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
      return await fetchTreasuryFromDailyRatesCsv(fetcher, fetched_at);
    } catch {
      // All live sources failed — fall through to snapshot fallback.
    }

    if (options.snapshotFallback) {
      const message = formatFetchError(error);
      return buildFallbackSnapshot(options.snapshotFallback, message);
    }

    const message = formatFetchError(error);
    throw new Error(message);
  }
};
