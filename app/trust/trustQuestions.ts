import type { SourceBoardRow } from "../../lib/report/sourceHealth";
import type { TrustStripProps } from "../components/trustStrip";
import { formatMarginReading } from "../../lib/report/reportFormatting";

/**
 * The questions `/trust` asks and the sentence that answers each, answer first
 * (docs/editorial-guardrails.md, "Questions and answers, as people say them").
 *
 * One object for the page and its markup: the h1 and the line under it, the source board's
 * heading and lead, the derivation's heading and lead, and the limits fold's summary render
 * from these, and the page's `Question` nodes (`buildTrustStructuredData`) read the same
 * entries. The nav already asked "Can I trust this?"; the page answered "How much to trust this
 * week's guidance" with no sentence under it until 2026-11-25.
 */
type TrustQuestion = { question: string; answer: string };

export const TRUST_PAGE_QUESTION = "Can we trust this week's guidance?";

/** The meta description: the page's question answered in two spoken sentences. */
export const trustPageDescription =
  "Yes, when every source is current and the scores sit well clear of a change. Check each source's date, how close conditions are to changing and how each score is worked out.";

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const countWord = (count: number) => COUNT_WORDS[count] ?? String(count);

const lowerFirst = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

/* "Stale · 2mo old" reads "stale, 2mo old" in a sentence; "Cached copy" reads "a cached copy". */
const stateInWords = (stateLabel: string) => {
  const words = lowerFirst(stateLabel).replace(/\s·\s/g, ", ");
  return words.startsWith("cached copy") ? `a ${words}` : words;
};

/** "Is the data current?", answered from the rows the board prints. */
export const describeSourcesAnswer = (rows: readonly Pick<SourceBoardRow, "sourceName" | "stateLabel" | "asIntended">[]): string => {
  const total = rows.length;
  if (total === 0) return "No source has reported yet, so hold anything you can't undo.";
  const behind = rows.filter((row) => !row.asIntended);
  if (behind.length === 0) {
    return `Yes: all ${countWord(total)} sources are current, each inside the window it updates in.`;
  }
  const current = total - behind.length;
  const lead = current === 0 ? `No: none of the ${countWord(total)} sources is current` : `Mostly: ${countWord(current)} of ${countWord(total)} sources are current`;
  const detail = behind.map((row) => `${row.sourceName} is ${stateInWords(row.stateLabel)}`).join("; ");
  return `${lead}. ${detail.charAt(0).toUpperCase()}${detail.slice(1)}.`;
};

/** "Can we trust this week's guidance?", from the strip under the h1 and the source rows. */
const describeTrustAnswer = ({
  rows,
  strip,
  regime,
}: {
  rows: readonly Pick<SourceBoardRow, "asIntended">[];
  strip: Pick<TrustStripProps, "savedCopy" | "margin" | "couldChangeNextWeek">;
  regime?: string;
}): string => {
  if (strip.savedCopy) {
    return "Not fully: this is a saved copy, not this week's reading. Hold anything you can't undo until live data is back.";
  }
  const behind = rows.filter((row) => !row.asIntended).length;
  const lead = strip.couldChangeNextWeek ? "With care" : behind === 0 ? "Yes" : "Mostly";
  const sources =
    behind === 0
      ? "every source is current"
      : `${countWord(behind)} of ${countWord(rows.length)} sources ${behind === 1 ? "is" : "are"} out of date`;
  const room =
    strip.margin === null
      ? "the room before a change can't be measured because an input is missing"
      : strip.margin
        ? `conditions sit ${lowerFirst(formatMarginReading(strip.margin, regime))}`
        : null;
  const first = room ? `${lead}: ${sources}, and ${room}.` : `${lead}: ${sources}.`;
  return strip.couldChangeNextWeek ? `${first} They could change next week.` : first;
};

export const SCORES_QUESTION: TrustQuestion = {
  question: "How are the scores worked out?",
  answer:
    "From public U.S. market data: interest rates set most of each score, market reads adjust it, and each lands between 0 and 100.",
};

/** The limits fold's summary: the question it answers and this week's answer, the change line in words. */
const describeLimitsQuestion = (flipThreshold: string): TrustQuestion => ({
  question: "What would change conditions?",
  answer: flipThreshold,
});

export const buildTrustQuestions = ({
  rows,
  strip,
  regime,
  flipThreshold,
}: {
  rows: readonly Pick<SourceBoardRow, "sourceName" | "stateLabel" | "asIntended">[];
  strip: Pick<TrustStripProps, "savedCopy" | "margin" | "couldChangeNextWeek">;
  regime?: string;
  flipThreshold: string;
}) => ({
  page: { question: TRUST_PAGE_QUESTION, answer: describeTrustAnswer({ rows, strip, regime }) },
  sources: { question: "Is the data current?", answer: describeSourcesAnswer(rows) },
  scores: SCORES_QUESTION,
  limits: describeLimitsQuestion(flipThreshold),
});

