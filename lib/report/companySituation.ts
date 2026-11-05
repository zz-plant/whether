/**
 * What a company's filed figures say on a page bearing its name.
 *
 * Every page prints the figures. A reading of them is printed only where it cannot be a judgment
 * of the company's health: operations bringing in more cash than they use, and debt under three
 * years of that cash. Otherwise the figures stand alone, with no sentence saying why, because that
 * sentence would be the judgment. Nothing here speaks of runway: this is a public page about a
 * company the reader may not run, and "under six months of cash" is not ours to print beside a name.
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

const MAX_DEBT_YEARS_OF_CASH_FLOW = 3;
const FAST_GROWTH = 0.15;
const MS_PER_DAY = 86_400_000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const formatPercent = (fraction: number) => `${Math.round(Math.abs(fraction) * 100)}%`;

/** "0630" as "June 30". Null for anything else, so a bad entry costs the line and not the page. */
const formatFiscalYearEnd = (mmdd: string): string | null => {
  const month = MONTHS[Number(mmdd.slice(0, 2)) - 1];
  const day = Number(mmdd.slice(2));
  return mmdd.length === 4 && month && day >= 1 && day <= 31 ? `${month} ${day}` : null;
};

const growthSentence = (growth: number): string => {
  if (growth < 0) return `Revenue fell ${formatPercent(growth)} in the latest quarter on a year earlier, so new work usually faces a higher bar whatever conditions do.`;
  if (growth >= FAST_GROWTH) return `Revenue grew ${formatPercent(growth)} in the latest quarter on a year earlier, which usually gives new work more room than slower growth would.`;
  return `Revenue grew ${formatPercent(growth)} in the latest quarter on a year earlier, so new work is likely to compete with what already exists.`;
};

export const buildCompanySituation = (company: CompanyEntry, figures: SecCompanyFigures, now: Date = new Date()): CompanySituation => {
  const fiscalYearEnd = formatFiscalYearEnd(company.fiscalYearEnd);
  const cashFlow = figures.operatingCashFlowTtmUsd;
  const readable = cashFlow > 0 && (figures.debtUsd ?? 0) <= cashFlow * MAX_DEBT_YEARS_OF_CASH_FLOW;
  return {
    rows: [
      { label: "Revenue, last 12 months", value: formatCommitmentUsd(figures.revenueTtmUsd) },
      ...(figures.revenueGrowth === null
        ? []
        : [{ label: "Revenue growth, latest quarter on a year earlier", value: `${figures.revenueGrowth < 0 ? "-" : ""}${formatPercent(figures.revenueGrowth)}` }]),
      { label: "Cash from operations, last 12 months", value: formatCommitmentUsd(cashFlow) },
      { label: "Cash and short-term investments", value: formatCommitmentUsd(figures.cashUsd) },
      ...(figures.debtUsd === null ? [] : [{ label: "Debt on file", value: formatCommitmentUsd(figures.debtUsd) }]),
      ...(fiscalYearEnd ? [{ label: "Fiscal year ends", value: fiscalYearEnd }] : []),
    ],
    asOf: formatDateUTC(figures.periodEnd),
    reading: readable
      ? [
          "Over the last year, operations brought in more cash than they used, so conditions are more likely to reach you through budgets and priorities than through the company's cash.",
          ...(figures.revenueGrowth === null ? [] : [growthSentence(figures.revenueGrowth)]),
          ...(fiscalYearEnd ? [`Its fiscal year ends ${fiscalYearEnd}, so next year's budgets are likely set in the months before.`] : []),
        ]
      : null,
    current: (now.getTime() - Date.parse(figures.periodEnd)) / MS_PER_DAY <= STALE_PERIOD_DAYS,
    disclaimer: `Figures are from ${company.name}'s SEC filings. Whether isn't affiliated with ${company.name}, and knows nothing of its internal plans, budgets or priorities. This is general guidance, not advice about the company or its stock.`,
  };
};
