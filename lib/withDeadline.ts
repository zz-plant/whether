export class DeadlineExceededError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`[deadline:${label}] exceeded ${timeoutMs}ms`);
    this.name = "DeadlineExceededError";
  }
}

/**
 * Rejects if `work` has not settled within `timeoutMs`.
 *
 * Error handling across the report path is built on try/catch, which only fires when a
 * dependency rejects. Real outages are frequently slow rather than loud — a KV namespace
 * that has grown, or an upstream that accepts the connection and never answers — and in
 * those cases every fallback in the system waits forever alongside the caller. Putting a
 * wall-clock bound on the work makes latency failures land in the same well-tested branch
 * as thrown ones.
 *
 * The underlying promise is not cancelled (promises are not cancellable); it is abandoned.
 * Callers that own a cancellable resource should also pass an AbortSignal.
 */
export const withDeadline = async <T>(
  work: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new DeadlineExceededError(label, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    // Keep an abandoned rejection from surfacing as an unhandled rejection.
    void work.catch(() => undefined);
  }
};
