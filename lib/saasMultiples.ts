/**
 * SaaS valuation multiples — fetched directly from Yahoo Finance API.
 * No npm dependencies, no build-time bundling issues.
 * $0 cost — no API key required for basic quote data.
 */

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

type YahooQuote = {
  price?: { regularMarketPrice?: number; marketCap?: number };
  defaultKeyStatistics?: { sharesOutstanding?: number };
  financialData?: {
    totalRevenue?: number; revenueGrowth?: number;
    totalDebt?: number; totalCash?: number;
  };
  cashflowStatementHistory?: {
    cashflowStatements?: Array<{
      operatingCashFlow?: { raw?: number };
      capitalExpenditure?: { raw?: number };
    }>;
  };
};

export async function fetchQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,financialData,defaultKeyStatistics,cashflowStatementHistory`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json() as { quoteSummary?: { result?: [YahooQuote] } };
    return data?.quoteSummary?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchSaaSValuations(): Promise<SaaSValuationSnapshot> {
  const evValues: number[] = [];
  const growthValues: number[] = [];

  for (const symbol of SAAS_BASKET) {
    const quote = await fetchQuote(symbol);
    if (!quote) continue;

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
