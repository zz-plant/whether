/**
 * Company fundamentals from SEC EDGAR's XBRL company facts.
 *
 * The comps need trailing revenue, revenue growth, cash, debt and a share count for each
 * company. EDGAR publishes all of them, as filed, at a documented and keyless endpoint
 * (https://www.sec.gov/search-filings/edgar-application-programming-interfaces). Its terms are a
 * User-Agent naming the caller with a contact address, and no more than ten requests a second.
 * EDGAR has no price; `fetchCboeDelayedPrice` supplies that and `lib/saasMultiples.ts` combines
 * the two.
 *
 * A company-facts file is large (Salesforce's is 4.7MB of JSON), so the derived figures — a few
 * numbers per company — are what gets cached, for half a day: filings arrive quarterly.
 */

import { z } from "zod";
import type { KvNamespace } from "../runtime/kv";
import { getJson } from "../runtime/kv";
import { describeFetchError, releaseBody, type UpstreamRead } from "./upstream";

/** SEC's fair-access policy: an automated caller names itself and a contact. */
const SEC_USER_AGENT = "WhetherDataBot/1.0 (+https://whether.work; brief@whether.work)";

const companyFactsUrl = (cik: number) =>
  `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, "0")}.json`;

type SecFundamentals = {
  /** Revenue over the four most recent fiscal quarters, USD. */
  revenueTtm: number;
  /** The latest quarter's revenue against the same quarter a year earlier, as a fraction; null without that quarter. */
  revenueGrowth: number | null;
  /** Cash, cash equivalents and short-term investments on the latest balance sheet, USD. */
  cash: number;
  /** Borrowings on the latest balance sheet, convertible notes included and leases not, USD. */
  debt: number;
  sharesOutstanding: number;
  /** End of the latest quarter the revenue covers, YYYY-MM-DD. */
  periodEnd: string;
};

/* ---------- Reading company facts ---------- */

type FactRow = { start?: string; end: string; val: number; filed?: string };

const factRowSchema = z.object({
  start: z.string().optional(),
  end: z.string(),
  val: z.number(),
  filed: z.string().optional(),
});

const conceptSchema = z.object({ units: z.record(z.string(), z.array(z.unknown())) });

/* Only the envelope is validated up front; the few concepts read are validated one at a time,
   so a 4.7MB file costs a parse of what is used rather than of every row it carries. */
const companyFactsSchema = z.object({
  facts: z.object({
    "us-gaap": z.record(z.string(), z.unknown()).optional(),
    "ifrs-full": z.record(z.string(), z.unknown()).optional(),
    dei: z.record(z.string(), z.unknown()).optional(),
  }),
});

type Taxonomy = Record<string, unknown> | undefined;

const readRows = (taxonomy: Taxonomy, concept: string, unit: string): FactRow[] => {
  const parsed = conceptSchema.safeParse(taxonomy?.[concept]);
  if (!parsed.success) return [];
  const rows: FactRow[] = [];
  for (const raw of parsed.data.units[unit] ?? []) {
    const row = factRowSchema.safeParse(raw);
    if (row.success && Number.isFinite(row.data.val)) rows.push(row.data);
  }
  return rows;
};

/** One value per period, the most recently filed: a restatement replaces what it restates. */
const latestFiledByPeriod = (rows: FactRow[]): FactRow[] => {
  const byPeriod = new Map<string, FactRow>();
  for (const row of rows) {
    const key = `${row.start ?? ""}/${row.end}`;
    const held = byPeriod.get(key);
    if (!held || (row.filed ?? "") >= (held.filed ?? "")) byPeriod.set(key, row);
  }
  return [...byPeriod.values()];
};

const DAY_MS = 86_400_000;
const daysSpanned = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1;
const daysApart = (earlier: string, later: string) => Math.round((Date.parse(later) - Date.parse(earlier)) / DAY_MS);

const isQuarterSpan = (days: number) => days >= 80 && days <= 100;
const isYearSpan = (days: number) => days >= 350 && days <= 380;

type Quarter = { end: string; value: number };

/**
 * Discrete fiscal quarters, newest first. A 10-K reports the year, rarely its fourth quarter on
 * its own, so a year with its three earlier quarters on file yields the fourth by subtraction.
 */
