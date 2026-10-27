import assert from "node:assert/strict";
import { afterAll, afterEach, beforeEach, describe, it, mock, setSystemTime } from "bun:test";
import {
  QuoteSourceUnavailableError,
  fetchAlphaVantageValuation,
  fetchSaaSValuations,
  SAAS_BASKET,
  SAAS_BASKET_COMPANIES,
} from "../lib/saasMultiples";
import {
  cboeQuoteResponse,
  companyFactsFixture,
  createMemoryKv,
  healthySecAndCboe,
  healthyYahoo,
  stubMarketData,
  yahooCookieResponse,
  yahooQuoteResponse,
} from "./fixtures/marketData";

/*
 * The basket reads SEC EDGAR filings priced with Cboe's delayed quotes, falls back to Yahoo's
 * cookie-and-crumb quoteSummary, and answers QuoteSourceUnavailableError (503 at /api/comps)
 * only when every source refuses. Every upstream here is a fixture: the suite is offline.
 */

const NOW = new Date("2026-10-09T12:00:00.000Z");
const LATEST_QUARTER = "2026-07-31";

/* The fixture company: $900M enterprise value over $410M trailing revenue, growing 25%. */
const FIXTURE_EV_TO_REVENUE = 2.2;
const FIXTURE_GROWTH = 25;

/* Without a key the basket starts at EDGAR; the Alpha Vantage cases set one themselves. */
const configuredKey = process.env.ALPHA_VANTAGE_API_KEY;

beforeEach(() => {
  delete process.env.ALPHA_VANTAGE_API_KEY;
  setSystemTime(NOW);
});

afterEach(() => {
  mock.restore();
  setSystemTime();
});

afterAll(() => {
  if (configuredKey !== undefined) process.env.ALPHA_VANTAGE_API_KEY = configuredKey;
});

const read = (cache: ReturnType<typeof createMemoryKv>["kv"] | null = null) => fetchSaaSValuations({ cache, now: NOW });

