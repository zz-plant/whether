import assert from "node:assert/strict";
import { describe, it, beforeEach } from "bun:test";
import {
  FredResponseError,
  fetchFredCsv,
  isRetryableFredError,
  resetFredCircuitBreaker,
  getFredCircuitBreakerState,
  withRetry,
} from "../lib/fred";

const buildFredCsv = (rows: string[]) => `DATE,VALUE\n${rows.join("\n")}\n`;

const FRED_CSV = buildFredCsv(["2024-01-01,4.00", "2024-01-02,4.01"]);

describe("fetchFredCsv", () => {
  beforeEach(() => {
    resetFredCircuitBreaker();
  });

  it("succeeds on FRED", async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      return new Response(FRED_CSV, { status: 200 });
    }) as typeof fetch;

    await fetchFredCsv(fetcher, "DGS10", { backoffMs: 0 });
    assert.ok(
      !calls.some((u) => u.includes("alfred.stlouisfed.org")),
      "Should not have called ALFRED URL",
    );
  });

  it("throws when FRED fails", async () => {
    const fetcher: typeof fetch = (async () =>
      new Response("error", { status: 500 })) as typeof fetch;

    await assert.rejects(
      fetchFredCsv(fetcher, "DGS10", { backoffMs: 0 }),
      /FRED request failed/,
    );
  });
});

describe("fetchFredCsv — circuit breaker", () => {
  beforeEach(() => {
    resetFredCircuitBreaker();
  });

  it("circuit opens after 3 consecutive failures", async () => {
    const fetcher: typeof fetch = (async () => {
      throw new Error("network error");
    }) as typeof fetch;

    for (let i = 0; i < 3; i++) {
      await assert.rejects(fetchFredCsv(fetcher, "DGS10", { backoffMs: 0 }));
    }

    assert.equal(getFredCircuitBreakerState().open, true);
  });

  it("circuit breaker throws immediately when open", async () => {
    let callCount = 0;
    const fetcher: typeof fetch = (async () => {
      callCount += 1;
      throw new Error("network error");
    }) as typeof fetch;

    for (let i = 0; i < 3; i++) {
      await assert.rejects(fetchFredCsv(fetcher, "DGS10", { backoffMs: 0 }));
    }

    const callsBefore = callCount;
    await assert.rejects(
      fetchFredCsv(fetcher, "DGS10", { backoffMs: 0 }),
      /circuit breaker open/i,
    );
    assert.equal(
      callCount,
      callsBefore,
      "Fetcher should not have been called when circuit is open",
    );
  });

  it("successful fetch resets circuit breaker", async () => {
    const failingFetcher: typeof fetch = (async () => {
      throw new Error("network error");
    }) as typeof fetch;

    for (let i = 0; i < 2; i++) {
      await assert.rejects(
        fetchFredCsv(failingFetcher, "DGS10", { backoffMs: 0 }),
      );
    }

    assert.equal(getFredCircuitBreakerState().consecutiveFailures, 2);

    const successFetcher: typeof fetch = (async () =>
      new Response(FRED_CSV, { status: 200 })) as typeof fetch;

    await fetchFredCsv(successFetcher, "DGS10", { backoffMs: 0 });

    assert.equal(getFredCircuitBreakerState().open, false);
    assert.equal(getFredCircuitBreakerState().consecutiveFailures, 0);
  });

  // Limitation: "circuit breaker allows probe after cooldown" cannot be
  // tested without mocking Date.now() — cooldown is 60s. After cooldown
  // expires, fetchFredCsv should attempt a probe fetch instead of throwing
  // "circuit breaker open" immediately.
});

describe("fetchFredCsv — retry policy", () => {
  beforeEach(() => {
    resetFredCircuitBreaker();
  });

  it("retries a server fault, which could answer differently next time", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response("upstream fault", { status: 503 });
    };

    await assert.rejects(fetchFredCsv(fetcher, "DGS10", { backoffMs: 0 }));
    assert.equal(calls, 3, "503 should exhaust the attempt budget");
  });

  it("does not retry a request FRED actively rejected", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response("no such series", { status: 404 });
    };

    await assert.rejects(
      fetchFredCsv(fetcher, "NOT_A_SERIES", { backoffMs: 0 }),
      /HTTP 404/,
    );
    assert.equal(calls, 1, "a rejected request fails identically every time");
  });

  it("classifies retryable and non-retryable failures", () => {
    assert.equal(isRetryableFredError(new FredResponseError("DGS10", 500)), true);
    assert.equal(isRetryableFredError(new FredResponseError("DGS10", 429)), true);
    assert.equal(isRetryableFredError(new FredResponseError("DGS10", 408)), true);
    assert.equal(isRetryableFredError(new FredResponseError("DGS10", 404)), false);
    assert.equal(isRetryableFredError(new FredResponseError("DGS10", 400)), false);
    // Transport faults carry no status and stay retryable.
    assert.equal(isRetryableFredError(new Error("fetch failed")), true);
  });
});

describe("withRetry — budget", () => {
  // A clock we control, so the budget is asserted rather than slept through.
  const fakeClock = (steps: number[]) => {
    let index = 0;
    return () => steps[Math.min(index++, steps.length - 1)] ?? 0;
  };

  it("stops once the budget is spent instead of starting a doomed attempt", async () => {
    let calls = 0;
    // start=0, then attempt 0 is measured as having consumed the whole budget.
    const now = fakeClock([0, 0, 9_000, 9_000, 9_000]);

    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("timed out");
        },
        { attempts: 3, backoffMs: 0, budgetMs: 9_000, now },
      ),
      /timed out/,
    );

    assert.equal(calls, 1, "a second attempt cannot fit inside the budget");
  });

  it("hands each attempt only the time the budget has left", async () => {
    const seen: number[] = [];
    const now = fakeClock([0, 0, 1_000, 1_000, 1_000]);

    await assert.rejects(
      withRetry(
        async (remainingMs) => {
          seen.push(remainingMs);
          throw new Error("boom");
        },
        { attempts: 2, backoffMs: 0, budgetMs: 9_000, now },
      ),
    );

    assert.deepEqual(seen, [9_000, 8_000]);
  });

  it("keeps retrying while the budget still funds an attempt", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("transient");
        return "ok";
      },
      { attempts: 3, backoffMs: 0, budgetMs: 9_000 },
    );

    assert.equal(result, "ok");
    assert.equal(calls, 3);
  });

  it("abandons a failure that a retry cannot change", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new FredResponseError("DGS10", 400);
        },
        { attempts: 3, backoffMs: 0, budgetMs: 9_000 },
      ),
      /HTTP 400/,
    );

    assert.equal(calls, 1);
  });
});