const quarterlySeries = (rows: FactRow[]): Quarter[] => {
  const periods = latestFiledByPeriod(rows);
  const quarters = new Map<string, number>();
  for (const row of periods) {
    if (row.start && isQuarterSpan(daysSpanned(row.start, row.end))) quarters.set(row.end, row.val);
  }
  for (const year of periods) {
    const start = year.start;
    if (!start || !isYearSpan(daysSpanned(start, year.end)) || quarters.has(year.end)) continue;
    const inside = [...quarters].filter(([end]) => end > start && end < year.end);
    if (inside.length !== 3) continue;
    quarters.set(year.end, year.val - inside.reduce((sum, [, value]) => sum + value, 0));
  }
  return [...quarters]
    .map(([end, value]) => ({ end, value }))
    .sort((a, b) => b.end.localeCompare(a.end));
};

/** The revenue concept a company files under has changed over the years; the one with the newest quarter wins. */
const REVENUE_CONCEPTS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "SalesRevenueNet",
];

const latestRevenueQuarters = (gaap: Taxonomy): Quarter[] => {
  let best: Quarter[] = [];
  for (const concept of REVENUE_CONCEPTS) {
    const series = quarterlySeries(readRows(gaap, concept, "USD"));
    if (series.length > 0 && (best.length === 0 || series[0].end > best[0].end)) best = series;
  }
  return best;
};

/** The latest filed value of an instant (balance-sheet) concept on one date, or null. */
const instantOn = (gaap: Taxonomy, concept: string, date: string): number | null => {
  const rows = latestFiledByPeriod(readRows(gaap, concept, "USD")).filter((row) => !row.start && row.end === date);
  return rows.length > 0 ? rows[0].val : null;
};

const latestInstantDate = (gaap: Taxonomy, concepts: string[]): string | null => {
  let latest: string | null = null;
  for (const concept of concepts) {
    for (const row of readRows(gaap, concept, "USD")) {
      if (!row.start && (latest === null || row.end > latest)) latest = row.end;
    }
  }
  return latest;
};

const CASH_CONCEPTS = ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsAndShortTermInvestments"];
const SHORT_TERM_INVESTMENT_CONCEPTS = [
  "ShortTermInvestments",
  "MarketableSecuritiesCurrent",
  "AvailableForSaleSecuritiesDebtSecuritiesCurrent",
  "DebtSecuritiesAvailableForSaleExcludingAccruedInterestCurrent",
];

const cashOn = (gaap: Taxonomy, date: string): number => {
  const combined = instantOn(gaap, "CashCashEquivalentsAndShortTermInvestments", date);
  if (combined !== null) return combined;
  const cash = instantOn(gaap, "CashAndCashEquivalentsAtCarryingValue", date) ?? 0;
  // The first investment concept on file for the date: companies that tag two of them are
  // usually tagging the same balance twice.
  for (const concept of SHORT_TERM_INVESTMENT_CONCEPTS) {
    const investments = instantOn(gaap, concept, date);
    if (investments !== null) return cash + investments;
  }
  return cash;
};

/**
 * Companies tag the same long-term borrowings under different concepts, and some tag them
 * under two. Each group below is one complete reading of long-term debt; the largest is taken,
 * which counts the notes once instead of adding groups that overlap.
 */
const LONG_TERM_DEBT_READINGS = [
  ["LongTermDebt"],
  ["LongTermDebtNoncurrent", "LongTermDebtCurrent"],
  ["ConvertibleDebtNoncurrent", "ConvertibleDebtCurrent", "ConvertibleNotesPayableCurrent"],
  ["ConvertibleLongTermNotesPayable", "ConvertibleNotesPayableCurrent"],
  ["ConvertibleNotesPayable"],
  ["ConvertibleDebt"],
  ["SeniorNotes"],
];

/** Borrowings no long-term reading includes: a drawn facility or commercial paper. */
const SHORT_TERM_BORROWING_CONCEPTS = ["ShortTermBorrowings", "CommercialPaper"];

const debtOn = (gaap: Taxonomy, date: string): number => {
  let longTerm = 0;
  for (const reading of LONG_TERM_DEBT_READINGS) {
    const values = reading.map((concept) => instantOn(gaap, concept, date)).filter((value) => value !== null);
    if (values.length > 0) longTerm = Math.max(longTerm, values.reduce((sum, value) => sum + value, 0));
  }
  const shortTerm = SHORT_TERM_BORROWING_CONCEPTS.map((concept) => instantOn(gaap, concept, date)).find((value) => value !== null) ?? 0;
  return longTerm + shortTerm;
};

