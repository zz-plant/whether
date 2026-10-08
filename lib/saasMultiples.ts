/**
 * SaaS valuation multiples.
 *
 * Two sources, one seam. Yahoo Finance's quoteSummary endpoint costs nothing and needs no
 * key, but it is unofficial: it answers 429 to unauthenticated callers, blocks addresses
 * without notice, and can disappear. Alpha Vantage's OVERVIEW endpoint is a documented API
 * with a free key (25 requests a day, which a basket of fifteen revalidated once a day fits)
 * and reports EV/Revenue and revenue growth directly. When ALPHA_VANTAGE_API_KEY is set the
 * basket median reads from it; otherwise every read stays on Yahoo, as it always has. The
 * per-company detail route keeps Yahoo either way, because OVERVIEW carries no balance sheet
 * or cash flow.
 *
 * Every read must distinguish "the source turned us away" from "this company has no data".
 * Collapsing the two is how /api/comps came to report ok:true with companyCount 0 -- an
 * outage rendered as an empty basket.
 */

import { z } from "zod";
import { getWhetherKv, type KvNamespace } from "./runtime/kv";
import { readSetting } from "./runtime/settings";

/**
 * The basket, with the names the page prints.
 *
 * /comps listed the fifteen companies as hand-typed prose beside a count read
 * from this array, so the two could drift apart silently — add a ticker here
 * and the page would say "these 16 companies" above a list of fifteen names.
 * One source, both uses.
 */
export const SAAS_BASKET_COMPANIES = [
  { ticker: "SNOW", name: "Snowflake" },
  { ticker: "SHOP", name: "Shopify" },
  { ticker: "CRM", name: "Salesforce" },
  { ticker: "HUBS", name: "HubSpot" },
  { ticker: "MDB", name: "MongoDB" },
  { ticker: "DDOG", name: "Datadog" },
  { ticker: "TEAM", name: "Atlassian" },
  { ticker: "WDAY", name: "Workday" },
  { ticker: "NOW", name: "ServiceNow" },
  { ticker: "ZS", name: "Zscaler" },
  { ticker: "CFLT", name: "Confluent" },
  { ticker: "TOST", name: "Toast" },
  { ticker: "GTLB", name: "GitLab" },
  { ticker: "NET", name: "Cloudflare" },
  { ticker: "FRSH", name: "Freshworks" },
] as const;

export const SAAS_BASKET = SAAS_BASKET_COMPANIES.map((company) => company.ticker);

type MarketDataProvider = "yahoo" | "alpha-vantage";

/** The source a reader is told the basket came from. /comps said "Yahoo Finance" whichever one answered. */
export const MARKET_DATA_PROVIDER_LABELS: Record<MarketDataProvider, string> = {
  yahoo: "Yahoo Finance",
  "alpha-vantage": "Alpha Vantage",
};

export type SaaSValuationSnapshot = {
  medianEvToRevenue: number | null;
  medianRevenueGrowth: number | null;
  companyCount: number;
  fetchedAt: string;
  /** Which upstream produced the basket, so a consumer can tell a keyed read from the fallback. */
  source: MarketDataProvider;
};

/**
 * Validated rather than asserted: this is an undocumented endpoint that already
 * answers with rate-limit pages instead of quotes, so its body is not a shape to
 * take on trust. Every field is optional because the upstream omits them freely.
 */
const yahooQuoteSchema = z.object({
  price: z.object({
    regularMarketPrice: z.number().optional(),
    marketCap: z.number().optional(),
  }).optional(),
  defaultKeyStatistics: z.object({
    sharesOutstanding: z.number().optional(),
  }).optional(),
  financialData: z.object({
    totalRevenue: z.number().optional(),
    revenueGrowth: z.number().optional(),
    totalDebt: z.number().optional(),
    totalCash: z.number().optional(),
  }).optional(),
  cashflowStatementHistory: z.object({
    cashflowStatements: z.array(z.object({
      operatingCashFlow: z.object({ raw: z.number().optional() }).optional(),
      capitalExpenditure: z.object({ raw: z.number().optional() }).optional(),
    })).optional(),
  }).optional(),
});

const quoteResponseSchema = z.object({
  quoteSummary: z.object({
    result: z.array(yahooQuoteSchema).nonempty(),
  }),
});

type YahooQuote = z.infer<typeof yahooQuoteSchema>;

/** Raised when the quote source itself is unreachable, not when a ticker is unknown. */
export class QuoteSourceUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "QuoteSourceUnavailableError";
  }
}

type QuoteResult =
  /** The source answered with data for this symbol. */
  | { status: "ok"; quote: YahooQuote }
  /** The source answered, and has nothing for this symbol. */
  | { status: "missing" }
  /** The source refused or never answered; nothing was learned about the symbol. */
  | { status: "unavailable"; reason: string };

/* ---------- Per-ticker quote cache ---------- */

