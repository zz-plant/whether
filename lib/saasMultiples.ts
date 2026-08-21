/**
 * SaaS valuation multiples — fetched directly from Yahoo Finance API.
 * No npm dependencies, no build-time bundling issues.
 * $0 cost — no API key required for basic quote data.
 *
 * The upstream is unofficial and currently answers 429 to unauthenticated
 * callers, so every read must distinguish "the source turned us away" from
 * "this company has no data". Collapsing the two is how /api/comps came to
 * report ok:true with companyCount 0 -- an outage rendered as an empty basket.
 */

import { z } from "zod";

export const SAAS_BASKET = [
  "SNOW", "SHOP", "CRM", "HUBS", "MDB", "DDOG", "TEAM", "WDAY",
  "NOW", "ZS", "CFLT", "TOST", "GTLB", "NET", "FRSH",
] as const;

export type SaaSValuationSnapshot = {
  medianEvToRevenue: number | null;
  medianRevenueGrowth: number | null;
  companyCount: number;
  fetchedAt: string;
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

export async function fetchSaaSValuations(): Promise<SaaSValuationSnapshot> {
  const evValues: number[] = [];
  const growthValues: number[] = [];

  // Concurrently: fifteen sequential reads at a 4s timeout each is a minute of
  // edge request budget on the exact path where every read is timing out.
  const results = await Promise.all(SAAS_BASKET.map((symbol) => fetchQuote(symbol)));
  const unavailable = results.filter((result) => result.status === "unavailable");

  if (unavailable.length === results.length) {
    throw new QuoteSourceUnavailableError(unavailable[0]?.reason ?? "quote source unavailable");
  }

  for (const result of results) {
    if (result.status !== "ok") continue;
    const quote = result.quote;

    const price = quote.price?.regularMarketPrice ?? 0;
    const shares = quote.defaultKeyStatistics?.sharesOutstanding ?? 0;
    const revenue = quote.financialData?.totalRevenue ?? 0;
    const growth = quote.financialData?.revenueGrowth ?? 0;
    const debt = quote.financialData?.totalDebt ?? 0;
    const cash = quote.financialData?.totalCash ?? 0;

    const marketCap = price * shares;
    const ev = marketCap + debt - cash;
    if (revenue > 0 && ev > 0) {
      evValues.push(Math.round((ev / revenue) * 10) / 10);
    }
    if (growth > 0) {
      growthValues.push(Math.round(growth * 1000) / 10);
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
  };
}
