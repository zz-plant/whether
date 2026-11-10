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

type FiguresRow = { label: string; value: string };

export type CompanySituation = {
  rows: FiguresRow[];
  /** The period the figures run to, for the sentence that dates them. */
  asOf: string;
  /** Null for a company whose figures stand alone. */
  reading: string[] | null;
  /** When next year's budgets are likely to be set. Neutral, so every company has it. */
  budgetCalendar: string | null;
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

/** Budgets for the next year are usually being settled inside this many months of it. */
const BUDGET_SEASON_MONTHS = 4;

/**
 * Next fiscal year's start and how far off it is, worked out from today, so the page stays current
 * between filings. A 52-week year ends within days of this date, hence "around".
 */
const describeBudgetCalendar = (mmdd: string, now: Date): string | null => {
  const month = Number(mmdd.slice(0, 2)) - 1;
  const day = Number(mmdd.slice(2));
  if (mmdd.length !== 4 || !(month >= 0 && month <= 11) || !(day >= 1 && day <= 31)) return null;
  let start = new Date(Date.UTC(now.getUTCFullYear(), month, day + 1));
  if (start.getTime() <= now.getTime()) start = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day + 1));
  const months = Math.max(1, Math.round((start.getTime() - now.getTime()) / MS_PER_DAY / 30.44));
  const away = months === 1 ? "about a month away" : `about ${months} months away`;
  const season = months <= BUDGET_SEASON_MONTHS
    ? "Budgets for it are usually being set about now."
    : "Budgets for it are usually set in the months before.";
  return `Its next fiscal year starts around ${formatDateUTC(start.toISOString().slice(0, 10))}, ${away}. ${season}`;
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
  const debtLabel = figures.debtAsOf && figures.debtAsOf !== figures.periodEnd
    ? `Debt on file, as of ${formatDateUTC(figures.debtAsOf)}`
    : "Debt on file";
  return {
    rows: [
      { label: "Revenue, last 12 months", value: formatCommitmentUsd(figures.revenueTtmUsd) },
      ...(figures.revenueGrowth === null
        ? []
        : [{ label: "Revenue growth, latest quarter on a year earlier", value: `${figures.revenueGrowth < 0 ? "-" : ""}${percent(figures.revenueGrowth)}%` }]),
      { label: "Cash from operations, last 12 months", value: formatCommitmentUsd(cashFlow) },
      ...(capital === null ? [] : [{ label: "Capital spending, last 12 months", value: formatCommitmentUsd(capital) }]),
      ...(freeCashFlow === null ? [] : [{ label: "Free cash flow, last 12 months", value: formatCommitmentUsd(freeCashFlow) }]),
      ...(research && figures.researchFiscalYearEnd
        ? [{ label: `R&D, fiscal year ended ${formatDateUTC(figures.researchFiscalYearEnd)}`, value: research }]
        : []),
      ...(figures.stockCompensationTtmUsd === null ? [] : [{ label: "Stock pay, last 12 months", value: formatCommitmentUsd(figures.stockCompensationTtmUsd) }]),
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
    budgetCalendar: describeBudgetCalendar(company.fiscalYearEnd, now),
    restructurings: (figures.restructurings ?? [])
      .filter((filing) => Date.parse(filing.filedOn) >= yearAgo)
      .map((filing) => ({ filedOn: formatDateUTC(filing.filedOn), url: filing.url })),
    current: (now.getTime() - Date.parse(figures.periodEnd)) / MS_PER_DAY <= STALE_PERIOD_DAYS,
    disclaimer: `Whether isn't affiliated with ${company.name}, and knows nothing of its internal plans, budgets or priorities. This is general guidance, not advice about the company or its stock.`,
  };
};