const QUOTE_CACHE_PREFIX = "comps:quote:";
/** A quote is a daily figure; an hour keeps a busy day inside a couple of dozen upstream calls per symbol. */
const QUOTE_CACHE_TTL_SECONDS = 60 * 60;
/** An unknown symbol stays unknown; shorter so a newly listed one is not hidden for an hour. */
const QUOTE_MISSING_TTL_SECONDS = 15 * 60;

/* Validated on the way out of KV, not asserted: the cache is JSON written by an older
   deploy, and a shape change must read as a miss rather than as a quote. */
const cachedQuoteSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), quote: yahooQuoteSchema, cachedAt: z.string() }),
  z.object({ status: z.literal("missing"), cachedAt: z.string() }),
]);

type QuoteCache = Pick<KvNamespace, "get" | "put">;

const readCachedQuote = async (cache: QuoteCache, symbol: string): Promise<QuoteResult | null> => {
  try {
    const raw = await cache.get(QUOTE_CACHE_PREFIX + symbol);
    if (!raw) return null;
    const parsed = cachedQuoteSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return parsed.data.status === "ok" ? { status: "ok", quote: parsed.data.quote } : { status: "missing" };
  } catch {
    return null;
  }
};

const writeCachedQuote = async (cache: QuoteCache, symbol: string, result: QuoteResult) => {
  if (result.status === "unavailable") return;
  const record = result.status === "ok"
    ? { status: "ok" as const, quote: result.quote, cachedAt: new Date().toISOString() }
    : { status: "missing" as const, cachedAt: new Date().toISOString() };
  const ttl = result.status === "ok" ? QUOTE_CACHE_TTL_SECONDS : QUOTE_MISSING_TTL_SECONDS;
  try {
    await cache.put(QUOTE_CACHE_PREFIX + symbol, JSON.stringify(record), { expirationTtl: ttl });
  } catch {
    /* A cache write failure costs one more upstream read, nothing else. */
  }
};

/**
 * Hands an unread response's connection back. The basket is fetched in
 * parallel, and a Worker gets six open connections per request: a response
 * returned early without its body read holds one until the runtime cancels it,
 * which it logs as "a stalled HTTP response was canceled to prevent deadlock"
 * — on every `/comps` request where the quote source declined, until 2026-09-23.
 */
const releaseBody = async (res: Response) => {
  try {
    await res.body?.cancel();
  } catch {
    /* already consumed or closed */
  }
};

const fetchQuoteFromSource = async (symbol: string): Promise<QuoteResult> => {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,financialData,defaultKeyStatistics,cashflowStatementHistory`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  } catch (error) {
    return { status: "unavailable", reason: error instanceof Error ? error.message : "quote fetch failed" };
  }

  // 404 is a verdict about the symbol. Everything else -- 429 rate limiting,
  // 401 crumb rejection, 5xx -- is the source declining to answer at all.
  if (res.status === 404) {
    await releaseBody(res);
    return { status: "missing" };
  }
  if (!res.ok) {
    await releaseBody(res);
    return { status: "unavailable", reason: `quote source returned ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { status: "unavailable", reason: "quote source returned an unreadable body" };
  }

  const parsed = quoteResponseSchema.safeParse(body);
  return parsed.success
    ? { status: "ok", quote: parsed.data.quoteSummary.result[0] }
    : { status: "missing" };
}

/**
 * One symbol's quote, served from the durable KV cache when a fresh copy exists.
 *
 * The upstream is unofficial and rate-limits this Worker as a whole, and before the cache
 * every visitor with a ticker cookie sent it fifteen requests (the ticker and its peers).
 * A refused or unreachable source is never cached: "unavailable" says nothing about the
 * symbol, and caching it would turn a one-minute outage into an hour of missing comps.
 * Off Cloudflare (tests, scripts) there is no binding and every call reads the source.
 */
export async function fetchQuote(
  symbol: string,
  options: { cache?: QuoteCache | null } = {},
): Promise<QuoteResult> {
  const cache = options.cache === undefined ? getWhetherKv() : options.cache;

  if (cache) {
    const cached = await readCachedQuote(cache, symbol);
    if (cached) return cached;
  }

  const result = await fetchQuoteFromSource(symbol);
  if (cache) await writeCachedQuote(cache, symbol, result);
  return result;
}

/** The two numbers the basket median is built from, whichever source supplied them. */
type ValuationMetrics = {
  /** Enterprise value over trailing revenue; null when the source has no usable figure. */
  evToRevenue: number | null;
  /** Year-over-year revenue growth as a fraction (0.18 is 18%); null when unknown. */
  revenueGrowth: number | null;
};

type ValuationResult =
  | ({ status: "ok" } & ValuationMetrics)
  | { status: "missing" }
  | { status: "unavailable"; reason: string };

const valuationFromYahooQuote = (quote: YahooQuote): ValuationMetrics => {
  const price = quote.price?.regularMarketPrice ?? 0;
  const shares = quote.defaultKeyStatistics?.sharesOutstanding ?? 0;
  const revenue = quote.financialData?.totalRevenue ?? 0;
  const debt = quote.financialData?.totalDebt ?? 0;
  const cash = quote.financialData?.totalCash ?? 0;

  const marketCap = price * shares;
  const ev = marketCap + debt - cash;

  return {
    evToRevenue: revenue > 0 && ev > 0 ? ev / revenue : null,
    revenueGrowth: quote.financialData?.revenueGrowth ?? null,
  };
};

