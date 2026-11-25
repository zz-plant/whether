import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import { buildRegimeTrackRecord } from "../../../lib/summary/regimeTrackRecord";
import { countRecord } from "../../../lib/report/trackRecord";
import { formatMonthYearShortFromValue } from "../../../lib/formatters";
import type { buildAdvanceWarningMarks } from "../../../lib/report/advanceWarning";

/**
 * The questions `/history` asks in its headings and the sentence that answers each, answer
 * first (docs/editorial-guardrails.md, "Questions and answers, as people say them").
 *
 * One object each for the section and the page's markup: the heading and its lead render from
 * it, and `buildHistoryStructuredData` carries the same words as `Question` nodes. "Has it been
 * right?" was the page summary's opening and the metadata title, over a section headed "Track
 * record"; it is that section's heading now, asked once (2026-11-25).
 */
export type HistoryQuestion = { question: string; answer: string };

const HAS_IT_BEEN_RIGHT = "Has it been right?";

/**
 * "Has it been right?", from the advance-warning marks the section draws: how many changes in
 * conditions had warning, across the whole record. The guidance does not forecast, so this is
 * what the record can grade it on: whether the score that changed conditions had been near its
 * line first. The marks' own definition is printed under the grading table below.
 */
export const describeTrackRecordAnswer = (
  warnings: Pick<ReturnType<typeof buildAdvanceWarningMarks>, "total" | "warned">,
  firstRecordDate: string | undefined,
): HistoryQuestion => {
  const since = firstRecordDate ? ` since ${formatMonthYearShortFromValue(firstRecordDate)}` : "";
  const { total, warned } = warnings;
  const missed = total - warned;
  if (total === 0) {
    return { question: HAS_IT_BEEN_RIGHT, answer: `Conditions have not changed${since}, so there is no change to grade yet.` };
  }
  const lead = `${warned} of ${total} changes${since} had advance warning.`;
  const rest = missed === 0 ? "" : ` The other ${missed} came from a single month's move.`;
  return { question: HAS_IT_BEEN_RIGHT, answer: `${lead}${rest}` };
};

const YEAR_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "the last five years" for 60 month-ends, "the last 18 months" otherwise. */
const windowWords = (months: number) =>
  months % 12 === 0 && YEAR_WORDS[months / 12] ? `the last ${YEAR_WORDS[months / 12]} years` : `the last ${months} months`;

/**
 * The grading section's question and answer, over the trailing window it grades: how many of
 * its changes had warning, and how many changed back within a month. Those two facts were the
 * section's "Near the line the month before" and "Changed back within a month" tiles.
 */
export const buildRecentRecordQuestion = (series: readonly TimeMachineRegimeEntry[]): HistoryQuestion | null => {
  if (series.length < 2) return null;
  const record = buildRegimeTrackRecord([...series]);
  const counts = countRecord([...series]);
  const months = counts?.readings ?? record.observations;
  const graded = record.transitions.length;
  const question = `How has it done in ${windowWords(months)}?`;
  if (graded === 0) {
    return { question, answer: `Conditions held through all ${months} month-ends, so there is no change to grade.` };
  }
  const back = record.whipsawCount === 0 ? "none" : String(record.whipsawCount);
  return {
    question,
    answer: `${record.signaledCount} of ${graded} changes had advance warning, and ${back} changed back within a month.`,
  };
};