/**
 * Shares outstanding. The weighted-average basic count is on every 10-Q and 10-K and spans
 * every share class, which EPS requires. The cover-page count is more recent but is filed per
 * class by multi-class companies (and so is absent from company facts for them), and some
 * filers stopped tagging it years ago — Workday's last is from 2018. It is preferred only when
 * it is newer than the weighted count and agrees with it to within a tenth.
 */
const sharesOutstanding = (gaap: Taxonomy, dei: Taxonomy): number | null => {
  const weighted = latestFiledByPeriod(readRows(gaap, "WeightedAverageNumberOfSharesOutstandingBasic", "shares"))
    .filter((row): row is FactRow & { start: string } => row.start !== undefined)
    .sort((a, b) => b.end.localeCompare(a.end) || daysSpanned(a.start, a.end) - daysSpanned(b.start, b.end))[0];
  const cover = latestFiledByPeriod(readRows(dei, "EntityCommonStockSharesOutstanding", "shares"))
    .sort((a, b) => b.end.localeCompare(a.end))[0];

  if (!weighted) return cover && cover.val > 0 ? cover.val : null;
  if (cover && cover.end > weighted.end && cover.val > weighted.val * 0.9 && cover.val < weighted.val * 1.1) {
    return cover.val;
  }
  return weighted.val > 0 ? weighted.val : null;
};

/** The sum of the latest four quarters, or null unless they run consecutively. */
const trailingFourQuarters = (quarters: Quarter[]): number | null => {
  const trailing = quarters.slice(0, 4);
  const consecutive = trailing.length === 4
    && trailing.every((quarter, index) => index === 0 || isQuarterSpan(daysApart(quarter.end, trailing[index - 1].end)));
  return consecutive ? trailing.reduce((sum, quarter) => sum + quarter.value, 0) : null;
};

const growthOnYearAgo = (quarters: Quarter[]): number | null => {
  const latest = quarters[0];
  if (!latest) return null;
  const yearAgo = quarters.find((quarter) => isYearSpan(daysApart(quarter.end, latest.end)));
  return yearAgo && yearAgo.value > 0 ? latest.value / yearAgo.value - 1 : null;
};

/** A company whose latest quarter ended longer ago than this has stopped filing (acquired, delisted). */
export const STALE_PERIOD_DAYS = 200;

/**
 * The figures the comps need from one company-facts document, or the reason they cannot be
 * read from it. Pure: the caller fetches, this derives.
 */
export function deriveSecFundamentals(companyFacts: unknown, now: Date): UpstreamRead<SecFundamentals> {
  const parsed = companyFactsSchema.safeParse(companyFacts);
  if (!parsed.success) return { status: "missing", reason: "company facts have an unexpected shape" };
  const gaap = parsed.data.facts["us-gaap"];
  const dei = parsed.data.facts.dei;

  const quarters = latestRevenueQuarters(gaap);
  const latest = quarters[0];
  if (!latest) return { status: "missing", reason: "no quarterly revenue on file" };
  if (daysApart(latest.end, now.toISOString().slice(0, 10)) > STALE_PERIOD_DAYS) {
    return { status: "missing", reason: `latest revenue is for the quarter ended ${latest.end}` };
  }

  const revenueTtm = trailingFourQuarters(quarters);
  if (revenueTtm === null) return { status: "missing", reason: "four consecutive quarters of revenue are not on file" };
  if (!(revenueTtm > 0)) return { status: "missing", reason: "trailing revenue is not positive" };

  const revenueGrowth = growthOnYearAgo(quarters);

  const balanceSheetDate = latestInstantDate(gaap, CASH_CONCEPTS);
  const shares = sharesOutstanding(gaap, dei);
  if (!balanceSheetDate || shares === null) return { status: "missing", reason: "no balance sheet or share count on file" };

  return {
    status: "ok",
    value: {
      revenueTtm,
      revenueGrowth,
      cash: cashOn(gaap, balanceSheetDate),
      debt: debtOn(gaap, balanceSheetDate),
      sharesOutstanding: shares,
      periodEnd: latest.end,
    },
  };
}

/* ---------- Fetching, with a cache of the derived figures ---------- */

const CACHE_PREFIX = "comps:sec:v1:";
/** Filings arrive quarterly; twice a day finds a new one within hours of its filing. */
const CACHE_TTL_SECONDS = 12 * 60 * 60;
/** A company with nothing usable stays that way until it files again. */
const MISSING_TTL_SECONDS = 6 * 60 * 60;

const secFundamentalsSchema = z.object({
  revenueTtm: z.number(),
  revenueGrowth: z.number().nullable(),
  cash: z.number(),
  debt: z.number(),
  sharesOutstanding: z.number(),
  periodEnd: z.string(),
});

