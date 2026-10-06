/**
 * Treasury client for fetching yield curve data with explicit metadata and fallback support.
 * Keeps network access isolated behind a small interface for future Cloudflare migration.
 */
import type { TreasuryData } from "../types";
import { findTimeMachineSnapshot } from "../timeMachine/timeMachineCache";
import { fetchWithTimeout } from "../fetchWithTimeout";
import { FRED_BASE_URL, parseFredCsvSeries } from "../fred";
import { isTestRuntime, withRetry } from "../runtime/retry";

const TREASURY_FETCH_HEADERS = {
  accept: "text/csv,application/csv;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "user-agent": "Mozilla/5.0 (compatible; WhetherApp/1.0)",
} as const;

const PRIMARY_FETCH_TIMEOUT_MS = 1_500;
const RETRY_FETCH_TIMEOUT_MS = 2_500;
const MAX_SERIES_FETCH_ATTEMPTS = 2;
// Zero under the suite, where stubbed upstreams fail at once (see isTestRuntime).
const RETRY_BACKOFF_MS = isTestRuntime() ? 0 : 250;
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
  oneMonth: `${FRED_BASE_URL}?id=DGS1MO`,
  threeMonth: `${FRED_BASE_URL}?id=DGS3MO`,
  twoYear: `${FRED_BASE_URL}?id=DGS2`,
  tenYear: `${FRED_BASE_URL}?id=DGS10`,
} as const;

interface TreasuryFetchOptions {
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

// Only the latest common observation date is consumed by the yields payload, so
// bound the default FRED requests to a recent window instead of the series'
// full history (hundreds of KB per series without `cosd`). Custom endpoints
// keep whatever range parameters the caller encoded. The one-month bill gets a
// wider window: its trailing observations feed the base-rate velocity term
// (~91 days back), so the series the engine already fetches has to carry the
// window that term reads.
const SERIES_LOOKBACK_DAYS = 90;
const BASE_RATE_HISTORY_LOOKBACK_DAYS = 130;

const withRecentObservationWindow = (
  endpoint: string,
  lookbackDays: number = SERIES_LOOKBACK_DAYS,
) => {
  const url = new URL(endpoint);
  // Custom endpoints keep whatever range parameters the caller encoded; only
  // the default series URLs (no `cosd`) get the bounded recent window.
  if (!url.searchParams.has("cosd")) {
    const start = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    url.searchParams.set("cosd", start.toISOString().slice(0, 10));
  }
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

/**
 * A 5xx or 429 answer, thrown so the shared retry loop treats it as a failure worth another
 * attempt. It carries the response because, once attempts run out, the caller still gets that
 * response back to judge rather than an exception.
 */
class RetryableStatusError extends Error {
  constructor(readonly response: Response) {
    super(`Treasury series request answered HTTP ${response.status}`);
    this.name = "RetryableStatusError";
  }
}

const fetchSeriesWithRetry = async (fetcher: typeof fetch, endpoint: string): Promise<Response> => {
  try {
    return await withRetry(
      async (_remainingMs, attempt) => {
        const response = await fetchWithTimeout(
          fetcher,
          endpoint,
          { headers: TREASURY_FETCH_HEADERS },
          attempt === 0 ? PRIMARY_FETCH_TIMEOUT_MS : RETRY_FETCH_TIMEOUT_MS,
        );
        if (!response.ok && (response.status >= 500 || response.status === 429)) {
          throw new RetryableStatusError(response);
        }
        return response;
      },
      {
        attempts: MAX_SERIES_FETCH_ATTEMPTS,
        backoffMs: RETRY_BACKOFF_MS,
        isRetryable: (error) =>
          error instanceof RetryableStatusError || isAbortLikeError(error) || isTransientFetchError(error),
      },
    );
  } catch (error) {
    if (!(error instanceof RetryableStatusError)) {
      throw error;
    }
    if (error.response.status === 520) {
      throw new Error(
        `FRED Treasury upstream unavailable (HTTP 520) after ${MAX_SERIES_FETCH_ATTEMPTS} attempts.`
      );
    }
    return error.response;
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

  /**
   * The trailing one-month-bill window the base-rate velocity term reads.
   *
   * Built from the series the client already parses; the yields payload keeps
   * only the latest common date, and before this the rest of every CSV response
   * was parsed and discarded. Empty rather than absent when the window cannot be
   * read, so consumers can tell "no history" from "history not requested".
   */
  const buildOneMonthHistory = (
    series: Map<string, number | null>,
    latestDate: string,
  ): { date: string; value: number | null }[] => {
    const cutoffMs =
      Date.parse(`${latestDate}T00:00:00.000Z`) - BASE_RATE_HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    return Array.from(series.entries())
      .map(([date, value]) => ({ date, value }))
      .filter((point) => {
        const pointMs = Date.parse(`${point.date}T00:00:00.000Z`);
        return Number.isFinite(pointMs) && pointMs >= cutoffMs;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  try {
    const [oneMonthResponse, threeMonthResponse, twoYearResponse, tenYearResponse] =
      await Promise.all([
        fetchSeriesWithRetry(fetcher, withRecentObservationWindow(endpoints.oneMonth, BASE_RATE_HISTORY_LOOKBACK_DAYS)),
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

    const oneMonthSeries = parseFredCsvSeries(oneMonthCsv);
    const threeMonthSeries = parseFredCsvSeries(threeMonthCsv);
    const twoYearSeries = parseFredCsvSeries(twoYearCsv);
    const tenYearSeries = parseFredCsvSeries(tenYearCsv);

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
      oneMonthHistory: buildOneMonthHistory(oneMonthSeries, recordDate),
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
