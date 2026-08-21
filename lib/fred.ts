import { fetchWithTimeout } from "./fetchWithTimeout";

export const FRED_BASE_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv";

export const FRED_FETCH_HEADERS = {
  accept: "text/csv,application/csv;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "user-agent": "WhetherDataBot/1.0 (+https://whether.app)",
} as const;

const isTestRuntime = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_REVALIDATE_SECONDS = 900;
const DEFAULT_RETRY_ATTEMPTS = 3;
// Backoff spaces out retries against a real upstream. Under `bun test` every
// upstream is a stub that fails instantly, so the sleep adds pure wall clock to
// the suite without exercising anything — the retry path itself still runs.
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

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 120_000;

let cbConsecutiveFailures = 0;
let cbLastFailureAt: number | null = null;

export const getFredCircuitBreakerState = () => {
  const open = cbConsecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD;
  return {
    open,
    consecutiveFailures: cbConsecutiveFailures,
    lastFailureAt: cbLastFailureAt === null ? null : new Date(cbLastFailureAt).toISOString(),
  };
};

export const resetFredCircuitBreaker = () => {
  cbConsecutiveFailures = 0;
  cbLastFailureAt = null;
};

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

export interface RetryOptions {
  attempts?: number;
  backoffMs?: number;
  /** Ceiling for all attempts combined, including backoff. */
  budgetMs?: number;
  isRetryable?: (error: unknown) => boolean;
  now?: () => number;
}

const pause = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

/**
 * Runs `fn` with bounded retries, handing it the time still left in the budget so
 * the work it starts cannot outlive the sequence it belongs to.
 */
export const withRetry = async <T>(
  fn: (remainingMs: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const attempts = options.attempts ?? DEFAULT_RETRY_ATTEMPTS;
  const backoffMs = options.backoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
  const budgetMs = options.budgetMs ?? DEFAULT_RETRY_BUDGET_MS;
  const isRetryable = options.isRetryable ?? isRetryableFredError;
  const now = options.now ?? Date.now;

  const startedAt = now();
  const elapsed = () => now() - startedAt;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const remainingMs = budgetMs - elapsed();
    if (remainingMs <= 0) {
      break;
    }

    try {
      return await fn(remainingMs);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts - 1 || !isRetryable(error)) {
        break;
      }

      // Only sleep when the budget can still fund an attempt afterwards;
      // otherwise the backoff is pure delay in front of a guaranteed failure.
      const backoff = backoffMs * (attempt + 1);
      if (elapsed() + backoff >= budgetMs) {
        break;
      }

      await pause(backoff);
    }
  }

  throw lastError ?? new Error("FRED request failed before any attempt was made");
};

export const buildFredSeriesUrl = (seriesId: string, observationStartDate?: string): string => {
  const base = `${FRED_BASE_URL}?id=${encodeURIComponent(seriesId)}`;
  return observationStartDate ? `${base}&cosd=${encodeURIComponent(observationStartDate)}` : base;
};

// Without `cosd`, fredgraph.csv returns the full series history (decades of daily
// rows, hundreds of KB per series). Every consumer needs a bounded window, so
// callers pass a lookback and we request only that range.
export const observationStartDateForLookback = (lookbackDays: number): string => {
  const start = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  return start.toISOString().slice(0, 10);
};

export interface FetchFredCsvOptions {
  timeoutMs?: number;
  revalidateSeconds?: number;
  attempts?: number;
  backoffMs?: number;
  /** Ceiling for all attempts combined. Keep below the caller's deadline. */
  budgetMs?: number;
  /** Only request observations from this many days back. Omit for full history. */
  lookbackDays?: number;
}

export const fetchFredCsv = async (
  fetcher: typeof fetch,
  seriesId: string,
  options?: FetchFredCsvOptions,
): Promise<string> => {
  if (cbConsecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    const withinCooldown =
      cbLastFailureAt !== null && Date.now() - cbLastFailureAt < CIRCUIT_BREAKER_COOLDOWN_MS;
    if (withinCooldown) {
      throw new Error("FRED circuit breaker open");
    }
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const revalidateSeconds = options?.revalidateSeconds ?? DEFAULT_REVALIDATE_SECONDS;

  try {
    const result = await withRetry(
      async (remainingMs) => {
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
      },
      {
        attempts: options?.attempts,
        backoffMs: options?.backoffMs,
        budgetMs: options?.budgetMs,
      },
    );

    cbConsecutiveFailures = 0;
    cbLastFailureAt = null;
    return result;
  } catch (error) {
    cbConsecutiveFailures += 1;
    cbLastFailureAt = Date.now();
    throw error;
  }
};

export const parseFredCsvRows = (csv: string): { date: string; value: number }[] =>
  csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.split(","))
    .filter((parts) => parts.length >= 2 && parts[1] !== "." && !Number.isNaN(Number(parts[1])))
    .map((parts) => ({
      date: parts[0] ?? "",
      value: Number(parts[1]),
    }))
    .filter((point) => Number.isFinite(point.value));

export const findLatestFredRow = (csv: string): { observedAt: string; value: number } => {
  const rows = parseFredCsvRows(csv);
  const latest = rows[rows.length - 1];

  if (!latest) {
    throw new Error("No FRED rows found");
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
