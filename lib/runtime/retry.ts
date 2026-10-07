/**
 * Retry, backoff and circuit breaking for upstream reads. The policy (attempts, which
 * failures are worth another, how long to wait) stays with each caller; the mechanism
 * lives here once. docs/agents/lessons/runtime-helpers.md.
 */

/** Under `bun test` every upstream is a stub that fails at once, so callers zero their backoff. */
export const isTestRuntime = (): boolean =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";

const pause = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

interface RetryOptions {
  attempts: number;
  /** Linear backoff: the wait after attempt `n` (from 0) is `backoffMs * (n + 1)`. */
  backoffMs: number;
  /** Ceiling for all attempts combined, including backoff. Unbounded when omitted. */
  budgetMs?: number;
  /** Whether a failure could answer differently next time. Every failure is, when omitted. */
  isRetryable?: (error: unknown) => boolean;
  now?: () => number;
  /** Names the work in the error thrown when the budget allowed no attempt at all. */
  label?: string;
}

/**
 * Runs `fn` with bounded retries, handing it the time still left in the budget (so the work it
 * starts cannot outlive the sequence it belongs to) and the attempt's index.
 */
export const withRetry = async <T>(
  fn: (remainingMs: number, attempt: number) => Promise<T>,
  { attempts, backoffMs, budgetMs = Number.POSITIVE_INFINITY, isRetryable = () => true, now = Date.now, label = "request" }: RetryOptions,
): Promise<T> => {
  const startedAt = now();
  const elapsed = () => now() - startedAt;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const remainingMs = budgetMs - elapsed();
    if (remainingMs <= 0) {
      break;
    }

    try {
      return await fn(remainingMs, attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts - 1 || !isRetryable(error)) {
        break;
      }

      // Only sleep when the budget can still fund an attempt afterwards.
      const backoff = backoffMs * (attempt + 1);
      if (elapsed() + backoff >= budgetMs) {
        break;
      }

      await pause(backoff);
    }
  }

  throw lastError ?? new Error(`${label} failed before any attempt was made`);
};

/**
 * Stops calling an upstream that has failed `threshold` times in a row, for `cooldownMs` after
 * the latest failure; the first call after the cooldown is a probe, and a success closes it.
 */
export const createCircuitBreaker = ({ name, threshold, cooldownMs }: { name: string; threshold: number; cooldownMs: number }) => {
  let consecutiveFailures = 0;
  let lastFailureAt: number | null = null;

  return {
    state: () => ({
      open: consecutiveFailures >= threshold,
      consecutiveFailures,
      lastFailureAt: lastFailureAt === null ? null : new Date(lastFailureAt).toISOString(),
    }),

    reset: () => {
      consecutiveFailures = 0;
      lastFailureAt = null;
    },

    /**
     * Runs `work` unless the breaker is open and cooling down. `recordFailure: false` is for an
     * attempt with a fallback behind it, whose failure is not yet the upstream's.
     */
    run: async <T>(work: () => Promise<T>, { recordFailure = true }: { recordFailure?: boolean } = {}): Promise<T> => {
      if (consecutiveFailures >= threshold && lastFailureAt !== null && Date.now() - lastFailureAt < cooldownMs) {
        throw new Error(`${name} circuit breaker open`);
      }

      try {
        const result = await work();
        consecutiveFailures = 0;
        lastFailureAt = null;
        return result;
      } catch (error) {
        if (recordFailure) {
          consecutiveFailures += 1;
          lastFailureAt = Date.now();
        }
        throw error;
      }
    },
  };
};
