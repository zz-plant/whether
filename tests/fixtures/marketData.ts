/**
 * Fixture upstreams for the comps basket: SEC EDGAR company facts, Cboe delayed quotes and
 * Yahoo's cookie, crumb and quoteSummary endpoints, served from one fake `fetch`.
 *
 * Shared by `tests/saasMultiples.test.ts`, `tests/secEdgarFundamentals.test.ts` and
 * `tests/compsAsOf.test.tsx`, so the three agree on what a healthy filing looks like.
 */
import { spyOn } from "bun:test";

/* ---------- Company facts ---------- */

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** The last day of the month `monthsBack` months before the month `end` falls in. */
const monthEndBefore = (end: string, monthsBack: number) => {
  const date = new Date(`${end}T00:00:00.000Z`);
  return isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - monthsBack + 1, 0)));
};

const dayAfter = (date: string) => isoDate(new Date(Date.parse(`${date}T00:00:00.000Z`) + 86_400_000));

/** Quarter `[start, end]` pairs, newest first, each ending on a month end. */
export const quarterPeriods = (latestEnd: string, count: number): Array<{ start: string; end: string }> =>
  Array.from({ length: count }, (_unused, index) => {
    const end = monthEndBefore(latestEnd, index * 3);
    return { start: dayAfter(monthEndBefore(latestEnd, index * 3 + 3)), end };
  });

type CompanyFactsOptions = {
  /** End of the newest quarter on file, YYYY-MM-DD. */
  latestQuarterEnd: string;
  /** Discrete quarterly revenue, newest first. Five quarters give a trailing year and a year-ago quarter. */
  quarterlyRevenue?: number[];
  revenueConcept?: string;
  cash?: number;
  shortTermInvestments?: number;
  convertibleDebt?: number;
  weightedShares?: number;
  /** Further revenue rows, such as a 10-K's full year. */
  extraRevenueRows?: FactRow[];
};

type FactRow = { start?: string; end: string; val: number; filed: string; form: string };

const instant = (end: string, val: number): FactRow => ({ end, val, filed: dayAfter(end), form: "10-Q" });

/**
 * A company-facts document shaped like EDGAR's: `facts["us-gaap"][concept].units.USD` rows.
 * Defaults describe a company with $410M trailing revenue growing 25%, $150M of cash and
 * investments, $50M of convertible notes and 10M shares.
 */
export const companyFactsFixture = ({
  latestQuarterEnd,
  quarterlyRevenue = [110e6, 105e6, 100e6, 95e6, 88e6],
  revenueConcept = "RevenueFromContractWithCustomerExcludingAssessedTax",
  cash = 100e6,
  shortTermInvestments = 50e6,
  convertibleDebt = 50e6,
  weightedShares = 10e6,
  extraRevenueRows = [],
}: CompanyFactsOptions) => {
  const periods = quarterPeriods(latestQuarterEnd, quarterlyRevenue.length);
  const latest = periods[0];
  return {
    cik: 1,
    entityName: "Fixture Software, Inc.",
    facts: {
      dei: {},
      "us-gaap": {
        [revenueConcept]: {
          units: {
            USD: [
              ...periods.map((period, index): FactRow => ({
                start: period.start,
                end: period.end,
                val: quarterlyRevenue[index],
                filed: dayAfter(latest.end),
                form: "10-Q",
              })),
              ...extraRevenueRows,
            ],
          },
        },
        CashAndCashEquivalentsAtCarryingValue: { units: { USD: [instant(latest.end, cash)] } },
        AvailableForSaleSecuritiesDebtSecuritiesCurrent: { units: { USD: [instant(latest.end, shortTermInvestments)] } },
        ConvertibleDebtNoncurrent: { units: { USD: [instant(latest.end, convertibleDebt)] } },
        WeightedAverageNumberOfSharesOutstandingBasic: {
          units: { shares: [{ start: latest.start, end: latest.end, val: weightedShares, filed: dayAfter(latest.end), form: "10-Q" }] },
        },
      },
    },
  };
};

/* ---------- Fake upstreams ---------- */

type Handler = (url: URL, headers: Headers) => Response | Promise<Response>;

export type MarketDataUpstreams = {
  /** data.sec.gov company facts, by CIK. */
  sec?: (cik: number, headers: Headers) => Response;
  /** cdn.cboe.com delayed quotes, by symbol. */
  cboe?: (symbol: string) => Response;
  /** fc.yahoo.com: the response that sets (or fails to set) the session cookie. */
  yahooCookie?: () => Response;
  /** /v1/test/getcrumb, given the cookie header sent. */
  yahooCrumb?: (cookie: string | null) => Response;
  /** quoteSummary, given the symbol and the crumb sent. */
  yahooQuote?: (symbol: string, crumb: string | null) => Response;
  /** Any other host. */
  other?: Handler;
};

