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

/** A company whose latest quarter ended longer ago than this has stopped filing (acquired, delisted). */
const STALE_PERIOD_DAYS = 200;

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

  const trailing = quarters.slice(0, 4);
  const consecutive = trailing.length === 4
    && trailing.every((quarter, index) => index === 0 || isQuarterSpan(daysApart(quarter.end, trailing[index - 1].end)));
  if (!consecutive) return { status: "missing", reason: "four consecutive quarters of revenue are not on file" };
  const revenueTtm = trailing.reduce((sum, quarter) => sum + quarter.value, 0);
  if (!(revenueTtm > 0)) return { status: "missing", reason: "trailing revenue is not positive" };

  const yearAgo = quarters.find((quarter) => isYearSpan(daysApart(quarter.end, latest.end)));
  const revenueGrowth = yearAgo && yearAgo.value > 0 ? latest.value / yearAgo.value - 1 : null;

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

const fetchFromEdgar = async (cik: number, now: Date): Promise<UpstreamRead<SecFundamentals>> => {
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
  return deriveSecFundamentals(body, now);
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
