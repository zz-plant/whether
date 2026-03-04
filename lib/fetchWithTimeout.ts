const DEFAULT_FETCH_TIMEOUT_MS = 8_000;

export const fetchWithTimeout = async (
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const upstreamSignal = init?.signal;
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort((upstreamSignal as AbortSignal).reason);
    } else {
      upstreamSignal.addEventListener(
        "abort",
        () => controller.abort((upstreamSignal as AbortSignal).reason),
        { once: true },
      );
    }
  }

  try {
    return await fetcher(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};
