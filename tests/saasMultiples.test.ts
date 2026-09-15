import assert from "node:assert/strict";
import { afterEach, describe, it, mock, spyOn } from "bun:test";
import {
  QuoteSourceUnavailableError,
  fetchAlphaVantageValuation,
  fetchQuote,
  fetchSaaSValuations,
  resolveMarketDataProvider,
  SAAS_BASKET,
} from "../lib/saasMultiples";

const stubFetch = (handler: (url: string) => Response) => {
  spyOn(globalThis, "fetch").mockImplementation(async (input) => handler(input.toString()));
};

const quoteBody = (revenue: number, growth: number) =>
  JSON.stringify({
    quoteSummary: {
      result: [
        {
          price: { regularMarketPrice: 100 },
          defaultKeyStatistics: { sharesOutstanding: 1_000_000 },
          financialData: { totalRevenue: revenue, revenueGrowth: growth, totalDebt: 0, totalCash: 0 },
        },
      ],
    },
  });

afterEach(() => {
  mock.restore();
});

describe("fetchQuote", () => {
  it("separates a refused source from an unknown ticker", async () => {
    // Yahoo answers 429 to unauthenticated callers, which the old client mapped
    // to null -- the same value it used for "this company has no data".
    stubFetch(() => new Response("Edge: Too Many Requests", { status: 429 }));
    const throttled = await fetchQuote("MSFT");
    assert.equal(throttled.status, "unavailable");

    stubFetch(() => new Response("not found", { status: 404 }));
    const unknown = await fetchQuote("NOTATICKER");
    assert.equal(unknown.status, "missing");

    stubFetch(() => new Response(quoteBody(1_000_000, 0.2)));
    const found = await fetchQuote("CRM");
    assert.equal(found.status, "ok");
  });
});

describe("fetchSaaSValuations", () => {
  it("throws rather than reporting an empty basket when every quote is refused", async () => {
    stubFetch(() => new Response("Edge: Too Many Requests", { status: 429 }));

    // /api/comps answered ok:true with companyCount 0 through a total outage,
    // which reads as "these companies have no multiples".
    await assert.rejects(fetchSaaSValuations(), QuoteSourceUnavailableError);
  });

  it("reports what it did get when only some of the basket is refused", async () => {
    stubFetch((url) =>
      url.includes(`/${SAAS_BASKET[0]}?`)
        ? new Response(quoteBody(1_000_000, 0.25))
        : new Response("Edge: Too Many Requests", { status: 429 }),
    );

    const snapshot = await fetchSaaSValuations();

    assert.equal(snapshot.companyCount, 1);
    assert.equal(snapshot.medianEvToRevenue, 100);
    assert.equal(snapshot.medianRevenueGrowth, 25);
  });
});

