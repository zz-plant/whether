import { requestUrl } from "./fixtures/requestTarget";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "bun:test";
import {
  FRED_API_BASE_URL,
  FRED_BASE_URL,
  FredResponseError,
  FredVintageUnavailableError,
  fetchFredApiRows,
  fetchFredCsv,
  fetchFredRows,
  isRetryableFredError,
  resetFredCircuitBreaker,
  resolveFredApiKey,
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
      const url = requestUrl(input);
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

describe("fetchFredRows — API path", () => {
  beforeEach(() => {
    resetFredCircuitBreaker();
  });

  const API_BODY = JSON.stringify({
    realtime_start: "2024-01-05",
    realtime_end: "2024-01-05",
    observations: [
      { realtime_start: "2024-01-02", realtime_end: "9999-12-31", date: "2024-01-01", value: "4.00" },
      { realtime_start: "2024-01-03", realtime_end: "9999-12-31", date: "2024-01-02", value: "." },
      { realtime_start: "2024-01-04", realtime_end: "9999-12-31", date: "2024-01-03", value: "4.02" },
    ],
  });

  const recordingFetcher = (respond: (url: string) => Response, calls: string[]): typeof fetch =>
    async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push(url);
      return respond(url);
    };

  it("stays on the CSV export when no key is configured", async () => {
    const calls: string[] = [];
    const rows = await fetchFredRows(recordingFetcher(() => new Response(FRED_CSV), calls), "DGS10", {
      apiKey: null,
      backoffMs: 0,
    });

    assert.equal(calls.length, 1);
    assert.ok(calls[0].startsWith(FRED_BASE_URL), "no key means the CSV export");
    assert.equal(rows.length, 2);
  });

  it("asks the API for JSON with the key and the lookback window when a key is given", async () => {
    const calls: string[] = [];
    const rows = await fetchFredRows(recordingFetcher(() => new Response(API_BODY), calls), "DGS10", {
      apiKey: "abc123",
      lookbackDays: 30,
      backoffMs: 0,
    });

    const url = new URL(calls[0]);
    assert.equal(`${url.origin}${url.pathname}`, FRED_API_BASE_URL);
    assert.equal(url.searchParams.get("series_id"), "DGS10");
    assert.equal(url.searchParams.get("api_key"), "abc123");
    assert.equal(url.searchParams.get("file_type"), "json");
    assert.match(url.searchParams.get("observation_start") ?? "", /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(url.searchParams.get("realtime_start"), null, "no vintage unless asked");
    // The missing value "." is dropped, as the CSV parser drops it.
    assert.deepEqual(rows, [
      { date: "2024-01-01", value: 4 },
      { date: "2024-01-03", value: 4.02 },
    ]);
  });

  it("pins a vintage with realtime_start and realtime_end", async () => {
    const calls: string[] = [];
    await fetchFredRows(recordingFetcher(() => new Response(API_BODY), calls), "UNRATE", {
      apiKey: "abc123",
      asOf: "2024-03-31",
      backoffMs: 0,
    });

    const url = new URL(calls[0]);
    assert.equal(url.searchParams.get("realtime_start"), "2024-03-31");
    assert.equal(url.searchParams.get("realtime_end"), "2024-03-31");
  });

  it("refuses a vintage request without a key rather than returning today's revision", async () => {
    const calls: string[] = [];
    await assert.rejects(
      fetchFredRows(recordingFetcher(() => new Response(FRED_CSV), calls), "UNRATE", { apiKey: null, asOf: "2024-03-31" }),
      FredVintageUnavailableError,
    );
    assert.equal(calls.length, 0, "nothing was fetched");
  });

  it("falls back to the CSV export when the API rejects the key, and never repeats the key", async () => {
    const calls: string[] = [];
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };

    try {
      const rows = await fetchFredRows(
        recordingFetcher(
          (url) =>
            url.startsWith(FRED_API_BASE_URL)
              ? new Response(JSON.stringify({ error_code: 400, error_message: "Bad Request. The value for variable api_key is not registered." }), { status: 400 })
              : new Response(FRED_CSV),
          calls,
        ),
        "DGS10",
        { apiKey: "secret-key-123", backoffMs: 0 },
      );

      assert.equal(rows.length, 2, "served from the CSV export");
      assert.ok(calls.some((url) => url.startsWith(FRED_API_BASE_URL)), "the API was tried first");
      assert.ok(calls.some((url) => url.startsWith(FRED_BASE_URL)), "then the CSV export");
      assert.equal(warnings.length, 1, "one warning names the fallback");
      assert.ok(!warnings[0].includes("secret-key-123"), "the key does not appear in the warning");
    } finally {
      console.warn = originalWarn;
    }
  });

  it("keeps the breaker closed while keyed reads fall back concurrently, so every fallback runs", async () => {
    // Six families ingest at once. A revoked key fails all six API attempts together; before
    // the fix the third failure opened the shared breaker and the remaining CSV fallbacks
    // threw "circuit breaker open" without a request.
    const calls: string[] = [];
    const fetcher = recordingFetcher(
      (url) =>
        url.startsWith(FRED_API_BASE_URL)
          ? new Response(JSON.stringify({ error_code: 400, error_message: "Bad Request. The value for variable api_key is not registered." }), { status: 400 })
          : new Response(FRED_CSV),
      calls,
    );
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      const results = await Promise.all(
        ["DGS10", "BAA10Y", "UNRATE", "CPIAUCSL", "NFCI", "VIXCLS"].map((series) =>
          fetchFredRows(fetcher, series, { apiKey: "revoked", backoffMs: 0 }),
        ),
      );
      assert.ok(results.every((rows) => rows.length === 2), "every series was served from the CSV export");
      assert.equal(calls.filter((url) => url.startsWith(FRED_BASE_URL)).length, 6, "every fallback made its request");
      assert.equal(getFredCircuitBreakerState().open, false);
      assert.equal(getFredCircuitBreakerState().consecutiveFailures, 0, "API failures with a fallback behind them do not count");
    } finally {
      console.warn = originalWarn;
    }
  });

  it("counts an API failure against the breaker when nothing can fall back", async () => {
    const fetcher = recordingFetcher(() => new Response("down", { status: 503 }), []);
    await assert.rejects(fetchFredApiRows(fetcher, "DGS10", "abc123", { backoffMs: 0, attempts: 1 }));
    assert.equal(getFredCircuitBreakerState().consecutiveFailures, 1);
  });

  it("anchors a vintage's lookback window to the requested date, not today", async () => {
    const calls: string[] = [];
    await fetchFredRows(recordingFetcher(() => new Response(API_BODY), calls), "UNRATE", {
      apiKey: "abc123",
      asOf: "2024-03-31",
      lookbackDays: 90,
      backoffMs: 0,
    });

    const url = new URL(calls[0]);
    assert.equal(url.searchParams.get("observation_start"), "2024-01-01", "ninety days before the vintage date");
    assert.equal(url.searchParams.get("realtime_start"), "2024-03-31");
  });

  it("does not fall back for a vintage: the CSV export cannot serve one", async () => {
    const calls: string[] = [];
    await assert.rejects(
      fetchFredRows(recordingFetcher(() => new Response("down", { status: 503 }), calls), "DGS10", {
        apiKey: "abc123",
        asOf: "2024-03-31",
        backoffMs: 0,
        attempts: 1,
      }),
      FredResponseError,
    );
    assert.ok(calls.every((url) => url.startsWith(FRED_API_BASE_URL)), "the CSV export was never tried");
  });

  it("redacts the key from any error it throws", async () => {
    const fetcher: typeof fetch = async (input) => {
      throw new Error(`connect failed for ${typeof input === "string" ? input : input instanceof URL ? input.href : input.url}`);
    };

    await assert.rejects(
      fetchFredApiRows(fetcher, "DGS10", "topsecret", { backoffMs: 0, attempts: 1 }),
      (error: unknown) =>
        error instanceof Error && !error.message.includes("topsecret") && error.message.includes("api_key=REDACTED"),
    );
  });

  it("resolves the key from the Worker binding before the environment", () => {
    const previous = process.env.FRED_API_KEY;
    delete process.env.FRED_API_KEY;
    try {
      assert.equal(resolveFredApiKey(), null);

      process.env.FRED_API_KEY = "from-env";
      assert.equal(resolveFredApiKey(), "from-env");

      Object.assign(globalThis, { FRED_API_KEY: " from-binding " });
      assert.equal(resolveFredApiKey(), "from-binding", "the binding wins and is trimmed");
    } finally {
      Reflect.deleteProperty(globalThis, "FRED_API_KEY");
      if (previous === undefined) {
        delete process.env.FRED_API_KEY;
      } else {
        process.env.FRED_API_KEY = previous;
      }
    }
  });
});