describe("fetchSaaSValuations: sources", () => {
  it("reads the basket from SEC EDGAR filings and Cboe prices, and says so", async () => {
    const seenAgents: Array<string | null> = [];
    const upstream = stubMarketData({
      ...healthySecAndCboe(LATEST_QUARTER),
      sec: (_cik, headers) => {
        seenAgents.push(headers.get("user-agent"));
        return Response.json(companyFactsFixture({ latestQuarterEnd: LATEST_QUARTER }));
      },
    });

    const snapshot = await read();

    assert.equal(snapshot.source, "sec-cboe");
    assert.equal(snapshot.companyCount, SAAS_BASKET.length);
    assert.equal(snapshot.medianEvToRevenue, FIXTURE_EV_TO_REVENUE);
    assert.equal(snapshot.medianRevenueGrowth, FIXTURE_GROWTH);
    assert.equal(snapshot.fetchedAt, NOW.toISOString());
    assert.equal(upstream.count("yahoo"), 0, "the fallback is not asked when the first source answers");
    // SEC's fair-access terms: an automated caller names itself and a contact.
    assert.ok(seenAgents.every((agent) => agent !== null && /whether\.work/.test(agent) && /@/.test(agent)));
    assert.deepEqual(
      upstream.calls.filter((call) => call.startsWith("data.sec.gov")).sort(),
      SAAS_BASKET_COMPANIES.map((company) => `data.sec.gov/api/xbrl/companyfacts/CIK${String(company.cik).padStart(10, "0")}.json`).sort(),
    );
  });

  it("falls back to Yahoo when EDGAR refuses, and names Yahoo as the source", async () => {
    stubMarketData({
      sec: () => new Response("Request Rate Threshold Exceeded", { status: 403 }),
      cboe: (symbol) => cboeQuoteResponse(symbol, 100),
      ...healthyYahoo(),
    });

    const snapshot = await read();

    assert.equal(snapshot.source, "yahoo");
    assert.equal(snapshot.companyCount, SAAS_BASKET.length);
    // Yahoo's marketCap covers every share class; price times one class's shares would read 1.25x.
    assert.equal(snapshot.medianEvToRevenue, 2.5);
    assert.equal(snapshot.medianRevenueGrowth, 20);
  });

  it("falls back to Yahoo when the price feed refuses, though the filings answered", async () => {
    stubMarketData({
      sec: () => Response.json(companyFactsFixture({ latestQuarterEnd: LATEST_QUARTER })),
      cboe: () => new Response("<html>blocked</html>", { status: 403 }),
      ...healthyYahoo(),
    });

    assert.equal((await read()).source, "yahoo");
  });

  it("answers QuoteSourceUnavailableError with every source's reason when all of them refuse", async () => {
    stubMarketData({});

    // /api/comps answered ok:true with companyCount 0 through a total outage, which reads as
    // "these companies have no multiples". It is a 503, and the detail says who refused.
    const error = await read().then(() => null, (caught: unknown) => caught);
    assert.ok(error instanceof QuoteSourceUnavailableError);
    assert.match(error.message, /SEC EDGAR filings and Cboe delayed prices: SEC EDGAR returned 429/);
    assert.match(error.message, /Yahoo Finance: Yahoo set no cookie \(status 429\)/);
  });

  it("treats a source that knows none of the companies as down, not as an empty basket", async () => {
    stubMarketData({
      sec: () => new Response("not found", { status: 404 }),
      cboe: (symbol) => cboeQuoteResponse(symbol, 100),
      yahooCookie: () => yahooCookieResponse(),
      yahooCrumb: () => new Response("fixtureCrumb"),
      yahooQuote: () => new Response("not found", { status: 404 }),
    });

    await assert.rejects(read(), QuoteSourceUnavailableError);
  });

  it("hands a thin read to the next source, and keeps the widest when none covers half", async () => {
    const covered = new Set<string>(SAAS_BASKET.slice(0, 3));
    stubMarketData({
      ...healthySecAndCboe(LATEST_QUARTER),
      cboe: (symbol) => (covered.has(symbol) ? cboeQuoteResponse(symbol, 100) : new Response("busy", { status: 503 })),
      yahooCookie: () => yahooCookieResponse(),
      yahooCrumb: () => new Response("fixtureCrumb"),
      yahooQuote: (symbol) => (symbol === SAAS_BASKET[0] ? yahooQuoteResponse({ marketCap: 1_000e6 }) : new Response("busy", { status: 503 })),
    });

    const snapshot = await read();

    assert.equal(snapshot.source, "sec-cboe", "three companies beat one");
    assert.equal(snapshot.companyCount, 3);
  });

  it("releases every refused response's body instead of holding its connection", async () => {
    // A Worker has six open connections per request and the basket is fetched in parallel; an
    // unread body holds one until the runtime cancels it, which production logged on every
    // /comps request the quote source declined.
    let created = 0;
    let cancelled = 0;
    const refusal = () => {
      created += 1;
      return new Response(new ReadableStream({ cancel() { cancelled += 1; } }), { status: 429 });
    };
    stubMarketData({ sec: refusal, cboe: refusal, yahooCookie: refusal });

    await assert.rejects(read(), QuoteSourceUnavailableError);
    assert.equal(created, SAAS_BASKET.length * 2 + 1);
    assert.equal(cancelled, created);
  });
});

describe("fetchSaaSValuations: caches", () => {
  it("serves a repeat read from the basket cache without touching a source", async () => {
    const { kv, store } = createMemoryKv();
    const upstream = stubMarketData(healthySecAndCboe(LATEST_QUARTER));

    const first = await read(kv);
    const callsAfterFirst = upstream.calls.length;
    const second = await read(kv);

    assert.deepEqual(second, first);
    assert.equal(upstream.calls.length, callsAfterFirst, "no upstream call for the second read");
    assert.equal(store.get("comps:basket:v1")?.ttl, 60 * 60);
  });

  it("keeps each company's derived filing figures for half a day, and never caches a refusal", async () => {
    const { kv, store } = createMemoryKv();
    stubMarketData(healthySecAndCboe(LATEST_QUARTER));
    await read(kv);

    const cik = SAAS_BASKET_COMPANIES[0].cik;
    const record = store.get(`comps:sec:v1:${cik}`);
    assert.equal(record?.ttl, 12 * 60 * 60);
    assert.ok((record?.value.length ?? Infinity) < 400, "the derived figures, not the multi-megabyte filing");

    mock.restore();
    const outage = createMemoryKv();
    stubMarketData({});
    await assert.rejects(read(outage.kv), QuoteSourceUnavailableError);
    assert.deepEqual([...outage.store.keys()], [], "an outage leaves nothing behind to be served as a reading");
  });
});