describe("Alpha Vantage provider", () => {
  const overviewBody = (evToRevenue: string, growth: string) =>
    JSON.stringify({ Symbol: "CRM", Name: "Salesforce", EVToRevenue: evToRevenue, QuarterlyRevenueGrowthYOY: growth });

  it("reads EV/Revenue and growth straight from OVERVIEW", async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      return new Response(overviewBody("7.85", "0.11"));
    });

    const result = await fetchAlphaVantageValuation("CRM", "k3y");

    assert.deepEqual(result, { status: "ok", evToRevenue: 7.85, revenueGrowth: 0.11 });
    const url = new URL(seen[0]);
    assert.equal(url.searchParams.get("function"), "OVERVIEW");
    assert.equal(url.searchParams.get("symbol"), "CRM");
    assert.equal(url.searchParams.get("apikey"), "k3y");
  });

  it("maps the source's None to null instead of a number", async () => {
    stubFetch(() => new Response(overviewBody("None", "-")));
    const result = await fetchAlphaVantageValuation("CRM", "k3y");
    assert.deepEqual(result, { status: "ok", evToRevenue: null, revenueGrowth: null });
  });

  it("treats a rate-limit notice as the source declining, not as an empty company", async () => {
    // Alpha Vantage answers 200 with a Note when the daily allowance is spent.
    stubFetch(() => new Response(JSON.stringify({ Note: "Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day." })));
    const result = await fetchAlphaVantageValuation("CRM", "k3y");
    assert.equal(result.status, "unavailable");
  });

  it("treats an empty object as an unknown symbol", async () => {
    stubFetch(() => new Response("{}"));
    const result = await fetchAlphaVantageValuation("NOTATICKER", "k3y");
    assert.equal(result.status, "missing");
  });

  it("never repeats the key in a failure reason", async () => {
    spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      throw new Error(`connect failed for ${input.toString()}`);
    });
    const result = await fetchAlphaVantageValuation("CRM", "k3y-secret");
    assert.equal(result.status, "unavailable");
    assert.ok(result.status === "unavailable" && !result.reason.includes("k3y-secret"));
  });

  it("runs the basket on Alpha Vantage when a key is configured, and says so", async () => {
    const previous = process.env.ALPHA_VANTAGE_API_KEY;
    process.env.ALPHA_VANTAGE_API_KEY = "k3y";
    try {
      assert.equal(resolveMarketDataProvider(), "alpha-vantage");
      stubFetch((url) =>
        url.includes("alphavantage.co")
          ? new Response(overviewBody("8.2", "0.2"))
          : new Response("Yahoo must not be called", { status: 500 }),
      );

      const snapshot = await fetchSaaSValuations();

      assert.equal(snapshot.source, "alpha-vantage");
      assert.equal(snapshot.companyCount, SAAS_BASKET.length);
      assert.equal(snapshot.medianEvToRevenue, 8.2);
      assert.equal(snapshot.medianRevenueGrowth, 20);
    } finally {
      if (previous === undefined) {
        delete process.env.ALPHA_VANTAGE_API_KEY;
      } else {
        process.env.ALPHA_VANTAGE_API_KEY = previous;
      }
    }
  });

  it("stays on Yahoo without a key, and says so", async () => {
    const previous = process.env.ALPHA_VANTAGE_API_KEY;
    delete process.env.ALPHA_VANTAGE_API_KEY;
    try {
      assert.equal(resolveMarketDataProvider(), "yahoo");
      stubFetch(() => new Response(quoteBody(1_000_000, 0.2)));
      const snapshot = await fetchSaaSValuations();
      assert.equal(snapshot.source, "yahoo");
    } finally {
      if (previous !== undefined) {
        process.env.ALPHA_VANTAGE_API_KEY = previous;
      }
    }
  });
});

describe("fetchQuote cache", () => {
  const createCache = () => {
    const store = new Map<string, { value: string; ttl?: number }>();
    return {
      store,
      cache: {
        async get(key: string) {
          return store.get(key)?.value ?? null;
        },
        async put(key: string, value: string, options?: { expirationTtl?: number }) {
          store.set(key, { value, ttl: options?.expirationTtl });
        },
      },
    };
  };

  it("serves a repeat read from KV without touching the source", async () => {
    const { cache, store } = createCache();
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return new Response(quoteBody(2_000_000, 0.3));
    });

    const first = await fetchQuote("CRM", { cache });
    const second = await fetchQuote("CRM", { cache });

    assert.equal(first.status, "ok");
    assert.equal(second.status, "ok");
    assert.equal(calls, 1, "one upstream read for two calls");
    assert.equal(store.get("comps:quote:CRM")?.ttl, 60 * 60);
  });

  it("caches an unknown symbol for a shorter window and never caches a refused source", async () => {
    const { cache, store } = createCache();

    stubFetch(() => new Response("not found", { status: 404 }));
    assert.equal((await fetchQuote("NOTATICKER", { cache })).status, "missing");
    assert.equal(store.get("comps:quote:NOTATICKER")?.ttl, 15 * 60);

    stubFetch(() => new Response("Edge: Too Many Requests", { status: 429 }));
    assert.equal((await fetchQuote("MSFT", { cache })).status, "unavailable");
    assert.equal(store.has("comps:quote:MSFT"), false, "an outage is not a fact about the symbol");
  });

  it("treats an unreadable cache record as a miss", async () => {
    const { cache, store } = createCache();
    store.set("comps:quote:CRM", { value: "{\"status\":\"ok\",\"quote\":\"nope\"}" });
    stubFetch(() => new Response(quoteBody(1_000_000, 0.2)));

    const result = await fetchQuote("CRM", { cache });
    assert.equal(result.status, "ok");
    assert.match(store.get("comps:quote:CRM")?.value ?? "", /cachedAt/, "the bad record was replaced");
  });
});
