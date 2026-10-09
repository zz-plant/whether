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
