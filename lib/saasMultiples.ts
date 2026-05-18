/**
 * SaaS valuation multiples computed from yahoo-finance2.
 * Tracks a fixed basket of public SaaS companies to provide a
 * current market valuation reference for the fundraising guidance.
 *
 * $0 cost — no API key, no subscription, just Yahoo Finance data.
 */

import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

/* Representative SaaS basket covering different stages and sub-sectors */
const SAAS_BASKET = [
  "SNOW",   // Snowflake — data cloud
  "SHOP",   // Shopify — commerce
  "CRM",    // Salesforce — enterprise CRM
  "HUBS",   // HubSpot — CRM/marketing
  "MDB",    // MongoDB — database
  "DDOG",   // Datadog — observability
  "TEAM",   // Atlassian — collaboration
  "WDAY",   // Workday — HCM/finance
  "NOW",    // ServiceNow — IT workflow
  "ZS",     // Zscaler — security
  "CFLT",   // Confluent — data streaming
  "TOST",   // Toast — restaurant POS
  "GTLB",   // GitLab — DevOps
  "NET",    // Cloudflare — edge/security
  "FRSH",   // Freshworks — CX
] as const;

export type SaaSValuationSnapshot = {
  medianEvToRevenue: number | null;
  medianRevenueGrowth: number | null;
  companyCount: number;
  fetchedAt: string;
  components: Array<{ symbol: string; evToRevenue: number | null; revenueGrowth: number | null }>;
};

/**
 * Fetch current valuation multiples for the SaaS basket.
 * Uses quoteSummary to get enterprise value, total revenue, and revenue growth.
 */
export async function fetchSaaSValuations(): Promise<SaaSValuationSnapshot> {
  const components: SaaSValuationSnapshot["components"] = [];

  for (const symbol of SAAS_BASKET) {
    try {
      const summary = await yf.quoteSummary(symbol, {
        modules: ["price", "financialData", "defaultKeyStatistics"],
      });

      const price = summary.price?.regularMarketPrice ?? 0;
      const sharesOutstanding = summary.defaultKeyStatistics?.sharesOutstanding ?? 0;
      const totalRevenue = summary.financialData?.totalRevenue ?? 0;
      const revenueGrowth = summary.financialData?.revenueGrowth ?? 0;
      const totalDebt = summary.financialData?.totalDebt ?? 0;
      const cash = summary.financialData?.totalCash ?? 0;

      const marketCap = price * sharesOutstanding;
      const enterpriseValue = marketCap + totalDebt - cash;
      const evToRevenue = totalRevenue > 0 ? enterpriseValue / totalRevenue : null;

      components.push({
        symbol,
        evToRevenue: evToRevenue ? Math.round(evToRevenue * 10) / 10 : null,
        revenueGrowth: revenueGrowth ? Math.round(revenueGrowth * 1000) / 10 : null,
      });
    } catch {
      components.push({ symbol, evToRevenue: null, revenueGrowth: null });
    }
  }

  const valid = components.filter((c) => c.evToRevenue !== null);
  const evValues = valid.map((c) => c.evToRevenue!);
  const growthValues = valid.filter((c) => c.revenueGrowth !== null).map((c) => c.revenueGrowth!);

  const median = (values: number[]) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  return {
    medianEvToRevenue: median(evValues),
    medianRevenueGrowth: median(growthValues),
    companyCount: valid.length,
    fetchedAt: new Date().toISOString(),
    components,
  };
}
