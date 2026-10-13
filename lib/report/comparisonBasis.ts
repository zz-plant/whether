import type { ComparedWith } from "./reportDataTypes";

/**
 * What a move on the page is measured against, in the words that name it.
 *
 * Every "last week" the product printed was the change since the previous Time
 * Machine snapshot (`getPreviousTimeMachineSnapshot`), and that cache is
 * monthly: the Sep 18 and the Sep 25 reads both compared with Aug 31. A reader
 * who saw "last week 63" beside "+27 since last week" was told a week when the
 * gap was nearly four. The loader records the date it compared with
 * (`ReportDynamics.comparedWith`), and every surface that prints a comparison
 * prints it through this one function. Since 2026-10-07 that date is last
 * week's published brief ("since Sep 29"), and the month-end only where the
 * archive has no brief from the previous one to two weeks
 * (`lib/report/comparisonReading.ts`); either is named the same way.
 *
 * Where a caller has no date the wording stays "last week", so a source that
 * cannot name its basis reads as it always did instead of inventing one.
 */
export type ComparisonBasis = {
  /** A column or cell head: "Aug 31", or "Last week" where no date is known. */
  label: string;
  /** The date alone ("Aug 31"), or null where the source did not name one. */
  date: string | null;
  /** What follows "against" or "Since": "Aug 31" / "last week". */
  reference: string;
  /** "vs Aug 31" / "vs last week" */
  versus: string;
  /** "since Aug 31" / "since last week" */
  since: string;
  /** What follows "than" or "where it was": "on Aug 31" / "last week". */
  when: string;
};

const LAST_WEEK: ComparisonBasis = {
  label: "Last week",
  date: null,
  reference: "last week",
  versus: "vs last week",
  since: "since last week",
  when: "last week",
};

export const comparisonBasis = (comparedWith?: Pick<ComparedWith, "label"> | null): ComparisonBasis =>
  comparedWith
    ? {
        label: comparedWith.label,
        date: comparedWith.label,
        reference: comparedWith.label,
        versus: `vs ${comparedWith.label}`,
        since: `since ${comparedWith.label}`,
        when: `on ${comparedWith.label}`,
      }
    : LAST_WEEK;

/**
 * The closing sentence of a week that crossed no line. It said "Last week's
 * guidance stands." whatever the earlier reading was, so a week compared with a
 * month-end weeks back named a week nobody compared it with. With a dated basis
 * the sentence before it already says "since Sep 15", so this one names no
 * week at all rather than a second date; an undated one keeps "last week", as
 * every unnamed comparison does.
 */
export const describeGuidanceStands = (basis: ComparisonBasis) =>
  basis.date ? "The guidance stands." : "Last week's guidance stands.";

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The earlier reading a week is compared with, from the two record dates:
 * "Aug 31", or "Dec 31, 2025" when it falls in another calendar year than the
 * current reading, so a label never reads as this year's date by accident.
 * Undefined when the earlier date does not parse, which leaves the comparison
 * unnamed rather than mis-named.
 */
export const buildComparedWith = (previousRecordDate: string, currentRecordDate: string): ComparedWith | undefined => {
  const previous = new Date(previousRecordDate);
  if (Number.isNaN(previous.valueOf())) return undefined;
  const current = new Date(currentRecordDate);
  const sameYear = !Number.isNaN(current.valueOf()) && current.getUTCFullYear() === previous.getUTCFullYear();
  return { recordDate: previousRecordDate, label: (sameYear ? MONTH_DAY : MONTH_DAY_YEAR).format(previous) };
};
