/**
 * The companies and roles the company pages cover.
 *
 * A pilot, on purpose: mass-produced pages that add little can cost a site its standing with
 * search engines, the pages that work today included, so this grows only after these earn their
 * place. Every company files US accounts and is no bank or insurer, so its filing can be read
 * (`deriveSecCompanyFigures`). `fiscalYearEnd` is the SEC's, MMDD.
 */
import type { DecisionArea } from "../report/boundedDecisionRules";

export type CompanyEntry = {
  slug: string;
  /** The name a reader searches, not the filed one ("MICROSOFT CORP"). */
  name: string;
  ticker: string;
  cik: number;
  fiscalYearEnd: string;
};

export const COMPANIES: readonly CompanyEntry[] = [
  { slug: "microsoft", name: "Microsoft", ticker: "MSFT", cik: 789019, fiscalYearEnd: "0630" },
  { slug: "google", name: "Google", ticker: "GOOGL", cik: 1652044, fiscalYearEnd: "1231" },
  { slug: "amazon", name: "Amazon", ticker: "AMZN", cik: 1018724, fiscalYearEnd: "1231" },
  { slug: "apple", name: "Apple", ticker: "AAPL", cik: 320193, fiscalYearEnd: "0926" },
  { slug: "meta", name: "Meta", ticker: "META", cik: 1326801, fiscalYearEnd: "1231" },
  { slug: "netflix", name: "Netflix", ticker: "NFLX", cik: 1065280, fiscalYearEnd: "1231" },
  { slug: "nvidia", name: "NVIDIA", ticker: "NVDA", cik: 1045810, fiscalYearEnd: "0131" },
  { slug: "oracle", name: "Oracle", ticker: "ORCL", cik: 1341439, fiscalYearEnd: "0531" },
  { slug: "salesforce", name: "Salesforce", ticker: "CRM", cik: 1108524, fiscalYearEnd: "0131" },
  { slug: "adobe", name: "Adobe", ticker: "ADBE", cik: 796343, fiscalYearEnd: "1127" },
  { slug: "intel", name: "Intel", ticker: "INTC", cik: 50863, fiscalYearEnd: "1226" },
  { slug: "amd", name: "AMD", ticker: "AMD", cik: 2488, fiscalYearEnd: "1226" },
  { slug: "cisco", name: "Cisco", ticker: "CSCO", cik: 858877, fiscalYearEnd: "0731" },
  { slug: "ibm", name: "IBM", ticker: "IBM", cik: 51143, fiscalYearEnd: "1231" },
  { slug: "uber", name: "Uber", ticker: "UBER", cik: 1543151, fiscalYearEnd: "1231" },
  { slug: "lyft", name: "Lyft", ticker: "LYFT", cik: 1759509, fiscalYearEnd: "1231" },
  { slug: "airbnb", name: "Airbnb", ticker: "ABNB", cik: 1559720, fiscalYearEnd: "1231" },
  { slug: "doordash", name: "DoorDash", ticker: "DASH", cik: 1792789, fiscalYearEnd: "1231" },
  { slug: "shopify", name: "Shopify", ticker: "SHOP", cik: 1594805, fiscalYearEnd: "1231" },
  { slug: "snowflake", name: "Snowflake", ticker: "SNOW", cik: 1640147, fiscalYearEnd: "0131" },
  { slug: "datadog", name: "Datadog", ticker: "DDOG", cik: 1561550, fiscalYearEnd: "1231" },
  { slug: "hubspot", name: "HubSpot", ticker: "HUBS", cik: 1404655, fiscalYearEnd: "1231" },
  { slug: "mongodb", name: "MongoDB", ticker: "MDB", cik: 1441816, fiscalYearEnd: "0131" },
  { slug: "atlassian", name: "Atlassian", ticker: "TEAM", cik: 1650372, fiscalYearEnd: "0630" },
  { slug: "workday", name: "Workday", ticker: "WDAY", cik: 1327811, fiscalYearEnd: "0131" },
  { slug: "servicenow", name: "ServiceNow", ticker: "NOW", cik: 1373715, fiscalYearEnd: "1231" },
  { slug: "cloudflare", name: "Cloudflare", ticker: "NET", cik: 1477333, fiscalYearEnd: "1231" },
  { slug: "toast", name: "Toast", ticker: "TOST", cik: 1650164, fiscalYearEnd: "1231" },
  { slug: "docusign", name: "DocuSign", ticker: "DOCU", cik: 1261333, fiscalYearEnd: "0131" },
  { slug: "zoom", name: "Zoom", ticker: "ZM", cik: 1585521, fiscalYearEnd: "0131" },
  { slug: "okta", name: "Okta", ticker: "OKTA", cik: 1660134, fiscalYearEnd: "0131" },
  { slug: "pinterest", name: "Pinterest", ticker: "PINS", cik: 1506293, fiscalYearEnd: "1231" },
  { slug: "snap", name: "Snap", ticker: "SNAP", cik: 1564408, fiscalYearEnd: "1231" },
  { slug: "reddit", name: "Reddit", ticker: "RDDT", cik: 1713445, fiscalYearEnd: "1231" },
  { slug: "roku", name: "Roku", ticker: "ROKU", cik: 1428439, fiscalYearEnd: "1231" },
  { slug: "ebay", name: "eBay", ticker: "EBAY", cik: 1065088, fiscalYearEnd: "1231" },
  { slug: "paypal", name: "PayPal", ticker: "PYPL", cik: 1633917, fiscalYearEnd: "1231" },
  { slug: "block", name: "Block", ticker: "XYZ", cik: 1512673, fiscalYearEnd: "1231" },
  { slug: "coinbase", name: "Coinbase", ticker: "COIN", cik: 1679788, fiscalYearEnd: "1231" },
  { slug: "intuit", name: "Intuit", ticker: "INTU", cik: 896878, fiscalYearEnd: "0731" },
  { slug: "palantir", name: "Palantir", ticker: "PLTR", cik: 1321655, fiscalYearEnd: "1231" },
  { slug: "rivian", name: "Rivian", ticker: "RIVN", cik: 1874178, fiscalYearEnd: "1231" },
  { slug: "lucid", name: "Lucid", ticker: "LCID", cik: 1811210, fiscalYearEnd: "1231" },
  { slug: "tesla", name: "Tesla", ticker: "TSLA", cik: 1318605, fiscalYearEnd: "1231" },
  { slug: "walmart", name: "Walmart", ticker: "WMT", cik: 104169, fiscalYearEnd: "0131" },
  { slug: "target", name: "Target", ticker: "TGT", cik: 27419, fiscalYearEnd: "0201" },
  { slug: "nike", name: "Nike", ticker: "NKE", cik: 320187, fiscalYearEnd: "0531" },
  { slug: "disney", name: "Disney", ticker: "DIS", cik: 1744489, fiscalYearEnd: "1003" },
  { slug: "booking", name: "Booking Holdings", ticker: "BKNG", cik: 1075531, fiscalYearEnd: "1231" },
  { slug: "dell", name: "Dell", ticker: "DELL", cik: 1571996, fiscalYearEnd: "0129" },
];

export type CompanyRole = {
  slug: string;
  /** Mid-sentence: "for product managers at Microsoft". */
  label: string;
  /** Leading a link or a breadcrumb. */
  title: string;
  /** The role in `decisionDomainCatalog` its decisions come from. */
  catalogSlug: string;
  /** The areas whose rules bear on those decisions, the closest first. */
  areas: readonly DecisionArea[];
};

export const COMPANY_ROLES: readonly CompanyRole[] = [
  { slug: "product-managers", label: "product managers", title: "Product managers", catalogSlug: "product", areas: ["product-tempo"] },
  { slug: "engineering-managers", label: "engineering managers", title: "Engineering managers", catalogSlug: "engineering", areas: ["product-tempo", "hiring"] },
  { slug: "growth-leaders", label: "growth and sales leaders", title: "Growth and sales leaders", catalogSlug: "growth-gtm", areas: ["expansion-bets", "burn-discipline"] },
];

export const findCompany = (slug: string) => COMPANIES.find((company) => company.slug === slug);
export const findCompanyRole = (slug: string) => COMPANY_ROLES.find((role) => role.slug === slug);
