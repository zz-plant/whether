/**
 * A public company's filed figures, as the operator's own.
 *
 * The lookup fills the fields a reader would otherwise type, so everything that reads them (the
 * planner, the runway notes, the commitment test) works as it does for typed figures. The filing
 * is named wherever those figures are read from it, and it is named only there: nothing here
 * reaches the embed, the image or the share formats, where anyone could print "under six months
 * of cash" beside a company they do not run.
 */
import { z } from "zod";
import { COMPANIES } from "../companies/companyRegistry";
import { formatDateUTC } from "../formatters";
import { formatCommitmentUsd } from "../planCommitment";
import type { ProfileFiling } from "../operatorProfile";

export const companyFilingSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  cashUsd: z.number(),
  debtUsd: z.number().nullable(),
  longTermInvestmentsUsd: z.number(),
  revenueTtmUsd: z.number(),
  operatingCashFlowTtmUsd: z.number(),
  capitalSpendingTtmUsd: z.number().nullable(),
  revenueGrowth: z.number().nullable(),
  periodEnd: z.string(),
});

const FAILURES = [
  "unknown-ticker",
  "international-filer",
  "financial-company",
  "no-recent-filing",
  "incomplete-filing",
  "unavailable",
  "rate-limited",
] as const;

export type CompanyFilingFailure = (typeof FAILURES)[number];

const LOOKUP_FAILURE_MESSAGES: Record<CompanyFilingFailure, string> = {
  "unknown-ticker": "That ticker isn't on the SEC's list, which covers US-listed companies.",
  "international-filer": "This company files under international accounting rules, which this can't read. Enter its figures below.",
  "financial-company": "This is a bank or insurer. Its cash is held against what it owes customers, so it isn't runway.",
  "no-recent-filing": "This company hasn't filed recently, so there's nothing current to read.",
  "incomplete-filing": "Its filings don't give a full year of cash flow and revenue. Enter its figures below.",
  unavailable: "The SEC's data didn't answer. Try again shortly.",
  "rate-limited": "That's a lot of lookups. Try again in a minute.",
};

export const companyFilingLookupSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), filing: companyFilingSchema }),
  z.object({ ok: z.literal(false), failure: z.enum(FAILURES) }),
]);

export const describeLookupFailure = (failure: CompanyFilingFailure): string => LOOKUP_FAILURE_MESSAGES[failure];

const LOWER_IN_A_NAME = new Set(["INC", "CO", "THE", "AND", "OF", "LLC", "LTD", "NEW", "CORP", "PLC", "LP"]);

/**
 * The name a reader knows: the pilot's where it has one, else the filed one out of capitals.
 * Short words stay capitals ("AMC"), and the state suffix goes ("QUALCOMM INC/DE").
 */
const readableCompanyName = (ticker: string, filedName: string): string => {
  const known = COMPANIES.find((company) => company.ticker === ticker);
  if (known) return known.name;
  const name = filedName.replace(/\s*\/[A-Z]{2}\/?$/, "");
  if (/[a-z]/.test(name)) return name;
  return name.replace(/[A-Z&']+/g, (word) =>
    word.length <= 3 && !LOWER_IN_A_NAME.has(word) ? word : `${word.charAt(0)}${word.slice(1).toLowerCase()}`,
  );
};

/** Where the figures on screen came from, while they still are the filing's. */
export const describeProfileFiling = (filing: ProfileFiling, debtLimitsRunway: boolean): string => {
  const source = `From ${readableCompanyName(filing.ticker, filing.name)} (${filing.ticker}), worked out from SEC filings for the period ended ${formatDateUTC(filing.periodEnd)}. Change any figure to use your own.`;
  return debtLimitsRunway && filing.debtUsd !== null
    ? `${source} It owes ${formatCommitmentUsd(filing.debtUsd)}, so the guidance stops short of the 24+ month band.`
    : source;
};