export const cboeQuoteResponse = (symbol: string, price: number, lastTrade = "2026-10-08T15:59:59") =>
  Response.json({
    timestamp: "2026-10-09 03:29:16",
    data: { symbol, security_type: "stock", current_price: price, close: price, prev_day_close: price, last_trade_time: lastTrade },
    symbol,
  });

export const yahooQuoteResponse = (quote: {
  price?: number;
  marketCap?: number;
  shares?: number;
  revenue?: number;
  growth?: number;
  debt?: number;
  cash?: number;
}) =>
  Response.json({
    quoteSummary: {
      result: [{
        price: { regularMarketPrice: quote.price ?? 100, marketCap: quote.marketCap },
        defaultKeyStatistics: { sharesOutstanding: quote.shares ?? 10e6 },
        financialData: {
          totalRevenue: quote.revenue ?? 400e6,
          revenueGrowth: quote.growth ?? 0.2,
          totalDebt: quote.debt ?? 0,
          totalCash: quote.cash ?? 0,
        },
      }],
      error: null,
    },
  });

export const yahooCookieResponse = (cookie = "A3=d=fixture&S=fixture") =>
  new Response(null, { status: 404, headers: { "set-cookie": `${cookie}; Expires=Sat, 9 Oct 2027 09:29:32 GMT; Domain=.yahoo.com; Path=/` } });

const refused: () => Response = () => new Response("Edge: Too Many Requests", { status: 429 });

/** Every upstream the basket reads, served by `upstreams` and refused (429) where it gives no handler. */
export const stubMarketData = (upstreams: MarketDataUpstreams) => {
  const calls: string[] = [];
  spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const headers = new Headers(init?.headers);
    calls.push(`${url.host}${url.pathname}`);

    if (url.host === "data.sec.gov") {
      const cik = Number(/CIK(\d+)\.json$/.exec(url.pathname)?.[1]);
      return upstreams.sec ? upstreams.sec(cik, headers) : refused();
    }
    if (url.host === "cdn.cboe.com") {
      const symbol = /quotes\/([^/]+)\.json$/.exec(url.pathname)?.[1] ?? "";
      return upstreams.cboe ? upstreams.cboe(decodeURIComponent(symbol)) : refused();
    }
    if (url.host === "fc.yahoo.com") return upstreams.yahooCookie ? upstreams.yahooCookie() : refused();
    if (url.host === "query2.finance.yahoo.com" && url.pathname === "/v1/test/getcrumb") {
      return upstreams.yahooCrumb ? upstreams.yahooCrumb(headers.get("cookie")) : refused();
    }
    if (url.host === "query2.finance.yahoo.com" && url.pathname.startsWith("/v10/finance/quoteSummary/")) {
      const symbol = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      return upstreams.yahooQuote ? upstreams.yahooQuote(symbol, url.searchParams.get("crumb")) : refused();
    }
    if (upstreams.other) return upstreams.other(url, headers);
    throw new Error(`offline in tests: ${url.host}`);
  });
  return {
    calls,
    count: (fragment: string) => calls.filter((call) => call.includes(fragment)).length,
  };
};

/** A healthy filer and price for every company in the basket. */
export const healthySecAndCboe = (latestQuarterEnd: string, price = 100): Pick<MarketDataUpstreams, "sec" | "cboe"> => ({
  sec: () => Response.json(companyFactsFixture({ latestQuarterEnd })),
  cboe: (symbol) => cboeQuoteResponse(symbol, price),
});

/** A Yahoo that issues a session and answers every quote for the crumb it issued. */
export const healthyYahoo = (crumb = "fixtureCrumb"): Pick<MarketDataUpstreams, "yahooCookie" | "yahooCrumb" | "yahooQuote"> => ({
  yahooCookie: () => yahooCookieResponse(),
  yahooCrumb: (cookie) => (cookie?.startsWith("A3=") ? new Response(crumb) : new Response("Unauthorized", { status: 401 })),
  yahooQuote: (_symbol, sent) => (sent === crumb
    /* Two share classes: the quoted class's 5M shares at $100 are half the $1B market cap. */
    ? yahooQuoteResponse({ price: 100, shares: 5e6, marketCap: 1_000e6, revenue: 400e6, growth: 0.2 })
    : Response.json({ finance: { result: null, error: { code: "Unauthorized", description: "Invalid Crumb" } } }, { status: 401 })),
});

/** An in-memory stand-in for the KV binding that records each write's TTL. */
export const createMemoryKv = () => {
  const store = new Map<string, { value: string; ttl?: number }>();
  return {
    store,
    kv: {
      async get(key: string) {
        return store.get(key)?.value ?? null;
      },
      async put(key: string, value: string, options?: { expirationTtl?: number }) {
        store.set(key, { value, ttl: options?.expirationTtl });
      },
      async delete(key: string) {
        store.delete(key);
      },
    },
  };
};