/* ---------- Alpha Vantage ---------- */

const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";
/** Once a day keeps fifteen symbols inside the free tier's 25 requests a day. */
const ALPHA_VANTAGE_REVALIDATE_SECONDS = 24 * 60 * 60;

/**
 * A Worker secret (`wrangler secret put ALPHA_VANTAGE_API_KEY`) installed on globalThis by
 * worker/index.ts, or an environment variable for scripts. Absent, the basket stays on Yahoo.
 */
const resolveAlphaVantageApiKey = (): string | null => readSetting("ALPHA_VANTAGE_API_KEY");

export const resolveMarketDataProvider = (): MarketDataProvider =>
  resolveAlphaVantageApiKey() ? "alpha-vantage" : "yahoo";

const redactAlphaVantageKey = (text: string) => text.replace(/apikey=[^&\s"']+/g, "apikey=REDACTED");

/* OVERVIEW answers a flat object of strings. "None" and "-" stand for no value; an unknown
   symbol is an empty object; a rate-limited or unentitled call is a Note or Information
   message with a 200 status, which is why the status code alone cannot be trusted. */
const alphaVantageOverviewSchema = z.object({
  Symbol: z.string(),
  EVToRevenue: z.string().optional(),
  QuarterlyRevenueGrowthYOY: z.string().optional(),
}).passthrough();

const alphaVantageNoticeSchema = z.object({
  Note: z.string().optional(),
  Information: z.string().optional(),
}).passthrough();

const parseAlphaVantageNumber = (value: string | undefined): number | null => {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "None" || trimmed === "-") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function fetchAlphaVantageValuation(symbol: string, apiKey: string): Promise<ValuationResult> {
  const url = new URL(ALPHA_VANTAGE_URL);
  url.searchParams.set("function", "OVERVIEW");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: ALPHA_VANTAGE_REVALIDATE_SECONDS },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "valuation fetch failed";
    return { status: "unavailable", reason: redactAlphaVantageKey(reason) };
  }

  if (!res.ok) {
    await releaseBody(res);
    return { status: "unavailable", reason: `Alpha Vantage returned ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { status: "unavailable", reason: "Alpha Vantage returned an unreadable body" };
  }

  const notice = alphaVantageNoticeSchema.safeParse(body);
  if (notice.success && (notice.data.Note || notice.data.Information)) {
    return { status: "unavailable", reason: "Alpha Vantage declined the request (rate limit or plan notice)" };
  }

  const overview = alphaVantageOverviewSchema.safeParse(body);
  if (!overview.success) return { status: "missing" };

  return {
    status: "ok",
    evToRevenue: parseAlphaVantageNumber(overview.data.EVToRevenue),
    revenueGrowth: parseAlphaVantageNumber(overview.data.QuarterlyRevenueGrowthYOY),
  };
}

/** One symbol's valuation inputs from the configured provider. */
async function fetchValuationMetrics(
  symbol: string,
  provider: MarketDataProvider = resolveMarketDataProvider(),
): Promise<ValuationResult> {
  if (provider === "alpha-vantage") {
    const apiKey = resolveAlphaVantageApiKey();
    if (apiKey) return fetchAlphaVantageValuation(symbol, apiKey);
  }

  const result = await fetchQuote(symbol);
  if (result.status !== "ok") return result;
  return { status: "ok", ...valuationFromYahooQuote(result.quote) };
}

export async function fetchSaaSValuations(
  options: { provider?: MarketDataProvider } = {},
): Promise<SaaSValuationSnapshot> {
  const provider = options.provider ?? resolveMarketDataProvider();
  const evValues: number[] = [];
  const growthValues: number[] = [];

  // Concurrently: fifteen sequential reads at a 4s timeout each is a minute of
  // edge request budget on the exact path where every read is timing out.
  const results = await Promise.all(SAAS_BASKET.map((symbol) => fetchValuationMetrics(symbol, provider)));
  const unavailable = results.filter((result) => result.status === "unavailable");

  if (unavailable.length === results.length) {
    throw new QuoteSourceUnavailableError(unavailable[0]?.reason ?? "quote source unavailable");
  }

  for (const result of results) {
    if (result.status !== "ok") continue;

    if (result.evToRevenue !== null && result.evToRevenue > 0) {
      evValues.push(Math.round(result.evToRevenue * 10) / 10);
    }
    if (result.revenueGrowth !== null && result.revenueGrowth > 0) {
      growthValues.push(Math.round(result.revenueGrowth * 1000) / 10);
    }
  }

  const median = (vals: number[]) => {
    if (vals.length === 0) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
      ? sorted[mid]
      : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  };

  return {
    medianEvToRevenue: median(evValues),
    medianRevenueGrowth: median(growthValues),
    companyCount: evValues.length,
    fetchedAt: new Date().toISOString(),
    source: provider,
  };
}
