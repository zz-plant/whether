import type { RegimeAssessment, RegimeThresholds } from "../../lib/regimeEngine";
import { DEFAULT_THRESHOLDS } from "../../lib/regimeEngine";
import type { TreasuryData } from "../../lib/types";
import type { TimeMachineRegimeEntry } from "../../lib/timeMachine/timeMachineCache";
import { getHistoricalAnalogPlaybook } from "../../lib/analogPlaybook";
import { insightDatabase } from "../../data/recommendations";
import { regimeSignalLabel } from "../../lib/report/signalTranslations";
import type { ComparisonBasis } from "../../lib/report/comparisonBasis";
import type { SignalReferenceRow } from "../../lib/report/evidenceReaderModel";
import {
  INVERSION_QUESTION,
  describeConditionChanges,
  describeFossilSummary,
  describeInversionSummary,
  describeRatesSummary,
  describeScoreTrendSummary,
  formatChangeLines,
  summarizeConditionRuns,
  summarizeInversionMonths,
} from "../../lib/report/evidenceInstrumentSummaries";
import { describeLinesAndInputsAnswer, hasCustomLines, type InputChoiceModel } from "../../lib/report/countedInputs";

/**
 * The questions `/signals` asks, and the answer each prints first
 * (docs/editorial-guardrails.md, "Questions and answers, as people say them").
 *
 * One object for the page and its markup: the h1 and the line under it, and each closed
 * instrument's question and the answer in its summary, render from this, and the page's
 * `Question` nodes (`buildSignalsStructuredData`) read the same entries. The instruments' answers
 * are built from the values the panels under them draw (lib/report/evidenceInstrumentSummaries.ts).
 */
export type SignalsQuestion = { question: string; answer: string | null };

export const SIGNALS_PAGE_QUESTION = "Why did the guidance change?";

const round = (value: number) => Math.round(value);

/**
 * The page's answer: the guidance follows the two scores, and this is how they moved since the
 * reading the page compares with. "It follows two scores" is the reason; the numbers follow.
 * True in a week the guidance held, too: then the scores held, and the sentence says so.
 */
export const describeGuidanceChange = (
  rows: readonly Pick<SignalReferenceRow, "key" | "value" | "previous">[],
  basis: Pick<ComparisonBasis, "reference" | "since">,
): string => {
  const pressure = rows.find((row) => row.key === "tightness");
  const appetite = rows.find((row) => row.key === "riskAppetite");
  if (typeof pressure?.value !== "number" || typeof appetite?.value !== "number") {
    return "It follows two scores, funding pressure and risk appetite, and this week's did not load.";
  }
  const now = { pressure: round(pressure.value), appetite: round(appetite.value) };
  if (pressure.previous === null || appetite.previous === null) {
    return `It follows two scores: funding pressure is ${now.pressure} and risk appetite ${now.appetite}.`;
  }
  const before = { pressure: round(pressure.previous), appetite: round(appetite.previous) };
  const pressureMoved = before.pressure !== now.pressure;
  const appetiteMoved = before.appetite !== now.appetite;
  if (!pressureMoved && !appetiteMoved) {
    return `It follows two scores, and both held ${basis.since}: funding pressure ${now.pressure}, risk appetite ${now.appetite}.`;
  }
  const clause = (name: string, moved: boolean, from: number, to: number) =>
    moved ? `${name} went from ${from} to ${to}` : `${name} held at ${to}`;
  const since = basis.since.charAt(0).toUpperCase() + basis.since.slice(1);
  return `It follows two scores. ${since}, ${clause("funding pressure", pressureMoved, before.pressure, now.pressure)} and ${clause(
    "risk appetite",
    appetiteMoved,
    before.appetite,
    now.appetite,
  )}.`;
};

type TrendPoint = { label: string; value: number };

type YieldCurvePoint = {
  recordDate: string;
  oneMonth: number | null;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
};

const lowerFirst = (text: string) => (/^[A-Z][a-z]*(?:[\s,-]|$)/.test(text) ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : text);

/** Each closed instrument's question and its answer this week, in page order. */
export const buildInstrumentQuestions = ({
  assessment,
  treasury,
  yieldCurveSeries,
  tightnessTrend,
  riskAppetiteTrend,
  regimeSeries,
  inputChoice = null,
  thresholds = assessment.thresholds,
}: {
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">;
  treasury: Pick<TreasuryData, "record_date" | "yields">;
  yieldCurveSeries: readonly YieldCurvePoint[];
  tightnessTrend: readonly TrendPoint[];
  riskAppetiteTrend: readonly TrendPoint[];
  regimeSeries: readonly TimeMachineRegimeEntry[];
  inputChoice?: InputChoiceModel | null;
  thresholds?: RegimeThresholds;
}) => {
  const inversion = summarizeInversionMonths(yieldCurveSeries);
  const analog = getHistoricalAnalogPlaybook(assessment);
  return {
    rates: {
      question: "What are interest rates doing?",
      answer: describeRatesSummary({
        current: { recordDate: treasury.record_date, oneMonth: treasury.yields.oneMonth },
        series: yieldCurveSeries,
      }),
    },
    curve: {
      question: INVERSION_QUESTION,
      answer:
        inversion.months.length > 0
          ? describeInversionSummary({
              months: inversion.months.length,
              inverted10Y2Y: inversion.inverted10Y2Y,
              inverted2Y3M: inversion.inverted2Y3M,
            })
          : null,
    },
    trends: {
      question: "How have the two scores moved over the past year?",
      answer: describeScoreTrendSummary([
        { label: regimeSignalLabel.tightness, points: tightnessTrend },
        { label: regimeSignalLabel.riskAppetite, points: riskAppetiteTrend },
      ]),
    },
    lines: {
      question: inputChoice
        ? "What would conditions be with different lines or inputs?"
        : "What would conditions be with different lines?",
      answer: describeLinesAndInputsAnswer({
        customLines: hasCustomLines(thresholds, DEFAULT_THRESHOLDS),
        inputs: inputChoice,
        linesText: formatChangeLines(thresholds),
      }),
    },
    pastMonths: {
      question: "What was the guidance in an earlier month?",
      answer: regimeSeries.length > 0 ? describeConditionChanges(summarizeConditionRuns(regimeSeries)) : null,
    },
    /* "Which past cycle is this most like?", not "When was it last like this?": the answer is the
       nearest of a few hand-picked reference cycles, which is not always the last time. */
    analog: {
      question: "Which past cycle is this most like?",
      answer: `${analog.analogPeriod}: ${lowerFirst(analog.regimeType)}`,
    },
    fossil: {
      question: "Which zero-rate habits should we check for?",
      answer: describeFossilSummary(insightDatabase.fossilRecord.rows),
    },
  } satisfies Record<string, SignalsQuestion>;
};

export type InstrumentQuestions = ReturnType<typeof buildInstrumentQuestions>;

/**
 * The entries the markup carries: every question with an answer this week, except the line
 * settings, whose summary prints the lines in force rather than an answer to what would change.
 */
export const answeredInstrumentQuestions = (questions: InstrumentQuestions) =>
  [questions.rates, questions.curve, questions.trends, questions.pastMonths, questions.analog, questions.fossil].flatMap(
    (entry) => (entry.answer ? [{ question: entry.question, answer: entry.answer }] : []),
  );
