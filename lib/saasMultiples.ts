/**
 * SaaS valuation multiples: the basket median behind /comps, /api/comps and the get_comps tool.
 *
 * Providers are tried in order until one covers at least half the basket:
 *
 * 1. Alpha Vantage's OVERVIEW, only when ALPHA_VANTAGE_API_KEY is set. A documented API that
 *    reports EV/Revenue and growth directly, but its free tier (5 requests a minute, 25 a day)
 *    refuses most of a fifteen-symbol basket fetched at once.
 * 2. SEC EDGAR filings for revenue, cash, debt and shares, priced with Cboe's delayed quotes.
 *    The fundamentals are official and keyless; the price feed is public and keyless.
 * 3. Yahoo Finance's quoteSummary, through the cookie and crumb it has required since
 *    October 2026. Unofficial, and blocked from some addresses without notice.
 *
 * The snapshot names the one provider that answered, which is what /comps prints beside the
 * figures. When none answers, `QuoteSourceUnavailableError` carries every provider's reason and
 * /api/comps answers 503: an outage is not an empty basket. A basket that was read is cached in
 * KV for an hour, so the page, the API and the tool share one upstream read.
 *
 * Every read must distinguish "the source turned us away" from "this company has no data".
 * Collapsing the two is how /api/comps came to report ok:true with companyCount 0 -- an outage
 * rendered as an empty basket.
 */

import { z } from "zod";
import { fetchCboeDelayedPrice } from "./marketData/cboe";
import { fetchSecFundamentalsBatch } from "./marketData/secEdgar";
import { releaseBody, type UpstreamRead } from "./marketData/upstream";
import { fetchYahooQuotes, type YahooQuote } from "./marketData/yahoo";
import { getJson, getWhetherKv, type KvNamespace } from "./runtime/kv";
import { readSetting } from "./runtime/settings";

/**
 * The basket, with the names the page prints and the SEC registrant number EDGAR files them under.
 *
 * /comps listed the companies as hand-typed prose beside a count read from this array, so the
 * two could drift apart silently — add a ticker here and the page would say "these 16
 * companies" above a list of fifteen names. One source, both uses.
 *
 * Confluent left in 2026-10: IBM's acquisition closed and it deregistered (Form 15, March
 * 2026), so no source had a quote for it and the page listed a company that no longer trades.
 */
export const SAAS_BASKET_COMPANIES = [
  { ticker: "SNOW", name: "Snowflake", cik: 1640147 },
  { ticker: "SHOP", name: "Shopify", cik: 1594805 },
  { ticker: "CRM", name: "Salesforce", cik: 1108524 },
  { ticker: "HUBS", name: "HubSpot", cik: 1404655 },
  { ticker: "MDB", name: "MongoDB", cik: 1441816 },
  { ticker: "DDOG", name: "Datadog", cik: 1561550 },
  { ticker: "TEAM", name: "Atlassian", cik: 1650372 },
  { ticker: "WDAY", name: "Workday", cik: 1327811 },
  { ticker: "NOW", name: "ServiceNow", cik: 1373715 },
  { ticker: "ZS", name: "Zscaler", cik: 1713683 },
  { ticker: "TOST", name: "Toast", cik: 1650164 },
  { ticker: "GTLB", name: "GitLab", cik: 1653482 },
  { ticker: "NET", name: "Cloudflare", cik: 1477333 },
  { ticker: "FRSH", name: "Freshworks", cik: 1544522 },
] as const;

export const SAAS_BASKET = SAAS_BASKET_COMPANIES.map((company) => company.ticker);

const MARKET_DATA_PROVIDERS = ["alpha-vantage", "sec-cboe", "yahoo"] as const;
type MarketDataProvider = (typeof MARKET_DATA_PROVIDERS)[number];

/** The source a reader is told the basket came from. /comps once said "Yahoo Finance" whichever one answered. */
export const MARKET_DATA_PROVIDER_LABELS: Record<MarketDataProvider, string> = {
  "alpha-vantage": "Alpha Vantage",
  "sec-cboe": "SEC EDGAR filings and Cboe delayed prices",
  yahoo: "Yahoo Finance",
};

export type SaaSValuationSnapshot = {
  medianEvToRevenue: number | null;
  medianRevenueGrowth: number | null;
  companyCount: number;
  /** Companies the growth median covers — fewer than `companyCount` when a read could not produce growth. */
  growthCompanyCount: number;
  fetchedAt: string;
  /** Which provider produced the basket, so a consumer can tell the official read from a fallback. */
  source: MarketDataProvider;
};

/** Raised when no provider could read the basket, not when a ticker is unknown. */
export class QuoteSourceUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "QuoteSourceUnavailableError";
  }
}

