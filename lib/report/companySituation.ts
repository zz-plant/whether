/**
 * What a company's filed figures say on a page bearing its name.
 *
 * Every page prints the figures. A reading of them is printed only where it cannot be a judgment
 * of the company's health: free cash flow positive, and debt beyond what it holds under three years
 * of that. Otherwise the figures stand alone, with no sentence saying why, because that sentence
 * would be the judgment. Free cash flow, not operating cash flow: Oracle brought in $46.9B from
 * operations and spent $75.7B on capital, and was told it brought in more than it used.
 *
 * Nothing here speaks of runway: this is a public page about a company the reader may not run, and
 * "under six months of cash" is not ours to print beside a name. The reading states what the
 * figures show against other companies, and leaves out what growth "usually" does for new work,
 * which nothing here could support.
 */
import { formatDateUTC } from "../formatters";
import { STALE_PERIOD_DAYS, type SecCompanyFigures, type SecRestructuringFiling } from "../marketData/secEdgar";
import { formatCommitmentUsd } from "../planCommitment";
import type { CompanyEntry } from "../companies/companyRegistry";

/** The figures a role is told to check when a quarterly report lands (`CompanyRole.planning`). */
export type FigureKey = "revenueGrowth" | "research" | "capitalSpending" | "freeCashFlow" | "stockPay";

type FiguresRow = { label: string; value: string; key?: FigureKey };

/** A quarterly or annual report the company is due to file, worked out from its last one. */
type ExpectedReport = { quarterEndIso: string; dueByIso: string; annual: boolean };

/**
 * Whether the budget new work is paid from is growing with the business, from the filings alone.
 * A restructuring filing in the last year, or R&D falling or growing more than a few points slower
 * than revenue, is `squeezed`. Facts about where money goes, never about whether the company is well.
 */
export type PlanningPressure = { kind: "squeezed" | "growing"; evidence: string };

export type CompanySituation = {
  rows: FiguresRow[];
  /** The period the figures run to, for the sentence that dates them. */
  asOf: string;
  /** Null for a company whose figures stand alone. */
  reading: string[] | null;
  /** When next year's budgets are likely to be set. Neutral, so every company has it. */
  budgetCalendar: string | null;
  /** The same calendar as dates, for the subscribed feed. */
  fiscalYear: { startIso: string; budgetSeasonOpensIso: string } | null;
  /** The next few reports, the first one due after today. */
  nextReports: ExpectedReport[];
  /** Null when the filings carry neither R&D on both years nor a restructuring. */
  planning: PlanningPressure | null;
  /** Restructuring filings from the last 12 months, newest first. Empty says nothing either way. */
  restructurings: Array<{ filedOn: string; url: string }>;
  /** Filed recently enough that a page can stand behind them. */
  current: boolean;
  disclaimer: string;
};

/** Where the rest of the list sits, so a company's growth is read against something. */
export type PeerGrowth = { median: number; companies: number };

const MAX_NET_DEBT_YEARS_OF_FREE_CASH_FLOW = 3;
const MS_PER_DAY = 86_400_000;

const percent = (fraction: number) => Math.round(Math.abs(fraction) * 100);

/** Budgets for the next year are usually being settled inside this many months of it ("four" in the copy). */
const BUDGET_SEASON_MONTHS = 4;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** The day after a fiscal year ending on MMDD, next after `now`. Null for a malformed MMDD. */
const nextFiscalYearStart = (mmdd: string, now: Date): Date | null => {
  const month = Number(mmdd.slice(0, 2)) - 1;
  const day = Number(mmdd.slice(2));
  if (mmdd.length !== 4 || !(month >= 0 && month <= 11) || !(day >= 1 && day <= 31)) return null;
  const start = new Date(Date.UTC(now.getUTCFullYear(), month, day + 1));
  return start.getTime() <= now.getTime() ? new Date(Date.UTC(now.getUTCFullYear() + 1, month, day + 1)) : start;
};

const monthsBefore = (date: Date, months: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, date.getUTCDate()));

/**
 * Next fiscal year's start and how far off it is, worked out from today, so the page stays current
 * between filings. A 52-week year ends within days of this date, hence "around".
 */
const describeBudgetCalendar = (start: Date | null, now: Date): string | null => {
  if (!start) return null;
  const months = Math.max(1, Math.round((start.getTime() - now.getTime()) / MS_PER_DAY / 30.44));
  const away = months === 1 ? "about a month away" : `about ${months} months away`;
  const season = months <= BUDGET_SEASON_MONTHS
    ? "Budgets for it are usually being set about now."
    : `Budgets for it are usually set in the four months before, from about ${formatDateUTC(isoDay(monthsBefore(start, BUDGET_SEASON_MONTHS)))}.`;
  return `Its next fiscal year starts around ${formatDateUTC(isoDay(start))}, ${away}. ${season}`;
};

