import { NextResponse } from "next/server";
import { fetchQuote, SAAS_BASKET } from "../../../lib/saasMultiples";

export const runtime = "edge";

type CompanyData = {
  ticker: string;
  price?: number;
  marketCap?: number;
  revenue?: number;
  revenueGrowth?: number;
  totalDebt?: number;
  totalCash?: number;
  fcfMargin?: number | null;
  evToRevenue?: number | null;
  peerGrowthRank?: { rank: number; total: number; percentile: number };
  peerFcfRank?: { rank: number; total: number; percentile: number };
};

function computePeerRanks(
  ticker: string,
  companyGrowth: number | undefined,
  companyFcf: number | null | undefined,
  peers: Array<{ symbol: string; growth?: number; fcfMargin?: number | null }>,
) {
  if (companyGrowth == null) return {};

  const growthRanked = [...peers].sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0));
  const growthRank = growthRanked.findIndex((p) => p.symbol === ticker) + 1;

  const fcfRanked = [...peers].filter((p) => p.fcfMargin != null).sort((a, b) => (b.fcfMargin ?? 0) - (a.fcfMargin ?? 0));
  const fcfRank = companyFcf != null ? fcfRanked.findIndex((p) => p.symbol === ticker) + 1 : 0;

  return {
    peerGrowthRank: growthRank > 0 ? { rank: growthRank, total: peers.length, percentile: Math.round(((peers.length - growthRank) / peers.length) * 100) } : undefined,
    peerFcfRank: fcfRank > 0 ? { rank: fcfRank, total: fcfRanked.length, percentile: Math.round(((fcfRanked.length - fcfRank) / fcfRanked.length) * 100) } : undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "").toUpperCase().trim();

  if (!ticker || ticker.length > 5) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }

  const result = await fetchQuote(ticker);
  // "No data for MSFT" was the answer for every ticker, including the ones the
  // source knows perfectly well -- it was rate-limiting us. Say which it is.
  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "Market data source unavailable", detail: result.reason },
      { status: 503 },
    );
  }
  if (result.status === "missing") {
    return NextResponse.json({ error: `No data for ${ticker}` }, { status: 404 });
  }

  const quote = result.quote;

  const revenue = quote.financialData?.totalRevenue;
  const growth = quote.financialData?.revenueGrowth;
  const debt = quote.financialData?.totalDebt;
  const cash = quote.financialData?.totalCash;
  const price = quote.price?.regularMarketPrice;
  const shares = quote.defaultKeyStatistics?.sharesOutstanding;
  const marketCap = price && shares ? price * shares : quote.price?.marketCap;

  const ocf = quote.cashflowStatementHistory?.cashflowStatements?.[0]?.operatingCashFlow?.raw;
  const capex = quote.cashflowStatementHistory?.cashflowStatements?.[0]?.capitalExpenditure?.raw;
  const fcf = ocf != null && capex != null ? ocf - Math.abs(capex) : null;
  const fcfMargin = fcf != null && revenue && revenue > 0
    ? Math.round((fcf / revenue) * 1000) / 10
    : null;

  const ev = marketCap && (marketCap > 0) ? marketCap + (debt ?? 0) - (cash ?? 0) : null;
  const evToRevenue = ev && revenue && revenue > 0
    ? Math.round((ev / revenue) * 10) / 10
    : null;

  const peerSymbols = SAAS_BASKET.filter((s) => s !== ticker);
  const peerResults = await Promise.all(peerSymbols.map((s) => fetchQuote(s)));

  const peerData: Array<{ symbol: string; growth?: number; fcfMargin?: number | null }> = [];
  for (let i = 0; i < peerSymbols.length; i++) {
    const peerResult = peerResults[i];
    if (peerResult?.status !== "ok") continue;
    const peerQuote = peerResult.quote;
    const pRev = peerQuote.financialData?.totalRevenue;
    const pOcf = peerQuote.cashflowStatementHistory?.cashflowStatements?.[0]?.operatingCashFlow?.raw;
    const pCapex = peerQuote.cashflowStatementHistory?.cashflowStatements?.[0]?.capitalExpenditure?.raw;
    const pFcf = pOcf != null && pCapex != null ? pOcf - Math.abs(pCapex) : null;
    peerData.push({
      symbol: peerSymbols[i],
      growth: peerQuote.financialData?.revenueGrowth,
      fcfMargin: pFcf != null && pRev && pRev > 0 ? Math.round((pFcf / pRev) * 1000) / 10 : null,
    });
  }

  const allPeers = [...peerData, { symbol: ticker, growth, fcfMargin }];
  const ranks = computePeerRanks(ticker, growth, fcfMargin, allPeers);

  const data: CompanyData = {
    ticker,
    price,
    marketCap,
    revenue,
    revenueGrowth: growth ? Math.round(growth * 1000) / 10 : undefined,
    totalDebt: debt,
    totalCash: cash,
    fcfMargin,
    evToRevenue,
    ...ranks,
  };

  return NextResponse.json(data);
}
