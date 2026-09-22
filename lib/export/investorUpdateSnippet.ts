/**
 * The monthly investor update block: two paragraphs an operator pastes into the
 * "market" section of an investor letter, built from the same reading every
 * other export reads.
 *
 * The month is the unit here, not the week. A weekly delta is what the brief
 * is for; an investor letter goes out monthly and compares against the last
 * one, so the movement reported is against the prior month-end reading in the
 * regime history rather than against last Monday.
 *
 * Split into parts rather than one string because `/share` is server rendered
 * and cached, so it cannot read the runway cookie — and the runway sentence is
 * the one paragraph that depends on the reader's company. The page builds the
 * reading; the client composes the block with whichever band the browser holds.
 */
import type { RegimeAssessment } from "../regimeEngine";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import type { MonthlyRegimeHistoryEntry } from "../summary/monthlyRegimeHistory";
import { monthKeyFor } from "../summary/monthlyRegimeHistory";
import { getRegimePublicLabel, getRegimeWeatherRationale } from "../regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { pauseConditionOnly, SAVED_COPY_NOTE } from "./exportTerms";
import { signalReadingMeaning } from "../report/signalTranslations";
import { formatMonthYearShortFromValue, formatSignedDelta, formatThresholdNumber } from "../formatters";
import type { RunwayBand } from "../report/operatorRunway";

export type InvestorUpdateSnippetParts = {
  /** Paragraph one: the regime, and how the two scores moved since the prior month-end. */
  conditions: string;
  /** Paragraph two, before the runway sentence: the call, its guardrail, and its reversal. */
  response: string;
  /** The stamp line under the block. */
  source: string;
};

/*
 * One sentence per band, in the first person an investor letter is written in.
 * The runway clause is the one fact the site knows, because the reader chose
 * the band. What the company is doing about it is not: an earlier version
 * asserted a second-signoff rule, a raise process under way and senior hires
 * in progress, in the founder's own voice, chosen by band rather than by them.
 * Those are bracketed prompts now, the way the downloadable templates leave a
 * field blank rather than filling it with a plausible figure.
 */
const RUNWAY_IMPLICATIONS: Record<RunwayBand, string> = {
  critical:
    "With under six months of runway, cash comes before the macro read: [our rule for new commitments until runway passes nine months].",
  tight:
    "With six to twelve months of runway, every new commitment has to pay back inside [n] months, and [where we are on raise planning].",
  balanced:
    "With twelve to twenty-four months of runway, the weekly call sets our pace.",
  abundant:
    "With more than two years of runway we are [what the cushion is going on], without loosening the payback bar.",
};

const CONFIDENCE_PHRASES: Record<RegimeAssessment["diagnostics"]["confidence"], string> = {
  HIGH: "well clear of the line that would change it",
  MEDIUM: "within reach of the line that would change it",
  LOW: "close to the line that would change it",
};

/** The last month-end reading before the month the record date falls in. */
export const findPriorMonthEnd = (
  history: readonly MonthlyRegimeHistoryEntry[],
  recordDate: string,
): MonthlyRegimeHistoryEntry | null => {
  const currentMonth = monthKeyFor(recordDate);
  let prior: MonthlyRegimeHistoryEntry | null = null;
  for (const entry of history) {
    if (monthKeyFor(entry.record_date) >= currentMonth) continue;
    if (!prior || entry.record_date > prior.record_date) prior = entry;
  }
  return prior;
};