/* A large filer's deadlines: 40 days after a quarter, 60 after the year. */
const QUARTERLY_FILING_DAYS = 40;
const ANNUAL_FILING_DAYS = 60;
const REPORTS_AHEAD = 4;

/** Months after a date, keeping a month-end a month-end (Sep 30 → Dec 31). */
const addMonths = (iso: string, months: number): Date => {
  const date = new Date(`${iso}T00:00:00.000Z`);
  const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const endOfMonth = date.getUTCDate() === lastDay(year, date.getUTCMonth());
  const day = endOfMonth ? lastDay(year, month) : Math.min(date.getUTCDate(), lastDay(year, month));
  return new Date(Date.UTC(year, month, day));
};

/**
 * The quarters after the last filed one, each with the date its report is due by. A quarter whose
 * deadline has passed is skipped: its report is out, and the store catches up within a week.
 */
export const expectedReports = (periodEnd: string, fiscalYearEnd: string, now: Date): ExpectedReport[] => {
  const yearEndMonth = Number(fiscalYearEnd.slice(0, 2)) - 1;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const reports: ExpectedReport[] = [];
  for (let quarter = 1; quarter <= 12 && reports.length < REPORTS_AHEAD; quarter += 1) {
    const end = addMonths(periodEnd, quarter * 3);
    const annual = end.getUTCMonth() === yearEndMonth;
    const due = new Date(end.getTime() + (annual ? ANNUAL_FILING_DAYS : QUARTERLY_FILING_DAYS) * MS_PER_DAY);
    if (due.getTime() >= today) reports.push({ quarterEndIso: isoDay(end), dueByIso: isoDay(due), annual });
  }
  return reports;
};

/** R&D within this many points of revenue growth is keeping pace with it. */
const PACE_TOLERANCE = 0.03;

const describePlanningPressure = (
  figures: SecCompanyFigures,
  latestRestructuring: string | null,
): PlanningPressure | null => {
  if (latestRestructuring) {
    return { kind: "squeezed", evidence: `It filed a restructuring notice on ${latestRestructuring}, so expect plans to be checked against cost.` };
  }
  const { researchFiscalYearUsd: latest, researchPriorFiscalYearUsd: prior, researchFiscalYearEnd: yearEnd, revenueGrowth } = figures;
  if (latest === null || prior === null || prior <= 0 || !yearEnd) return null;
  const change = latest / prior - 1;
  const research = `R&D ${change >= 0 ? "rose" : "fell"} ${percent(change)}% in the fiscal year to ${formatDateUTC(yearEnd)}`;
  if (change < 0) return { kind: "squeezed", evidence: `${research}: new work competes for a smaller budget.` };
  if (revenueGrowth === null) return null;
  const against = `${research}, against revenue growth of ${revenueGrowth < 0 ? "-" : ""}${percent(revenueGrowth)}% in the latest quarter`;
  if (change < revenueGrowth - PACE_TOLERANCE) {
    return { kind: "squeezed", evidence: `${against}: new work competes for a budget growing more slowly than the business.` };
  }
  return {
    kind: "growing",
    evidence: `${against}: the budget for new work is ${change > revenueGrowth + PACE_TOLERANCE ? "growing faster than" : "keeping pace with"} the business.`,
  };
};

const describeResearchChange = (figures: SecCompanyFigures): string | null => {
  const { researchFiscalYearUsd: latest, researchPriorFiscalYearUsd: prior } = figures;
  if (latest === null) return null;
  if (prior === null || prior <= 0) return formatCommitmentUsd(latest);
  const change = latest / prior - 1;
  return `${formatCommitmentUsd(latest)}, ${change >= 0 ? "up" : "down"} ${percent(change)}%`;
};

/** The middle value, or null for an empty list. */
export const medianOf = (values: readonly number[]): number | null => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  const lower = sorted[middle - 1];
  if (upper === undefined) return null;
  return sorted.length % 2 === 1 || lower === undefined ? upper : (lower + upper) / 2;
};

const growthSentence = (growth: number, peers: PeerGrowth): string => {
  const verb = growth < 0 ? "fell" : "grew";
  const median = `the ${percent(peers.median)}% median of these ${peers.companies} companies`;
  const comparison = percent(growth) === percent(peers.median) && growth >= 0
    ? `in line with ${median}`
    : `${growth > peers.median ? "above" : "below"} ${median}`;
  return `Revenue ${verb} ${percent(growth)}% in the latest quarter on a year earlier, ${comparison}.`;
};

