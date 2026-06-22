/**
 * Treasury client for fetching yield curve data with explicit metadata and fallback support.
 * Keeps network access isolated behind a small interface for future Cloudflare migration.
 */
import type { TreasuryData } from "../types";
import { findTimeMachineSnapshot } from "../timeMachine/timeMachineCache";
import { fetchWithTimeout } from "../fetchWithTimeout";
import { FRED_FETCH_HEADERS as TREASURY_FETCH_HEADERS } from "../fred";

const PRIMARY_FETCH_TIMEOUT_MS = 1_500;
const RETRY_FETCH_TIMEOUT_MS = 2_500;
const MAX_SERIES_FETCH_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 250;
const TREASURY_RATES_ENDPOINT =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/current/all?type=daily_treasury_yield_curve&_format=csv";
const TREASURY_FISCALDATA_ENDPOINT =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?filter=security_desc:in:(Treasury%20Bills:%204-Week,Treasury%20Bills:%2013-Week,Treasury%20Notes:%202-Year,Treasury%20Notes:%2010-Year)&fields=record_date,security_desc,avg_interest_rate_amt&sort=-record_date&page[number]=1&page[size]=800";

export const TREASURY_ENDPOINTS = {
  fedFunds: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFF",
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

const fetchTreasuryFromDailyRatesCsv = async (fetcher: typeof fetch, fetchedAt: string) => {
  const response = await fetchWithTimeout(
    fetcher,
    TREASURY_RATES_ENDPOINT,
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

const fiscalDescToKey: Record<string, keyof TreasuryData["yields"] | null> = {
  "Treasury Bills: 4-Week": "oneMonth",
  "Treasury Bills: 13-Week": "threeMonth",
  "Treasury Notes: 2-Year": "twoYear",
  "Treasury Notes: 10-Year": "tenYear",
};

type FiscalDataRow = {
  record_date?: string;
  security_desc?: string;
  avg_interest_rate_amt?: string | number;
};

const parseFiscalDataRate = (value: FiscalDataRow["avg_interest_rate_amt"]) => {
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

const fetchTreasuryFromFiscalDataApi = async (fetcher: typeof fetch, fetchedAt: string) => {
  const response = await fetchWithTimeout(
    fetcher,
    TREASURY_FISCALDATA_ENDPOINT,
    { headers: TREASURY_FETCH_HEADERS },
    PRIMARY_FETCH_TIMEOUT_MS
  );
  if (!response.ok) {
    throw new Error(`Treasury fiscaldata API fetch error: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: FiscalDataRow[] };
  const rows = Array.isArray(payload.data) ? payload.data : [];
  if (rows.length === 0) {
    throw new Error("Treasury fiscaldata API returned no data.");
  }

  const yieldsByDate = new Map<string, Partial<TreasuryData["yields"]>>();
  for (const row of rows) {
    const recordDate = row.record_date;
    const securityDesc = row.security_desc;
    if (!recordDate || !securityDesc) {
      continue;
    }

    const key = fiscalDescToKey[securityDesc] ?? null;
    if (!key) {
      continue;
    }

    const value = parseFiscalDataRate(row.avg_interest_rate_amt);
    if (value === null) {
      continue;
    }

    const existing = yieldsByDate.get(recordDate) ?? {};
    existing[key] = value;
    yieldsByDate.set(recordDate, existing);
  }

  const orderedDates = Array.from(yieldsByDate.keys()).sort((left, right) => right.localeCompare(left));
  for (const date of orderedDates) {
    const yields = yieldsByDate.get(date);
    if (!yields) {
      continue;
    }

    if (
      typeof yields.oneMonth === "number" &&
      typeof yields.threeMonth === "number" &&
      typeof yields.twoYear === "number" &&
      typeof yields.tenYear === "number"
    ) {
      return {
        source: "https://api.fiscaldata.treasury.gov",
        record_date: date,
        fetched_at: fetchedAt,
        isLive: true,
        yields: {
          oneMonth: yields.oneMonth,
          threeMonth: yields.threeMonth,
          twoYear: yields.twoYear,
          tenYear: yields.tenYear,
        },
      } satisfies TreasuryData;
    }
  }

  throw new Error("Treasury fiscaldata API missing one or more required tenors.");
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

const isTransientFetchError = (error: unknown) => {
  if (!error) {
    return false;
  }

  const message =
    typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
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
      // Continue to fiscaldata API fallback before snapshot fallback.
    }

    try {
      return await fetchTreasuryFromFiscalDataApi(fetcher, fetched_at);
    } catch {
      // If all live sources fail, preserve the primary FRED failure reason for clearer diagnostics.
    }

    if (options.snapshotFallback) {
      const message = formatFetchError(error);
      return buildFallbackSnapshot(options.snapshotFallback, message);
    }

    const message = formatFetchError(error);
    throw new Error(message);
  }
};