/** An older archive month may carry the regime without its scores; then there is no move to report. */
/** The contract's clauses are written for a labelled slot and carry no full stop; a paragraph needs one. */
const asSentence = (clause: string) => {
  const trimmed = clause.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const describeMove = (current: number, previous: number | undefined) => {
  if (typeof previous !== "number") return null;
  const delta = current - previous;
  return Math.abs(delta) < 0.5 ? "unchanged" : `${formatSignedDelta(delta)} points`;
};

export const buildInvestorUpdateSnippetParts = ({
  assessment,
  recordDate,
  weeklyCall,
  monthlyHistory,
  sourceLabel,
  isFallback = false,
}: {
  assessment: RegimeAssessment;
  recordDate: string;
  weeklyCall: Pick<WeeklyCallContract, "actionNow" | "pauseIf" | "callChangesIf" | "resumeWhen">;
  monthlyHistory: readonly MonthlyRegimeHistoryEntry[];
  sourceLabel: string;
  isFallback?: boolean;
}): InvestorUpdateSnippetParts => {
  const regimeLabel = getRegimePublicLabel(assessment.regime);
  const { tightness, riskAppetite } = assessment.scores;
  const prior = findPriorMonthEnd(monthlyHistory, recordDate);
  const confidence = CONFIDENCE_PHRASES[assessment.diagnostics.confidence];

  const regimeSentence = prior
    ? prior.regime === assessment.regime
      ? `Whether's read of the operating environment is ${regimeLabel} as of ${recordDate}, unchanged since the end of ${formatMonthYearShortFromValue(prior.record_date)}.`
      : `Whether's read of the operating environment moved to ${regimeLabel} as of ${recordDate}, from ${getRegimePublicLabel(prior.regime)} at the end of ${formatMonthYearShortFromValue(prior.record_date)}.`
    : `Whether's read of the operating environment is ${regimeLabel} as of ${recordDate}.`;

  /* The weather word alone means nothing to an investor who has never seen the site. */
  const meaningSentence = getRegimeWeatherRationale(assessment.regime).split(". ")[0].replace(/\.?$/, ".");

  const tightnessMove = describeMove(tightness, prior?.tightness);
  const riskMove = describeMove(riskAppetite, prior?.riskAppetite);
  const scoreSentence = tightnessMove && riskMove
    ? `Over the month, funding pressure moved to ${formatThresholdNumber(tightness)} of 100 (${tightnessMove}; ${signalReadingMeaning("tightness", tightness)}) and risk appetite to ${formatThresholdNumber(riskAppetite)} of 100 (${riskMove}; ${signalReadingMeaning("riskAppetite", riskAppetite)}).`
    : `Funding pressure sits at ${formatThresholdNumber(tightness)} of 100 (${signalReadingMeaning("tightness", tightness)}) and risk appetite at ${formatThresholdNumber(riskAppetite)} of 100 (${signalReadingMeaning("riskAppetite", riskAppetite)}).`;

  const conditions = `${regimeSentence} ${meaningSentence} ${scoreSentence} The call is ${confidence}.`;

  /* The page's own slot names, so an investor who opens the brief finds the
     same three lines under the same words. "Guardrail" and "change our
     course" were two more names for them. */
  const response = [
    `Our operating response this month: ${asSentence(weeklyCall.actionNow)}`,
    `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${asSentence(pauseConditionOnly(weeklyCall.pauseIf))}`,
    `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${asSentence(weeklyCall.callChangesIf)}`,
    ...(weeklyCall.resumeWhen
      ? [`${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${asSentence(weeklyCall.resumeWhen)}`]
      : []),
  ].join(" ");

  const source = `Source: ${sourceLabel}, ${recordDate}, via whether.work${isFallback ? ` (${SAVED_COPY_NOTE})` : ""}.`;

  return { conditions, response, source };
};

/**
 * The block as pasted. The runway sentence closes the second paragraph when a
 * band is known, and is simply absent otherwise — a letter that says "runway
 * band not set" is worse than one that leaves runway to the author.
 */
export const formatInvestorUpdateSnippet = (
  parts: InvestorUpdateSnippetParts,
  runwayBand: RunwayBand | null | undefined,
): string => {
  const response = runwayBand ? `${parts.response} ${RUNWAY_IMPLICATIONS[runwayBand]}` : parts.response;
  return [parts.conditions, "", response, "", parts.source].join("\n");
};
