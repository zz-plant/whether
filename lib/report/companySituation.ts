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
import { STALE_PERIOD_DAYS, type SecCompanyFigures } from "../marketData/secEdgar";
import { formatCommitmentUsd } from "../planCommitment";
import type { CompanyEntry } from "../companies/companyRegistry";

type FiguresRow = { label: string; value: string };

export type CompanySituation = {
  rows: FiguresRow[];
  /** The period the figures run to, for the sentence that dates them. */
  asOf: string;
  /** Null for a company whose figures stand alone. */
  reading: string[] | null;
  /** Filed recently enough that a page can stand behind them. */
  current: boolean;
  disclaimer: string;
};

/** Where the rest of the list sits, so a company's growth is read against something. */
export type PeerGrowth = { median: number; companies: number };

const MAX_NET_DEBT_YEARS_OF_FREE_CASH_FLOW = 3;
const MS_PER_DAY = 86_400_000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const percent = (fraction: number) => Math.round(Math.abs(fraction) * 100);

/** "0630" as "June 30". Null for anything else, so a bad entry costs the line and not the page. */
const formatFiscalYearEnd = (mmdd: string): string | null => {
  const month = MONTHS[Number(mmdd.slice(0, 2)) - 1];
  const day = Number(mmdd.slice(2));
  return mmdd.length === 4 && month && day >= 1 && day <= 31 ? `${month} ${day}` : null;
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
  figures: SecCompanyFigures,
  peers: PeerGrowth | null,
  now: Date = new Date(),
): CompanySituation => {
  const fiscalYearEnd = formatFiscalYearEnd(company.fiscalYearEnd);
  const cashFlow = figures.operatingCashFlowTtmUsd;
  const capital = figures.capitalSpendingTtmUsd;
  const freeCashFlow = capital === null ? null : cashFlow - capital;
  const netDebt = (figures.debtUsd ?? 0) - figures.cashUsd - figures.longTermInvestmentsUsd;
  const readable = freeCashFlow !== null && freeCashFlow > 0 && netDebt <= freeCashFlow * MAX_NET_DEBT_YEARS_OF_FREE_CASH_FLOW;
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
      { label: "Cash and short-term investments", value: formatCommitmentUsd(figures.cashUsd) },
      ...(figures.longTermInvestmentsUsd > 0 ? [{ label: "Long-term investments", value: formatCommitmentUsd(figures.longTermInvestmentsUsd) }] : []),
      ...(figures.debtUsd === null ? [] : [{ label: debtLabel, value: formatCommitmentUsd(figures.debtUsd) }]),
      ...(fiscalYearEnd ? [{ label: "Fiscal year ends", value: fiscalYearEnd }] : []),
    ],
    asOf: formatDateUTC(figures.periodEnd),
    reading: readable && capital !== null && freeCashFlow !== null
      ? [
          `Over the last year, cash from operations covered capital spending with ${formatCommitmentUsd(freeCashFlow)} left over. Capital spending took ${percent(capital / cashFlow)}% of it.`,
          "So this week's conditions are more likely to reach you through budgets and priorities than through the company's cash.",
          ...(figures.revenueGrowth === null || !peers ? [] : [growthSentence(figures.revenueGrowth, peers)]),
          ...(fiscalYearEnd ? [`Its fiscal year ends ${fiscalYearEnd}, and budgets for the next one are usually set in the months before.`] : []),
        ]
      : null,
    current: (now.getTime() - Date.parse(figures.periodEnd)) / MS_PER_DAY <= STALE_PERIOD_DAYS,
    disclaimer: `Figures are from ${company.name}'s SEC filings. Whether isn't affiliated with ${company.name}, and knows nothing of its internal plans, budgets or priorities. This is general guidance, not advice about the company or its stock.`,
  };
};
