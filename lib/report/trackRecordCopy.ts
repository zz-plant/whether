import { formatMonthYearShortFromValue } from "../formatters";
import type { TrackRecord } from "./trackRecord";

/**
 * The one sentence that says how the call changes, for every surface that
 * grades the record.
 *
 * `/history` and `/trust` used to explain the same rule three different ways —
 * "hysteresis in the scoring", "the confirmation gate publishes a dwelt
 * crossing", "classification line" — each a name for the mechanism rather than
 * a statement of what it does. A reader met three undefined terms for one fact.
 * The fact is stated here once, in the reader's terms, and imported.
 */
export const CALL_CHANGE_RULE =
  "Conditions change only after a score has crossed its line and stayed there for a second reading.";

/**
 * How often the record has given anyone a reason to act, said where the product
 * says what it is for. The weekly cadence is how the guidance is delivered, not
 * how often it moves, and a reader choosing whether to rely on it should see
 * the second number before the first sets their expectation.
 */
export const describeRecordCadence = (
  record: Pick<TrackRecord, "firstRecordDate" | "monthsCovered" | "regimeChanges" | "lineCrossingMonths">,
): string =>
  `Since ${formatMonthYearShortFromValue(record.firstRecordDate)}, conditions have changed ${record.regimeChanges} ` +
  `${record.regimeChanges === 1 ? "time" : "times"} in ${record.monthsCovered} months, and a month-end reading crossed ` +
  `one of the pause or resume lines in ${record.lineCrossingMonths} of them. Most Mondays, nothing has moved.`;

/**
 * What a past period's page is, said at its top (2026-10-09). The year and quarter
 * pages led with "Standing guidance" and "By Kanav Jain" over a 2012 date, which read
 * as guidance written in 2012; the first weekly brief was published in 2026, and the
 * disclaimer that said so lived only on /history. `firstPublishedWeek` is the Monday
 * of the oldest published brief.
 */
export const describeReconstructedPeriod = (periodTitle: string, firstPublishedWeek: string): string =>
  `Reconstructed: this is what today's published formula reads for ${periodTitle}, not guidance published at the time. ` +
  `Whether began publishing weekly briefs in the week of ${firstPublishedWeek}.`;

/*
 * The record's figures as published before its last re-score, kept where the
 * record is discussed so a change of basis is visible rather than silent
 * (docs/feature-specs-current.md §1.1.67). Authored, because the engine that
 * produced them no longer runs: these are the numbers /history and /calibration
 * printed on the day, from the archive engine-2026-10-06 scored. While the
 * re-score leaves them unchanged the line points at the figures beside it
 * rather than printing them twice (§1.1.63); once they differ it prints them.
 */
const LAST_RESCORE = {
  dateLabel: "Oct 9, 2026",
  change: "the Chicago Fed financial conditions index joined the inputs the record is scored on, the same inputs that now set the guidance",
  before: { held: 169, comparisons: 176, changes: 7, signaled: 2, graded: 5 },
} as const;

const percent = (held: number, of: number) => `${Math.round((held / of) * 100)}%`;

const rescoreLead = () => `Re-scored on ${LAST_RESCORE.dateLabel}, when ${LAST_RESCORE.change}.`;

/** /calibration's line on the last re-score: the study's count before it, where that differs from the count above. */
export const describeCalibrationRescore = (now: { held: number; comparisons: number }): string => {
  const { before } = LAST_RESCORE;
  return now.held === before.held && now.comparisons === before.comparisons
    ? `${rescoreLead()} No month's conditions changed, so the count above is the one published before it.`
    : `${rescoreLead()} Before it, ${before.held} of ${before.comparisons} comparisons held (${percent(before.held, before.comparisons)}).`;
};

/** /history's line on the last re-score: the changes and the advance signals before it, where those differ from the tiles. */
export const describeTrackRecordRescore = (now: { changes: number; signaled: number; graded: number }): string => {
  const { before } = LAST_RESCORE;
  return now.changes === before.changes && now.signaled === before.signaled && now.graded === before.graded
    ? `${rescoreLead()} No month's conditions changed, so the counts above are the ones published before it.`
    : `${rescoreLead()} Before it, the record showed ${before.changes} changes in conditions, and ${before.signaled} of the last ${before.graded} signaled in advance.`;
};