export const buildCompanySituation = (
  company: CompanyEntry,
  figures: SecCompanyFigures & { restructurings?: readonly SecRestructuringFiling[] },
  peers: PeerGrowth | null,
  now: Date = new Date(),
): CompanySituation => {
  const cashFlow = figures.operatingCashFlowTtmUsd;
  const capital = figures.capitalSpendingTtmUsd;
  const freeCashFlow = capital === null ? null : cashFlow - capital;
  const netDebt = (figures.debtUsd ?? 0) - figures.cashUsd - figures.longTermInvestmentsUsd;
  const readable = freeCashFlow !== null && freeCashFlow > 0 && netDebt <= freeCashFlow * MAX_NET_DEBT_YEARS_OF_FREE_CASH_FLOW;
  const research = describeResearchChange(figures);
  const yearAgo = now.getTime() - 365 * MS_PER_DAY;
  const restructurings = (figures.restructurings ?? [])
    .filter((filing) => Date.parse(filing.filedOn) >= yearAgo)
    .map((filing) => ({ filedOn: formatDateUTC(filing.filedOn), url: filing.url }));
  const fiscalYearStart = nextFiscalYearStart(company.fiscalYearEnd, now);
  const debtLabel = figures.debtAsOf && figures.debtAsOf !== figures.periodEnd
    ? `Debt on file, as of ${formatDateUTC(figures.debtAsOf)}`
    : "Debt on file";
  return {
    rows: [
      { label: "Revenue, last 12 months", value: formatCommitmentUsd(figures.revenueTtmUsd) },
      ...(figures.revenueGrowth === null
        ? []
        : [{ key: "revenueGrowth" as const, label: "Revenue growth, latest quarter on a year earlier", value: `${figures.revenueGrowth < 0 ? "-" : ""}${percent(figures.revenueGrowth)}%` }]),
      { label: "Cash from operations, last 12 months", value: formatCommitmentUsd(cashFlow) },
      ...(capital === null ? [] : [{ key: "capitalSpending" as const, label: "Capital spending, last 12 months", value: formatCommitmentUsd(capital) }]),
      ...(freeCashFlow === null ? [] : [{ key: "freeCashFlow" as const, label: "Free cash flow, last 12 months", value: formatCommitmentUsd(freeCashFlow) }]),
      ...(research && figures.researchFiscalYearEnd
        ? [{ key: "research" as const, label: `R&D, fiscal year ended ${formatDateUTC(figures.researchFiscalYearEnd)}`, value: research }]
        : []),
      ...(figures.stockCompensationTtmUsd === null ? [] : [{ key: "stockPay" as const, label: "Stock pay, last 12 months", value: formatCommitmentUsd(figures.stockCompensationTtmUsd) }]),
      { label: "Cash and short-term investments", value: formatCommitmentUsd(figures.cashUsd) },
      ...(figures.longTermInvestmentsUsd > 0 ? [{ label: "Long-term investments", value: formatCommitmentUsd(figures.longTermInvestmentsUsd) }] : []),
      ...(figures.debtUsd === null ? [] : [{ label: debtLabel, value: formatCommitmentUsd(figures.debtUsd) }]),
    ],
    asOf: formatDateUTC(figures.periodEnd),
    reading: readable && capital !== null && freeCashFlow !== null
      ? [
          `Over the last year, cash from operations covered capital spending with ${formatCommitmentUsd(freeCashFlow)} left over. Capital spending took ${percent(capital / cashFlow)}% of it.`,
          "That makes this week's conditions more likely to reach you through budgets and priorities than through the company's cash.",
          ...(figures.revenueGrowth === null || !peers ? [] : [growthSentence(figures.revenueGrowth, peers)]),
        ]
      : null,
    budgetCalendar: describeBudgetCalendar(fiscalYearStart, now),
    fiscalYear: fiscalYearStart
      ? { startIso: isoDay(fiscalYearStart), budgetSeasonOpensIso: isoDay(monthsBefore(fiscalYearStart, BUDGET_SEASON_MONTHS)) }
      : null,
    nextReports: fiscalYearStart ? expectedReports(figures.periodEnd, company.fiscalYearEnd, now) : [],
    planning: describePlanningPressure(figures, restructurings[0]?.filedOn ?? null),
    restructurings,
    current: (now.getTime() - Date.parse(figures.periodEnd)) / MS_PER_DAY <= STALE_PERIOD_DAYS,
    disclaimer: `Whether isn't affiliated with ${company.name}, and knows nothing of its internal plans, budgets or priorities. This is general guidance, not advice about the company or its stock.`,
  };
};