describe("Yahoo fallback: cookie and crumb", () => {
  const edgarDown = { sec: () => new Response("busy", { status: 503 }), cboe: (symbol: string) => cboeQuoteResponse(symbol, 100) };

  it("mints one session for the whole basket and caches it", async () => {
    const { kv, store } = createMemoryKv();
    const upstream = stubMarketData({ ...edgarDown, ...healthyYahoo("crumb-1") });

    await read(kv);

    assert.equal(upstream.count("fc.yahoo.com"), 1);
    assert.equal(upstream.count("/v1/test/getcrumb"), 1);
    assert.equal(upstream.count("quoteSummary"), SAAS_BASKET.length);
    const session = JSON.parse(store.get("comps:yahoo:session:v1")?.value ?? "{}");
    assert.equal(session.crumb, "crumb-1");
    assert.match(session.cookie, /^A3=/);
    assert.equal(store.get("comps:yahoo:session:v1")?.ttl, 12 * 60 * 60);
  });

  it("re-mints an expired session once on a 401 and asks again only for the refused symbols", async () => {
    const { kv, store } = createMemoryKv();
    store.set("comps:yahoo:session:v1", { value: JSON.stringify({ cookie: "A3=old", crumb: "expired" }) });
    const answeredOnOldCrumb = SAAS_BASKET[0];
    const upstream = stubMarketData({
      ...edgarDown,
      ...healthyYahoo("fresh"),
      yahooQuote: (symbol, crumb) => (crumb === "fresh" || (crumb === "expired" && symbol === answeredOnOldCrumb)
        ? yahooQuoteResponse({ marketCap: 1_000e6 })
        : Response.json({ finance: { error: { code: "Unauthorized", description: "Invalid Crumb" } } }, { status: 401 })),
    });

    const snapshot = await read(kv);

    assert.equal(snapshot.source, "yahoo");
    assert.equal(snapshot.companyCount, SAAS_BASKET.length);
    assert.equal(upstream.count("/v1/test/getcrumb"), 1, "one fresh crumb, not one per symbol");
    assert.equal(upstream.count("quoteSummary"), SAAS_BASKET.length * 2 - 1, "the symbol that answered is not asked twice");
    assert.equal(JSON.parse(store.get("comps:yahoo:session:v1")?.value ?? "{}").crumb, "fresh");
  });

  it("forgets a session Yahoo keeps rejecting rather than retrying it for twelve hours", async () => {
    const { kv, store } = createMemoryKv();
    store.set("comps:yahoo:session:v1", { value: JSON.stringify({ cookie: "A3=old", crumb: "expired" }) });
    stubMarketData({
      ...edgarDown,
      ...healthyYahoo("fresh"),
      yahooQuote: () => Response.json({ finance: { error: { code: "Unauthorized" } } }, { status: 401 }),
    });

    const error = await read(kv).then(() => null, (caught: unknown) => caught);

    assert.ok(error instanceof QuoteSourceUnavailableError);
    assert.match(error.message, /Yahoo rejected the crumb/);
    assert.equal(store.has("comps:yahoo:session:v1"), false);
  });

  it("reports a refused crumb as the source declining", async () => {
    stubMarketData({ ...edgarDown, yahooCookie: () => yahooCookieResponse(), yahooCrumb: () => new Response("Too Many Requests", { status: 429 }) });

    const error = await read().then(() => null, (caught: unknown) => caught);
    assert.ok(error instanceof QuoteSourceUnavailableError);
    assert.match(error.message, /Yahoo crumb returned 429/);
  });

  it("does not take a 200 that carries no crumb for one", async () => {
    const upstream = stubMarketData({ ...edgarDown, yahooCookie: () => yahooCookieResponse(), yahooCrumb: () => new Response("<html>consent</html>") });

    await assert.rejects(read(), QuoteSourceUnavailableError);
    assert.equal(upstream.count("quoteSummary"), 0);
  });
});