/** The two numbers the basket median is built from, whichever source supplied them. */
type ValuationMetrics = {
  /** Enterprise value over trailing revenue; null when the source has no usable figure. */
  evToRevenue: number | null;
  /** Year-over-year revenue growth as a fraction (0.18 is 18%); null when unknown. */
  revenueGrowth: number | null;
};

type ValuationRead = UpstreamRead<ValuationMetrics>;

type MarketDataCache = Pick<KvNamespace, "get" | "put" | "delete">;

const enterpriseValueToRevenue = (input: { marketCap: number; debt: number; cash: number; revenue: number }) => {
  const enterpriseValue = input.marketCap + input.debt - input.cash;
  return input.revenue > 0 && enterpriseValue > 0 ? enterpriseValue / input.revenue : null;
};

/* ---------- SEC EDGAR + Cboe ---------- */

async function readSecCboeBasket(cache: MarketDataCache | null, now: Date): Promise<ValuationRead[]> {
  const [fundamentals, prices] = await Promise.all([
    fetchSecFundamentalsBatch(SAAS_BASKET_COMPANIES.map((company) => company.cik), { cache, now }),
    Promise.all(SAAS_BASKET.map((symbol) => fetchCboeDelayedPrice(symbol, now))),
  ]);

  return fundamentals.map((filed, index): ValuationRead => {
    const price = prices[index];
    if (filed.status === "unavailable") return filed;
    if (price.status === "unavailable") return price;
    if (filed.status === "missing") return filed;
    if (price.status === "missing") return price;

    const company = filed.value;
    return {
      status: "ok",
      value: {
        evToRevenue: enterpriseValueToRevenue({
          marketCap: price.value * company.sharesOutstanding,
          debt: company.debt,
          cash: company.cash,
          revenue: company.revenueTtm,
        }),
        revenueGrowth: company.revenueGrowth,
      },
    };
  });
}

/* ---------- Yahoo Finance ---------- */

const valuationFromYahooQuote = (quote: YahooQuote): ValuationMetrics => {
  const price = quote.price?.regularMarketPrice ?? 0;
  const shares = quote.defaultKeyStatistics?.sharesOutstanding ?? 0;
  return {
    evToRevenue: enterpriseValueToRevenue({
      marketCap: quote.price?.marketCap ?? price * shares,
      debt: quote.financialData?.totalDebt ?? 0,
      cash: quote.financialData?.totalCash ?? 0,
      revenue: quote.financialData?.totalRevenue ?? 0,
    }),
    revenueGrowth: quote.financialData?.revenueGrowth ?? null,
  };
};

async function readYahooBasket(cache: MarketDataCache | null): Promise<ValuationRead[]> {
  const quotes = await fetchYahooQuotes(SAAS_BASKET, { cache });
  return quotes.map((quote) => (quote.status === "ok" ? { status: "ok", value: valuationFromYahooQuote(quote.value) } : quote));
}

/* ---------- Alpha Vantage ---------- */

const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";
/** Once a day per symbol, through the data cache: the basket cache alone would ask hourly, past the free tier's 25 a day. */
const ALPHA_VANTAGE_REVALIDATE_SECONDS = 24 * 60 * 60;

/**
 * A Worker secret (`wrangler secret put ALPHA_VANTAGE_API_KEY`) installed on globalThis by
 * worker/index.ts, or an environment variable for scripts. Absent, the basket starts at EDGAR.
 */
const resolveAlphaVantageApiKey = (): string | null => readSetting("ALPHA_VANTAGE_API_KEY");

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

export async function fetchAlphaVantageValuation(symbol: string, apiKey: string): Promise<ValuationRead> {
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
  if (!overview.success) return { status: "missing", reason: `Alpha Vantage has no overview for ${symbol}` };

  return {
    status: "ok",
    value: {
      evToRevenue: parseAlphaVantageNumber(overview.data.EVToRevenue),
      revenueGrowth: parseAlphaVantageNumber(overview.data.QuarterlyRevenueGrowthYOY),
    },
  };
}

async function readAlphaVantageBasket(): Promise<ValuationRead[]> {
  const apiKey = resolveAlphaVantageApiKey();
  if (!apiKey) return SAAS_BASKET.map(() => ({ status: "unavailable", reason: "no Alpha Vantage key" }));
  return Promise.all(SAAS_BASKET.map((symbol) => fetchAlphaVantageValuation(symbol, apiKey)));
}

/* ---------- The basket ---------- */

const providerOrder = (): MarketDataProvider[] =>
  resolveAlphaVantageApiKey() ? ["alpha-vantage", "sec-cboe", "yahoo"] : ["sec-cboe", "yahoo"];