/* Validated on the way out of KV: a record an older deploy wrote in another shape reads as a miss. */
const cachedRecordSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), value: secFundamentalsSchema }),
  z.object({ status: z.literal("missing"), reason: z.string() }),
]);

type FundamentalsCache = Pick<KvNamespace, "get" | "put">;

const readCached = async (cache: FundamentalsCache, cik: number): Promise<UpstreamRead<SecFundamentals> | null> => {
  try {
    return await getJson(cache, CACHE_PREFIX + cik, cachedRecordSchema);
  } catch {
    return null;
  }
};

const writeCached = async (cache: FundamentalsCache, cik: number, result: UpstreamRead<SecFundamentals>) => {
  // A refusal says nothing about the company; caching it would hide the company for hours.
  if (result.status === "unavailable") return;
  try {
    await cache.put(CACHE_PREFIX + cik, JSON.stringify(result), {
      expirationTtl: result.status === "ok" ? CACHE_TTL_SECONDS : MISSING_TTL_SECONDS,
    });
  } catch {
    /* A cache write failure costs one more upstream read, nothing else. */
  }
};

const fetchCompanyFacts = async (cik: number): Promise<UpstreamRead<unknown>> => {
  let res: Response;
  try {
    res = await fetch(companyFactsUrl(cik), {
      headers: { "user-agent": SEC_USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
  } catch (error) {
    return { status: "unavailable", reason: `SEC EDGAR: ${describeFetchError(error, "company facts fetch failed")}` };
  }

  if (res.status === 404) {
    await releaseBody(res);
    return { status: "missing", reason: `SEC EDGAR has no company facts for CIK ${cik}` };
  }
  if (!res.ok) {
    await releaseBody(res);
    return { status: "unavailable", reason: `SEC EDGAR returned ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { status: "unavailable", reason: "SEC EDGAR returned an unreadable body" };
  }
  return { status: "ok", value: body };
};

const fetchFromEdgar = async (cik: number, now: Date): Promise<UpstreamRead<SecFundamentals>> => {
  const facts = await fetchCompanyFacts(cik);
  return facts.status === "ok" ? deriveSecFundamentals(facts.value, now) : facts;
};

/** One company's fundamentals, from the cache when a fresh copy exists. */
const fetchSecFundamentals = async (cik: number, cache: FundamentalsCache | null, now: Date): Promise<UpstreamRead<SecFundamentals>> => {
  if (cache) {
    const cached = await readCached(cache, cik);
    if (cached) return cached;
  }
  const result = await fetchFromEdgar(cik, now);
  if (cache) await writeCached(cache, cik, result);
  return result;
};

/**
 * How many company-facts files are parsed at once. Each is up to a few megabytes of JSON and
 * several times that once parsed, against a Worker's 128MB, so the basket is read three at a
 * time rather than all at once; three also keeps well inside SEC's ten requests a second.
 */
const FETCH_CONCURRENCY = 3;

/**
 * Fundamentals for several companies, in order. Off Cloudflare (tests, scripts) there is no
 * cache and every call reads EDGAR.
 */
export async function fetchSecFundamentalsBatch(
  ciks: readonly number[],
  options: { cache: FundamentalsCache | null; now?: Date },
): Promise<Array<UpstreamRead<SecFundamentals>>> {
  const now = options.now ?? new Date();
  const results: Array<UpstreamRead<SecFundamentals>> = [];
  let next = 0;
  const lane = async () => {
    while (next < ciks.length) {
      const index = next;
      next += 1;
      results[index] = await fetchSecFundamentals(ciks[index], options.cache, now);
    }
  };
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, ciks.length) }, lane));
  return results;
}

/* ---------- One company's filing, by ticker ---------- */

/**
 * Why a filing cannot stand in for a company's own figures. Each is a fact about the filer, so
 * each is cached: asking again before it files again gets the same answer.
 */
type SecFilingRefusal =
  | "unknown-ticker"
  | "international-filer"
  | "financial-company"
  | "no-recent-filing"
  | "incomplete-filing";

export const secCompanyFiguresSchema = z.object({
  cashUsd: z.number(),
  debtUsd: z.number().nullable(),
  debtAsOf: z.string().nullable(),
  longTermInvestmentsUsd: z.number(),
  revenueTtmUsd: z.number(),
  operatingCashFlowTtmUsd: z.number(),
  capitalSpendingTtmUsd: z.number().nullable(),
  stockCompensationTtmUsd: z.number().nullable(),
  researchFiscalYearUsd: z.number().nullable(),
  researchPriorFiscalYearUsd: z.number().nullable(),
  researchFiscalYearEnd: z.string().nullable(),
  revenueGrowth: z.number().nullable(),
  periodEnd: z.string(),
});

export type SecCompanyFigures = {
  cashUsd: number;
  /** Null when no borrowings are on file, which is not the same as none: Oracle tags its $130B only at year-end. */
  debtUsd: number | null;
  /** The date of that debt figure, which can be up to a year before `periodEnd`. */
  debtAsOf: string | null;
  /** Securities held past a year. Against debt they count, as spending money they do not. */
  longTermInvestmentsUsd: number;
  /** Zero for a company with no revenue on file. */
  revenueTtmUsd: number;
  /** Negative when operations consumed cash. */
  operatingCashFlowTtmUsd: number;
  /** Null when none is on file for the same period, which is not the same as none spent. */
  capitalSpendingTtmUsd: number | null;
  stockCompensationTtmUsd: number | null;
  /** The latest full fiscal year's R&D, the year before it, and when the year ended. Null when not on file. */
  researchFiscalYearUsd: number | null;
  researchPriorFiscalYearUsd: number | null;
  researchFiscalYearEnd: string | null;
  revenueGrowth: number | null;
  /** The balance sheet's date, YYYY-MM-DD. */
  periodEnd: string;
};

type SecCompanyFiling = SecCompanyFigures & { ticker: string; name: string };

type SecFilingRead<T> =
  | { status: "ok"; value: T }
  | { status: "refused"; refusal: SecFilingRefusal }
  | { status: "unavailable"; reason: string };

const OPERATING_CASH_FLOW_CONCEPTS = [
  "NetCashProvidedByUsedInOperatingActivities",
  "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
];

/** Liabilities only a bank or an insurer carries. Its cash is held against them, so it is no runway. */
const FINANCIAL_COMPANY_CONCEPTS = ["Deposits", "PremiumsEarnedNet", "LiabilityForFuturePolicyBenefits"];

const CAPITAL_SPENDING_CONCEPTS = [
  "PaymentsToAcquirePropertyPlantAndEquipment",
  "PaymentsToAcquireProductiveAssets",
  "PaymentsForCapitalImprovements",
  "PaymentsToAcquireOtherProductiveAssets",
];

/**
 * A cash-flow line over the trailing year, and the date it runs to.
 *
 * Filings report cash flow year to date (88, 180, 272 days), not by quarter, so `quarterlySeries`
 * would find only the first quarter of any year. A year is the last full year plus this year to
 * date, less the same stretch of last year. A shorter window is not a substitute: a company that
 * burned $145M last year and $23M in the first half reads as 14 months of runway or 45, depending
 * on which it is divided by.
 */
const trailingYearOf = (periods: Array<FactRow & { start: string }>): { value: number; end: string } | null => {
  const span = (row: { start: string; end: string }) => daysSpanned(row.start, row.end);
  const latestEnd = periods.reduce((latest, row) => (row.end > latest ? row.end : latest), "");
  const toDate = periods
    .filter((row) => row.end === latestEnd && span(row) <= 380)
    .sort((a, b) => span(b) - span(a))[0];
  if (!toDate) return null;
  if (isYearSpan(span(toDate))) return { value: toDate.val, end: toDate.end };

  const lastYear = periods.find((row) => isYearSpan(span(row)) && Math.abs(daysApart(row.end, toDate.start)) <= 10);
  const sameStretch = periods.find(
    (row) => isYearSpan(daysApart(row.end, toDate.end)) && Math.abs(span(row) - span(toDate)) <= 10,
  );
  if (!lastYear || !sameStretch) return null;
  return { value: lastYear.val + toDate.val - sameStretch.val, end: toDate.end };
};

/** The first concept with a full trailing year, ending on `end` when one is required: a tag a company stopped using must not answer for this year. */
const trailingFlow = (gaap: Taxonomy, concepts: readonly string[], end?: string): { value: number; end: string } | null => {
  for (const concept of concepts) {
    const periods = latestFiledByPeriod(readRows(gaap, concept, "USD"))
      .filter((row): row is FactRow & { start: string } => row.start !== undefined);
    const trailing = trailingYearOf(periods);
    if (trailing && (!end || trailing.end === end)) return trailing;
  }
  return null;
};

const RESEARCH_CONCEPTS = ["ResearchAndDevelopmentExpense", "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost"];

/** The latest full fiscal year within a year of `end`, and the one before it where it is on file. */
const fiscalYearsOf = (gaap: Taxonomy, concepts: readonly string[], end: string) => {
  for (const concept of concepts) {
    const years = latestFiledByPeriod(readRows(gaap, concept, "USD"))
      .filter((row) => row.start !== undefined && isYearSpan(daysSpanned(row.start, row.end)))
      .sort((a, b) => b.end.localeCompare(a.end));
    const latest = years[0];
    if (!latest || daysApart(latest.end, end) > 370) continue;
    const prior = years.find((row) => isYearSpan(daysApart(row.end, latest.end)));
    return { value: latest.val, prior: prior?.val ?? null, end: latest.end };
  }
  return null;
};

/** Securities held past a year, the first way this company tags them on this date. */
const LONG_TERM_INVESTMENT_CONCEPTS = [
  "MarketableSecuritiesNoncurrent",
  "AvailableForSaleSecuritiesDebtSecuritiesNoncurrent",
  "LongTermInvestments",
];

const longTermInvestmentsOn = (gaap: Taxonomy, date: string): number => {
  for (const concept of LONG_TERM_INVESTMENT_CONCEPTS) {
    const value = instantOn(gaap, concept, date);
    if (value !== null) return value;
  }
  return 0;
};

/** Readings `debtOn` leaves out because they can include leases, which the comps' enterprise value must not. */
const WIDER_DEBT_READINGS = [
  ["DebtLongtermAndShorttermCombinedAmount"],
  ["LongTermDebtAndCapitalLeaseObligations", "LongTermDebtAndCapitalLeaseObligationsCurrent"],
  ["LongTermDebt"],
];

/**
 * What a company owes, as of the balance sheet or its last mention in the year before it. Many
 * tag debt only in the 10-K's notes, so nothing is on file for a 10-Q's date, and reading that as
 * zero printed Oracle and Target as owing nothing.
 */
const companyDebt = (gaap: Taxonomy, date: string): { debtUsd: number | null; debtAsOf: string | null } => {
  /* A debt line on this date is the answer, zero included: repaid debt must not come back from
     last year's notes. */
  const reportedOnDate = [...LONG_TERM_DEBT_READINGS.flat(), ...SHORT_TERM_BORROWING_CONCEPTS]
    .some((concept) => instantOn(gaap, concept, date) !== null);
  if (reportedOnDate) return { debtUsd: debtOn(gaap, date), debtAsOf: date };
  for (const reading of WIDER_DEBT_READINGS) {
    const latest = latestInstantDate(gaap, reading);
    if (!latest || daysApart(latest, date) > 370) continue;
    const values = reading.map((concept) => instantOn(gaap, concept, latest)).filter((value) => value !== null);
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total > 0) return { debtUsd: total, debtAsOf: latest };
  }
  return { debtUsd: null, debtAsOf: null };
};

/** The figures a company's own runway is worked out from, or why its filing cannot supply them. Pure. */
export function deriveSecCompanyFigures(companyFacts: unknown, now: Date): SecFilingRead<SecCompanyFigures> {
  const parsed = companyFactsSchema.safeParse(companyFacts);
  if (!parsed.success) return { status: "refused", refusal: "incomplete-filing" };
  const gaap = parsed.data.facts["us-gaap"];
  if (!gaap && parsed.data.facts["ifrs-full"]) return { status: "refused", refusal: "international-filer" };
  if (FINANCIAL_COMPANY_CONCEPTS.some((concept) => concept in (gaap ?? {}))) {
    return { status: "refused", refusal: "financial-company" };
  }

  const cashFlow = trailingFlow(gaap, OPERATING_CASH_FLOW_CONCEPTS);
  if (!cashFlow) return { status: "refused", refusal: "incomplete-filing" };
  if (daysApart(cashFlow.end, now.toISOString().slice(0, 10)) > STALE_PERIOD_DAYS) {
    return { status: "refused", refusal: "no-recent-filing" };
  }

  const cashOnFile = CASH_CONCEPTS.some((concept) => instantOn(gaap, concept, cashFlow.end) !== null);
  const cashUsd = cashOnFile ? cashOn(gaap, cashFlow.end) : 0;
  if (!(cashUsd > 0)) return { status: "refused", refusal: "incomplete-filing" };

  const quarters = latestRevenueQuarters(gaap);
  const revenueTtmUsd = quarters.length === 0 ? 0 : trailingFourQuarters(quarters);
  // Revenue under a concept this does not read looks like none, which only a company consuming cash can claim.
  if (revenueTtmUsd === null || (revenueTtmUsd === 0 && cashFlow.value >= 0)) {
    return { status: "refused", refusal: "incomplete-filing" };
  }

  const research = fiscalYearsOf(gaap, RESEARCH_CONCEPTS, cashFlow.end);

  return {
    status: "ok",
    value: {
      cashUsd,
      ...companyDebt(gaap, cashFlow.end),
      longTermInvestmentsUsd: longTermInvestmentsOn(gaap, cashFlow.end),
      revenueTtmUsd,
      operatingCashFlowTtmUsd: cashFlow.value,
      capitalSpendingTtmUsd: trailingFlow(gaap, CAPITAL_SPENDING_CONCEPTS, cashFlow.end)?.value ?? null,
      stockCompensationTtmUsd: trailingFlow(gaap, ["ShareBasedCompensation"], cashFlow.end)?.value ?? null,
      researchFiscalYearUsd: research?.value ?? null,
      researchPriorFiscalYearUsd: research?.prior ?? null,
      researchFiscalYearEnd: research?.end ?? null,
      revenueGrowth: growthOnYearAgo(quarters),
      periodEnd: cashFlow.end,
    },
  };
}

const TICKER_INDEX_URL = "https://www.sec.gov/files/company_tickers.json";
const TICKER_CACHE_PREFIX = "company:sec:ticker:v1:";
const FIGURES_CACHE_PREFIX = "company:sec:figures:v4:";
/** A listing rarely changes, and an unknown ticker costs an 800KB read each time it is asked. */
const TICKER_TTL_SECONDS = 7 * 24 * 60 * 60;

const tickerIndexSchema = z.record(z.string(), z.object({ cik_str: z.number(), ticker: z.string(), title: z.string() }));
const listingSchema = z.object({ cik: z.number(), name: z.string() });
const cachedListingSchema = z.union([listingSchema, z.object({ unlisted: z.literal(true) })]);
const refusalSchema = z.enum(["unknown-ticker", "international-filer", "financial-company", "no-recent-filing", "incomplete-filing"]);
const cachedFiguresSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    value: secCompanyFiguresSchema,
  }),
  z.object({ status: z.literal("refused"), refusal: refusalSchema }),
]);

const putQuietly = async (cache: FundamentalsCache | null, key: string, value: unknown, expirationTtl: number) => {
  try {
    await cache?.put(key, JSON.stringify(value), { expirationTtl });
  } catch {
    /* A cache write failure costs one more upstream read, nothing else. */
  }
};

const getQuietly = async <T>(cache: FundamentalsCache | null, key: string, schema: z.ZodType<T>): Promise<T | null> => {
  if (!cache) return null;
  try {
    return await getJson(cache, key, schema);
  } catch {
    return null;
  }
};

/** The company behind a ticker. A ticker the SEC does not list is remembered too, since finding out costs the whole list. */
const readListing = async (ticker: string, cache: FundamentalsCache | null): Promise<SecFilingRead<{ cik: number; name: string }>> => {
  const cached = await getQuietly(cache, TICKER_CACHE_PREFIX + ticker, cachedListingSchema);
  if (cached) return "cik" in cached ? { status: "ok", value: cached } : { status: "refused", refusal: "unknown-ticker" };

  let body: unknown;
  try {
    const res = await fetch(TICKER_INDEX_URL, {
      headers: { "user-agent": SEC_USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      await releaseBody(res);
      return { status: "unavailable", reason: `SEC EDGAR returned ${res.status}` };
    }
    body = await res.json();
  } catch (error) {
    return { status: "unavailable", reason: `SEC EDGAR: ${describeFetchError(error, "ticker list fetch failed")}` };
  }
  const index = tickerIndexSchema.safeParse(body);
  if (!index.success) return { status: "unavailable", reason: "SEC EDGAR returned an unreadable ticker list" };

  const entry = Object.values(index.data).find((row) => row.ticker === ticker);
  if (!entry) {
    await putQuietly(cache, TICKER_CACHE_PREFIX + ticker, { unlisted: true }, TICKER_TTL_SECONDS);
    return { status: "refused", refusal: "unknown-ticker" };
  }
  const listing = { cik: entry.cik_str, name: entry.title };
  await putQuietly(cache, TICKER_CACHE_PREFIX + ticker, listing, TICKER_TTL_SECONDS);
  return { status: "ok", value: listing };
};

/** What a reader types, as the SEC lists it: `brk.b` is `BRK-B`. Null when it cannot be a ticker. */
const normalizeSecTicker = (raw: string): string | null => {
  const ticker = raw.trim().toUpperCase().replace(/\./g, "-");
  return /^[A-Z0-9-]{1,10}$/.test(ticker) ? ticker : null;
};

/** One company's filed figures by its SEC id, from the cache when a fresh copy exists. */
export async function readSecCompanyFigures(
  cik: number,
  options: { cache: FundamentalsCache | null; now?: Date },
): Promise<SecFilingRead<SecCompanyFigures>> {
  const key = FIGURES_CACHE_PREFIX + cik;
  const cached = await getQuietly(options.cache, key, cachedFiguresSchema);
  if (cached) return cached;
  const facts = await fetchCompanyFacts(cik);
  if (facts.status === "unavailable") return facts;
  const figures: SecFilingRead<SecCompanyFigures> = facts.status === "missing"
    ? { status: "refused", refusal: "incomplete-filing" }
    : deriveSecCompanyFigures(facts.value, options.now ?? new Date());
  await putQuietly(options.cache, key, figures, figures.status === "ok" ? CACHE_TTL_SECONDS : MISSING_TTL_SECONDS);
  return figures;
}

/**
 * One company's latest filed figures, by ticker. Facts only, with no reading of them: what they
 * mean is worked out in the browser of whoever asked, and never printed against the company's name.
 */
export async function fetchSecCompanyFiling(
  rawTicker: string,
  options: { cache: FundamentalsCache | null; now?: Date },
): Promise<SecFilingRead<SecCompanyFiling>> {
  const ticker = normalizeSecTicker(rawTicker);
  if (!ticker) return { status: "refused", refusal: "unknown-ticker" };
  const listing = await readListing(ticker, options.cache);
  if (listing.status !== "ok") return listing;
  const { cik, name } = listing.value;

  const figures = await readSecCompanyFigures(cik, options);
  return figures.status === "ok" ? { status: "ok", value: { ...figures.value, ticker, name } } : figures;
}

/* ---------- Restructuring filings ---------- */

/** One 8-K reporting item 2.05: a commitment to an exit or restructuring plan with material costs. */
export const secRestructuringFilingSchema = z.object({ filedOn: z.string(), url: z.string() });
export type SecRestructuringFiling = z.infer<typeof secRestructuringFilingSchema>;

const submissionsSchema = z.object({
  filings: z.object({
    recent: z.object({
      form: z.array(z.string()),
      filingDate: z.array(z.string()),
      items: z.array(z.string()),
      accessionNumber: z.array(z.string()),
      primaryDocument: z.array(z.string()),
    }),
  }),
});

/** Item 2.05's filings in a company's recent submissions, newest first. Pure: the caller fetches. */
export const deriveSecRestructurings = (submissions: unknown, cik: number, now: Date): SecRestructuringFiling[] | null => {
  const parsed = submissionsSchema.safeParse(submissions);
  if (!parsed.success) return null;
  const { form, filingDate, items, accessionNumber, primaryDocument } = parsed.data.filings.recent;
  const filings: SecRestructuringFiling[] = [];
  form.forEach((type, index) => {
    const filedOn = filingDate[index];
    const accession = accessionNumber[index];
    const document = primaryDocument[index];
    if (type !== "8-K" || !filedOn || !accession || !document) return;
    if (!(items[index] ?? "").split(",").includes("2.05")) return;
    if (daysApart(filedOn, now.toISOString().slice(0, 10)) > 366) return;
    filings.push({ filedOn, url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${document}` });
  });
  return filings.sort((a, b) => b.filedOn.localeCompare(a.filedOn));
};

export async function fetchSecRestructurings(cik: number, now: Date): Promise<UpstreamRead<SecRestructuringFiling[]>> {
  try {
    const res = await fetch(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`, {
      headers: { "user-agent": SEC_USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      await releaseBody(res);
      return { status: "unavailable", reason: `SEC EDGAR returned ${res.status}` };
    }
    const filings = deriveSecRestructurings(await res.json(), cik, now);
    return filings ? { status: "ok", value: filings } : { status: "unavailable", reason: "SEC EDGAR returned unreadable submissions" };
  } catch (error) {
    return { status: "unavailable", reason: `SEC EDGAR: ${describeFetchError(error, "submissions fetch failed")}` };
  }
}