describe("Cboe price feed", () => {
  it("reads an unknown symbol's 403 as missing and a CDN refusal as down", async () => {
    const unknown = SAAS_BASKET[0];
    stubMarketData({
      ...healthySecAndCboe(LATEST_QUARTER),
      cboe: (symbol) => (symbol === unknown
        ? new Response("<?xml version=\"1.0\"?><Error><Code>AccessDenied</Code></Error>", { status: 403 })
        : cboeQuoteResponse(symbol, 100)),
    });

    const snapshot = await read();
    assert.equal(snapshot.source, "sec-cboe");
    assert.equal(snapshot.companyCount, SAAS_BASKET.length - 1);
  });

  it("will not price a company off a quote file that stopped trading", async () => {
    const delisted = SAAS_BASKET[0];
    stubMarketData({
      ...healthySecAndCboe(LATEST_QUARTER),
      cboe: (symbol) => cboeQuoteResponse(symbol, 100, symbol === delisted ? "2026-03-20T15:59:59" : "2026-10-08T15:59:59"),
    });

    assert.equal((await read()).companyCount, SAAS_BASKET.length - 1);
  });
});

describe("Alpha Vantage provider", () => {
  const overviewBody = (evToRevenue: string, growth: string) =>
    JSON.stringify({ Symbol: "CRM", Name: "Salesforce", EVToRevenue: evToRevenue, QuarterlyRevenueGrowthYOY: growth });

  it("reads EV/Revenue and growth straight from OVERVIEW", async () => {
    const upstream = stubMarketData({ other: () => new Response(overviewBody("7.85", "0.11")) });

    const result = await fetchAlphaVantageValuation("CRM", "k3y");

    assert.deepEqual(result, { status: "ok", value: { evToRevenue: 7.85, revenueGrowth: 0.11 } });
    assert.deepEqual(upstream.calls, ["www.alphavantage.co/query"]);
  });

  it("maps the source's None to null instead of a number", async () => {
    stubMarketData({ other: () => new Response(overviewBody("None", "-")) });
    const result = await fetchAlphaVantageValuation("CRM", "k3y");
    assert.deepEqual(result, { status: "ok", value: { evToRevenue: null, revenueGrowth: null } });
  });

  it("treats a rate-limit notice as the source declining, not as an empty company", async () => {
    // Alpha Vantage answers 200 with a Note when the daily allowance is spent.
    stubMarketData({ other: () => Response.json({ Note: "Our standard API rate limit is 25 requests per day." }) });
    assert.equal((await fetchAlphaVantageValuation("CRM", "k3y")).status, "unavailable");
  });

  it("treats an empty object as an unknown symbol", async () => {
    stubMarketData({ other: () => new Response("{}") });
    assert.equal((await fetchAlphaVantageValuation("NOTATICKER", "k3y")).status, "missing");
  });

  it("never repeats the key in a failure reason", async () => {
    stubMarketData({
      other: (url) => {
        throw new Error(`connect failed for ${url.toString()}`);
      },
    });
    const result = await fetchAlphaVantageValuation("CRM", "k3y-secret");
    assert.equal(result.status, "unavailable");
    assert.ok(result.status === "unavailable" && !result.reason.includes("k3y-secret"));
  });

  it("runs the basket on Alpha Vantage first when a key is configured, and says so", async () => {
    process.env.ALPHA_VANTAGE_API_KEY = "k3y";
    const upstream = stubMarketData({
      ...healthySecAndCboe(LATEST_QUARTER),
      other: (url) => (url.host === "www.alphavantage.co" ? new Response(overviewBody("8.2", "0.2")) : new Response("no", { status: 500 })),
    });

    const snapshot = await read();

    assert.equal(snapshot.source, "alpha-vantage");
    assert.equal(snapshot.medianEvToRevenue, 8.2);
    assert.equal(snapshot.medianRevenueGrowth, 20);
    assert.equal(upstream.count("data.sec.gov"), 0);
  });

  it("moves on to EDGAR when the free tier refuses most of the basket", async () => {
    process.env.ALPHA_VANTAGE_API_KEY = "k3y";
    let answered = 0;
    stubMarketData({
      ...healthySecAndCboe(LATEST_QUARTER),
      // Five requests a minute: the rest of a basket fetched at once get the Note.
      other: () => {
        answered += 1;
        return answered <= 5 ? new Response(overviewBody("8.2", "0.2")) : Response.json({ Note: "5 calls per minute" });
      },
    });

    assert.equal((await read()).source, "sec-cboe");
  });
});