const readBasket = (provider: MarketDataProvider, cache: MarketDataCache | null, now: Date): Promise<ValuationRead[]> => {
  switch (provider) {
    case "alpha-vantage":
      return readAlphaVantageBasket();
    case "sec-cboe":
      return readSecCboeBasket(cache, now);
    case "yahoo":
      return readYahooBasket(cache);
  }
};

/** A provider that reads fewer companies than this hands over to the next one. */
const MIN_COMPANIES = Math.ceil(SAAS_BASKET.length / 2);

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
};

const summarize = (provider: MarketDataProvider, results: ValuationRead[], now: Date): SaaSValuationSnapshot => {
  const evValues: number[] = [];
  const growthValues: number[] = [];
  for (const result of results) {
    if (result.status !== "ok") continue;
    const { evToRevenue, revenueGrowth } = result.value;
    if (evToRevenue !== null && evToRevenue > 0) evValues.push(Math.round(evToRevenue * 10) / 10);
    /* Every reported growth belongs in the median, decliners included: a
       "median revenue growth" over growers only is survivorship bias, and the
       page states the sample beside the number. */
    if (revenueGrowth !== null) growthValues.push(Math.round(revenueGrowth * 1000) / 10);
  }
  return {
    medianEvToRevenue: median(evValues),
    medianRevenueGrowth: median(growthValues),
    companyCount: evValues.length,
    growthCompanyCount: growthValues.length,
    fetchedAt: now.toISOString(),
    source: provider,
  };
};

/** Why a provider produced no basket: its first refusal, or that it knew none of the companies. */
const failureReason = (results: ValuationRead[]): string => {
  const refused = results.find((result) => result.status === "unavailable");
  if (refused) return refused.reason;
  const missing = results.find((result) => result.status === "missing");
  return missing ? `no usable figures (${missing.reason})` : "no usable figures";
};

/* ---------- The basket cache ---------- */

const SNAPSHOT_KEY = "comps:basket:v1";
/** A delayed price moves through the day; an hour keeps the figure current without an upstream read per visit. */
const SNAPSHOT_TTL_SECONDS = 60 * 60;

/* Validated on the way out of KV: a record an older deploy wrote in another shape reads as a miss. */
const snapshotSchema = z.object({
  medianEvToRevenue: z.number().nullable(),
  medianRevenueGrowth: z.number().nullable(),
  companyCount: z.number(),
  growthCompanyCount: z.number(),
  fetchedAt: z.string(),
  source: z.enum(MARKET_DATA_PROVIDERS),
});

const readCachedSnapshot = async (cache: MarketDataCache | null): Promise<SaaSValuationSnapshot | null> => {
  if (!cache) return null;
  try {
    return await getJson(cache, SNAPSHOT_KEY, snapshotSchema);
  } catch {
    return null;
  }
};

const writeCachedSnapshot = async (cache: MarketDataCache | null, snapshot: SaaSValuationSnapshot) => {
  if (!cache) return;
  try {
    await cache.put(SNAPSHOT_KEY, JSON.stringify(snapshot), { expirationTtl: SNAPSHOT_TTL_SECONDS });
  } catch {
    /* A cache write failure costs one more upstream read, nothing else. */
  }
};

/**
 * The basket median, from the cache when a basket was read in the last hour. An outage is never
 * cached: the next request tries every provider again. Off Cloudflare (tests, scripts) there is
 * no binding unless one is passed, and every call reads the sources.
 */
export async function fetchSaaSValuations(
  options: { cache?: MarketDataCache | null; now?: Date } = {},
): Promise<SaaSValuationSnapshot> {
  const cache = options.cache === undefined ? getWhetherKv() : options.cache;
  const cached = await readCachedSnapshot(cache);
  if (cached) return cached;

  const now = options.now ?? new Date();
  const failures: string[] = [];
  let partial: SaaSValuationSnapshot | null = null;

  for (const provider of providerOrder()) {
    const results = await readBasket(provider, cache, now);
    const snapshot = summarize(provider, results, now);
    if (snapshot.companyCount >= MIN_COMPANIES) {
      await writeCachedSnapshot(cache, snapshot);
      return snapshot;
    }
    if (snapshot.companyCount > 0 && (!partial || snapshot.companyCount > partial.companyCount)) partial = snapshot;
    failures.push(`${MARKET_DATA_PROVIDER_LABELS[provider]}: ${failureReason(results)}`);
  }

  // No provider covered half the basket. The widest partial read is still a reading, and says
  // how many companies it covers; it is not cached, so the next request tries again.
  if (partial) return partial;
  throw new QuoteSourceUnavailableError(failures.join("; "));
}
