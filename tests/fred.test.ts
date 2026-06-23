import assert from "node:assert/strict";
import { describe, it, beforeEach } from "bun:test";
import {
  fetchFredCsv,
  resetFredCircuitBreaker,
  getFredCircuitBreakerState,
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
