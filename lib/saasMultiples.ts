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

export const SAAS_BASKET = [
  "SNOW", "SHOP", "CRM", "HUBS", "MDB", "DDOG", "TEAM", "WDAY",
  "NOW", "ZS", "CFLT", "TOST", "GTLB", "NET", "FRSH",
] as const;

export type MarketDataProvider = "yahoo" | "alpha-vantage";

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

export type YahooQuote = z.infer<typeof yahooQuoteSchema>;

/** Raised when the quote source itself is unreachable, not when a ticker is unknown. */
export class QuoteSourceUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "QuoteSourceUnavailableError";
  }
}

export type QuoteResult =
  /** The source answered with data for this symbol. */
  | { status: "ok"; quote: YahooQuote }
  /** The source answered, and has nothing for this symbol. */
  | { status: "missing" }
  /** The source refused or never answered; nothing was learned about the symbol. */
  | { status: "unavailable"; reason: string };

export async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,financialData,defaultKeyStatistics,cashflowStatementHistory`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  } catch (error) {
    return { status: "unavailable", reason: error instanceof Error ? error.message : "quote fetch failed" };
  }

  // 404 is a verdict about the symbol. Everything else -- 429 rate limiting,
  // 401 crumb rejection, 5xx -- is the source declining to answer at all.
  if (res.status === 404) return { status: "missing" };
  if (!res.ok) return { status: "unavailable", reason: `quote source returned ${res.status}` };

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

/** The two numbers the basket median is built from, whichever source supplied them. */
export type ValuationMetrics = {
  /** Enterprise value over trailing revenue; null when the source has no usable figure. */
  evToRevenue: number | null;
  /** Year-over-year revenue growth as a fraction (0.18 is 18%); null when unknown. */
  revenueGrowth: number | null;
};

export type ValuationResult =
  | ({ status: "ok" } & ValuationMetrics)
  | { status: "missing" }
  | { status: "unavailable"; reason: string };

export const valuationFromYahooQuote = (quote: YahooQuote): ValuationMetrics => {
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
export const resolveAlphaVantageApiKey = (): string | null => {
  const fromBinding: unknown = Reflect.get(globalThis, "ALPHA_VANTAGE_API_KEY");
  if (typeof fromBinding === "string" && fromBinding.trim() !== "") {
    return fromBinding.trim();
  }
  const fromEnv = typeof process !== "undefined" ? process.env?.ALPHA_VANTAGE_API_KEY : undefined;
  return typeof fromEnv === "string" && fromEnv.trim() !== "" ? fromEnv.trim() : null;
};

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

  if (!res.ok) return { status: "unavailable", reason: `Alpha Vantage returned ${res.status}` };

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
export async function fetchValuationMetrics(
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
    return sorted[Math.floor(sorted.length / 2)];
  };

  return {
    medianEvToRevenue: median(evValues),
    medianRevenueGrowth: median(growthValues),
    companyCount: evValues.length,
    fetchedAt: new Date().toISOString(),
    source: provider,
  };
}
