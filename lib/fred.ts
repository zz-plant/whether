import { fetchWithTimeout } from "./fetchWithTimeout";
import { createCircuitBreaker, isTestRuntime, withRetry } from "./runtime/retry";
import { readSetting } from "./runtime/settings";

export const FRED_BASE_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv";

const FRED_FETCH_HEADERS = {
  accept: "text/csv,application/csv;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "user-agent": "WhetherDataBot/1.0 (+https://whether.work)",
} as const;

/**
 * The FRED API proper, as opposed to the chart export above. It needs a free key, answers
 * JSON, allows 120 requests a minute per key, and — the reason it matters here — can return
 * a series as it was known on a past date (ALFRED vintages via realtime_start/realtime_end),
 * which the CSV export cannot. Docs: https://fred.stlouisfed.org/docs/api/fred/
 */
export const FRED_API_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";

const FRED_API_HEADERS = {
  accept: "application/json",
  "user-agent": FRED_FETCH_HEADERS["user-agent"],
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * The key is a Worker secret (`wrangler secret put FRED_API_KEY`), installed on globalThis
 * by worker/index.ts like every other binding, or an environment variable for scripts and
 * local runs. With no key, every read stays on the CSV path it has always used.
 */
export const resolveFredApiKey = (): string | null => readSetting("FRED_API_KEY");

/** A key must never travel in an error message or a log line. */
const redactFredApiKey = (text: string) => text.replace(/api_key=[^&\s"']+/g, "api_key=REDACTED");

/** Thrown when a caller asks for a vintage and only the CSV export is available. */
export class FredVintageUnavailableError extends Error {
  constructor(seriesId: string) {
    super(
      `FRED vintage data for ${seriesId} needs the FRED API (set FRED_API_KEY); ` +
        "the CSV export only serves the current revision",
    );
    this.name = "FredVintageUnavailableError";
  }
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_REVALIDATE_SECONDS = 900;
const DEFAULT_RETRY_ATTEMPTS = 3;
// Backoff spaces out retries against a real upstream; zero under the suite (see isTestRuntime).
const DEFAULT_RETRY_BACKOFF_MS = isTestRuntime() ? 0 : 500;

/**
 * Wall-clock ceiling for every attempt of one series fetch combined.
 *
 * Report assembly runs under `withDeadline(10s)` (lib/report/reportData.ts), and
 * that deadline is documented as sized against upstream fetches "individually
 * capped at 8s". Retrying does not get free time on top of that: `withDeadline`
 * abandons work rather than cancelling it, so an attempt that begins after the
 * deadline has fired keeps holding the isolate and its subrequest quota to
 * produce a value no caller can still read. Bounding the whole sequence keeps
 * the retry budget inside the deadline that governs it, and leaves headroom for
 * the fallback path to actually run.
 */
const DEFAULT_RETRY_BUDGET_MS = 9_000;

const fredCircuitBreaker = createCircuitBreaker({ name: "FRED", threshold: 3, cooldownMs: 120_000 });

export const getFredCircuitBreakerState = () => fredCircuitBreaker.state();

export const resetFredCircuitBreaker = () => fredCircuitBreaker.reset();

/**
 * Thrown when FRED answers with a status we did not accept. Carries the status so
 * the retry policy can tell "try again" apart from "this will fail identically".
 */
export class FredResponseError extends Error {
  readonly status: number;

  constructor(seriesId: string, status: number) {
    super(`FRED request failed for ${seriesId} (HTTP ${status})`);
    this.name = "FredResponseError";
    this.status = status;
  }
}

/**
 * A retry is only worth its latency when the same request could plausibly answer
 * differently. Transport faults, timeouts, and server-side failures qualify; a
 * request FRED actively rejected (unknown series id, malformed range) will be
 * rejected identically every time, and retrying it only spends the budget that
 * the genuinely transient case needs.
 */
export const isRetryableFredError = (error: unknown): boolean => {
  if (error instanceof FredResponseError) {
    return error.status >= 500 || error.status === 408 || error.status === 429;
  }

  // Transport-level failures (aborts, DNS, resets) surface as plain errors.
  return true;
};

const buildFredSeriesUrl = (seriesId: string, observationStartDate?: string): string => {
  const base = `${FRED_BASE_URL}?id=${encodeURIComponent(seriesId)}`;
  return observationStartDate ? `${base}&cosd=${encodeURIComponent(observationStartDate)}` : base;
};

// Without `cosd`, fredgraph.csv returns the full series history (decades of daily
// rows, hundreds of KB per series). Every consumer needs a bounded window, so
// callers pass a lookback and we request only that range.
/** `anchor` is an ISO date to count back from; a vintage's window ends at its `asOf`, not today. */
const observationStartDateForLookback = (lookbackDays: number, anchor?: string): string => {
  const end = anchor ? new Date(`${anchor}T00:00:00.000Z`).getTime() : Date.now();
  const start = new Date(end - lookbackDays * 24 * 60 * 60 * 1000);
  return start.toISOString().slice(0, 10);
};

interface FetchFredCsvOptions {
  timeoutMs?: number;
  revalidateSeconds?: number;
  attempts?: number;
  backoffMs?: number;
  /** Ceiling for all attempts combined. Keep below the caller's deadline. */
  budgetMs?: number;
  /** Only request observations from this many days back. Omit for full history. */
  lookbackDays?: number;
}

/**
 * One circuit breaker and one retry budget for every FRED request this module makes, whichever
 * endpoint serves it: the breaker is about FRED being reachable, not about which URL was asked.
 *
 * `lib/treasury/treasuryClient.ts` also reads FRED's CSV export, for the yield curve, and stays
 * outside the breaker on purpose. That read has two fallbacks behind it (Treasury's own file, then
 * the bundled snapshot), so by the rule below its failures must not count; and consulting a
 * process-wide breaker before it would make every yield-curve read depend on how unrelated family
 * ingests last went.
 */
const guardedFredRequest = async <T>(
  attempt: (remainingMs: number) => Promise<T>,
  options?: FetchFredCsvOptions,
  /* An attempt that has a fallback behind it must not count against the breaker: six
     families ingesting concurrently against a revoked key would otherwise open it before
     any of their CSV fallbacks ran, and the fallback would fail without a request. */
  recordFailure = true,
): Promise<T> =>
  fredCircuitBreaker.run(
    () =>
      withRetry(attempt, {
        attempts: options?.attempts ?? DEFAULT_RETRY_ATTEMPTS,
        backoffMs: options?.backoffMs ?? DEFAULT_RETRY_BACKOFF_MS,
        budgetMs: options?.budgetMs ?? DEFAULT_RETRY_BUDGET_MS,
        isRetryable: isRetryableFredError,
        label: "FRED request",
      }),
    { recordFailure },
  );

export const fetchFredCsv = async (
  fetcher: typeof fetch,
  seriesId: string,
  options?: FetchFredCsvOptions,
): Promise<string> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const revalidateSeconds = options?.revalidateSeconds ?? DEFAULT_REVALIDATE_SECONDS;

  return guardedFredRequest(async (remainingMs) => {
    const response = await fetchWithTimeout(
      fetcher,
      buildFredSeriesUrl(
        seriesId,
        options?.lookbackDays ? observationStartDateForLookback(options.lookbackDays) : undefined,
      ),
      {
        headers: FRED_FETCH_HEADERS,
        next: { revalidate: revalidateSeconds },
      },
      // An attempt may not outlive the budget shared by the whole sequence.
      Math.min(timeoutMs, remainingMs),
    );

    if (!response.ok) {
      throw new FredResponseError(seriesId, response.status);
    }

    return response.text();
  }, options);
};

type FredRow = { date: string; value: number };

interface FredApiUrlOptions {
  observationStart?: string;
  /** ISO date. Return the series as it was known on that date (an ALFRED vintage). */
  asOf?: string;
}

const buildFredApiUrl = (seriesId: string, apiKey: string, options: FredApiUrlOptions = {}): string => {
  const url = new URL(FRED_API_BASE_URL);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  if (options.observationStart) {
    url.searchParams.set("observation_start", options.observationStart);
  }
  if (options.asOf) {
    url.searchParams.set("realtime_start", options.asOf);
    url.searchParams.set("realtime_end", options.asOf);
  }
  return url.toString();
};

/**
 * Whether a raw FRED observation is a missing value.
 *
 * The API marks one with ".", and the CSV export used to as well, but the
 * export now leaves the field empty — and `Number("")` is 0, a finite number
 * that a parser guarding only against "." accepts as a real print. That is how
 * seven month-end Treasury records and some 160 holiday VIX closes were zeros
 * in the shipped archives until 2026-09-14. Route every FRED value through
 * this before converting it.
 */
export const isMissingFredValue = (raw: string | undefined): boolean => {
  const trimmed = raw?.trim() ?? "";
  return trimmed === "" || trimmed === ".";
};

/** The API's JSON body, reduced to the same rows the CSV parser produces. Missing values are "." (`isMissingFredValue`). */
export const parseFredApiObservations = (payload: unknown): FredRow[] => {
  if (!isRecord(payload)) {
    throw new Error("FRED API returned no observations payload");
  }
  const observations = payload.observations;
  if (!Array.isArray(observations)) {
    const message = payload.error_message;
    throw new Error(
      typeof message === "string" ? `FRED API error: ${redactFredApiKey(message)}` : "FRED API returned no observations array",
    );
  }
  return observations.flatMap((entry): FredRow[] => {
    if (!isRecord(entry)) return [];
    const { date, value } = entry;
    if (typeof date !== "string" || typeof value !== "string" || isMissingFredValue(value)) return [];
    const parsed = Number(value);
    return Number.isFinite(parsed) ? [{ date, value: parsed }] : [];
  });
};

interface FetchFredRowsOptions extends FetchFredCsvOptions {
  /** ISO date: observations as known on that date. Needs the API; the CSV export cannot serve it. */
  asOf?: string;
  /** Overrides key resolution. `null` forces the CSV path; omit to read the binding or env. */
  apiKey?: string | null;
}

const redactError = (error: unknown) => {
  if (error instanceof Error) {
    error.message = redactFredApiKey(error.message);
  }
  return error;
};

const fetchFredApiRowsGuarded = async (
  fetcher: typeof fetch,
  seriesId: string,
  apiKey: string,
  options: FetchFredRowsOptions | undefined,
  recordFailure: boolean,
): Promise<FredRow[]> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const revalidateSeconds = options?.revalidateSeconds ?? DEFAULT_REVALIDATE_SECONDS;

  try {
    return await guardedFredRequest(async (remainingMs) => {
      const response = await fetchWithTimeout(
        fetcher,
        buildFredApiUrl(seriesId, apiKey, {
          // A vintage's window counts back from its own date, not from today.
          observationStart: options?.lookbackDays ? observationStartDateForLookback(options.lookbackDays, options.asOf) : undefined,
          asOf: options?.asOf,
        }),
        { headers: FRED_API_HEADERS, next: { revalidate: revalidateSeconds } },
        Math.min(timeoutMs, remainingMs),
      );

      if (!response.ok) {
        throw new FredResponseError(seriesId, response.status);
      }

      return parseFredApiObservations(await response.json());
    }, options, recordFailure);
  } catch (error) {
    throw redactError(error);
  }
};

export const fetchFredApiRows = (
  fetcher: typeof fetch,
  seriesId: string,
  apiKey: string,
  options?: FetchFredRowsOptions,
): Promise<FredRow[]> => fetchFredApiRowsGuarded(fetcher, seriesId, apiKey, options, true);

/**
 * Observations for a series, from the API when a key is configured and from the CSV export
 * otherwise. An API failure falls back to the CSV export so a revoked key degrades to the
 * path the site ran on for years — except for a vintage request, which only the API can
 * answer and which must fail rather than quietly return today's revision.
 */
export const fetchFredRows = async (
  fetcher: typeof fetch,
  seriesId: string,
  options?: FetchFredRowsOptions,
): Promise<FredRow[]> => {
  const apiKey = options?.apiKey === undefined ? resolveFredApiKey() : options.apiKey;

  if (options?.asOf && !apiKey) {
    throw new FredVintageUnavailableError(seriesId);
  }

  if (apiKey) {
    // With a CSV fallback behind it, an API failure is not yet a FRED failure: it must not
    // open the breaker that the fallback is about to check.
    const hasFallback = !options?.asOf;
    try {
      return await fetchFredApiRowsGuarded(fetcher, seriesId, apiKey, options, !hasFallback);
    } catch (error) {
      if (!hasFallback) {
        throw error;
      }
      console.warn(
        `[fred] API request failed for ${seriesId}; using the CSV export instead:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return parseFredCsvRows(await fetchFredCsv(fetcher, seriesId, options));
};

/** One CSV field: a finite number, or null for a missing observation or anything else. */
const parseFredCsvValue = (raw: string | undefined): number | null => {
  if (isMissingFredValue(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const parseFredCsvRows = (csv: string): { date: string; value: number }[] =>
  csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .flatMap((row) => {
      const parts = row.split(",");
      const value = parts.length >= 2 ? parseFredCsvValue(parts[1]) : null;
      return value === null ? [] : [{ date: parts[0] ?? "", value }];
    });

/**
 * Every row of a CSV export as date to value, in file order, with a missing observation kept as
 * null rather than dropped: a caller aligning several series on a common date needs to see the
 * dates one of them skipped.
 */
export const parseFredCsvSeries = (csv: string): Map<string, number | null> => {
  const values = new Map<string, number | null>();
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (!header) return values;
  for (const row of rows) {
    const [date, raw] = row.split(",");
    if (date) values.set(date, parseFredCsvValue(raw));
  }
  return values;
};

export const latestFredObservation = (rows: FredRow[], seriesId?: string): { observedAt: string; value: number } => {
  const latest = rows[rows.length - 1];

  if (!latest) {
    throw new Error(seriesId ? `No FRED rows found for ${seriesId}` : "No FRED rows found");
  }

  return {
    observedAt: `${latest.date}T00:00:00.000Z`,
    value: latest.value,
  };
};

const YEAR_OVER_YEAR_PERCENT_MULTIPLIER = 100;

export const computeYearOverYearPoints = (
  rows: { date: string; value: number }[],
  seriesId?: string,
): { date: string; value: number }[] => {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const valueByDate = new Map(sorted.map((point) => [point.date, point.value]));
  const result = sorted.flatMap((point) => {
    const pointDate = new Date(point.date + "T00:00:00.000Z");
    if (Number.isNaN(pointDate.getTime())) return [];
    const priorYear = new Date(pointDate);
    priorYear.setUTCFullYear(priorYear.getUTCFullYear() - 1);
    const priorKey = priorYear.toISOString().slice(0, 10);
    const priorValue = valueByDate.get(priorKey);
    if (priorValue === undefined || priorValue === 0) return [];
    return [{
      date: point.date,
      value: ((point.value - priorValue) / priorValue) * YEAR_OVER_YEAR_PERCENT_MULTIPLIER,
    }];
  });
  if (result.length === 0) {
    throw new Error(`No YoY rows for ${seriesId ?? "unknown series"}`);
  }
  return result;
};

export const computeLatestYearOverYear = (
  rows: { date: string; value: number }[],
  seriesId?: string,
): { observedAt: string; value: number } => {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];

  if (!latest) {
    throw new Error(`No FRED rows for ${seriesId ?? "unknown series"}`);
  }

  const latestDate = new Date(latest.date + "T00:00:00.000Z");
  const priorYear = new Date(latestDate);
  priorYear.setUTCFullYear(priorYear.getUTCFullYear() - 1);
  const priorKey = priorYear.toISOString().slice(0, 10);
  const priorPoint = sorted.find((r) => r.date === priorKey);

  if (!priorPoint || priorPoint.value === 0) {
    throw new Error(`No prior year FRED row for ${seriesId ?? "unknown series"}`);
  }

  return {
    observedAt: `${latest.date}T00:00:00.000Z`,
    value: ((latest.value - priorPoint.value) / priorPoint.value) * YEAR_OVER_YEAR_PERCENT_MULTIPLIER,
  };
};
