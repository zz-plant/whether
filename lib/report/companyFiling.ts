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
import { formatDateUTC } from "../formatters";
import { formatCommitmentUsd } from "../planCommitment";
import type { ProfileFiling } from "../operatorProfile";

export const companyFilingSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  cashUsd: z.number(),
  debtUsd: z.number(),
  revenueTtmUsd: z.number(),
  operatingCashFlowTtmUsd: z.number(),
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

/** Where the figures on screen came from, while they still are the filing's. */
export const describeProfileFiling = (filing: ProfileFiling, cashUsd: number | undefined): string => {
  const source = `From ${filing.name} (${filing.ticker}), as filed for the period ended ${formatDateUTC(filing.periodEnd)}. Change any figure to use your own.`;
  return cashUsd !== undefined && filing.debtUsd > cashUsd
    ? `${source} It owes ${formatCommitmentUsd(filing.debtUsd)}, more than its cash, so the guidance stops short of the 24+ month band.`
    : source;
};
