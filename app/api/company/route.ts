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

  const quote = await fetchQuote(ticker);
  if (!quote) {
    return NextResponse.json({ error: `No data for ${ticker}` }, { status: 404 });
  }

  const revenue = quote.financialData?.totalRevenue;
  const growth = quote.financialData?.revenueGrowth;
  const debt = quote.financialData?.totalDebt;
  const cash = quote.financialData?.totalCash;
  const price = quote.price?.regularMarketPrice;
  const shares = quote.defaultKeyStatistics?.sharesOutstanding;
  const marketCap = price && shares ? price * shares : quote.price?.marketCap;

  const fcfMargin = revenue && revenue > 0
    ? Math.round(((cash ?? 0) - (debt ?? 0)) / revenue * 1000) / 10
    : null;

  const ev = marketCap && (marketCap > 0) ? marketCap + (debt ?? 0) - (cash ?? 0) : null;
  const evToRevenue = ev && revenue && revenue > 0
    ? Math.round((ev / revenue) * 10) / 10
    : null;

  const peerData: Array<{ symbol: string; growth?: number; fcfMargin?: number | null }> = [];
  for (const symbol of SAAS_BASKET) {
    if (symbol === ticker) continue;
    const peerQuote = await fetchQuote(symbol);
    if (!peerQuote) continue;
    const pRev = peerQuote.financialData?.totalRevenue;
    const pCash = peerQuote.financialData?.totalCash;
    const pDebt = peerQuote.financialData?.totalDebt;
    peerData.push({
      symbol,
      growth: peerQuote.financialData?.revenueGrowth,
      fcfMargin: pRev && pRev > 0 ? Math.round(((pCash ?? 0) - (pDebt ?? 0)) / pRev * 1000) / 10 : null,
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
