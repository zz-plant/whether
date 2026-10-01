import type { RegimeAssessment } from "../regimeEngine";
import { decisionAreaLabel, type DecisionArea } from "../report/boundedDecisionRules";
import { resolvePublishedConfidence, type ConfidenceRecord } from "../report/confidence";
import { buildRunwayConditionedNotes, resolveRunwayForNotes } from "../report/runwayConditionedNotes";
import { RUNWAY_BAND_OPTIONS } from "../report/operatorRunway";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { formatDateUTC, formatThresholdNumber } from "../formatters";
import { signalReadingMeaning } from "../report/signalTranslations";
import { buildBriefPermalinkLine } from "./briefPermalink";
import { describeConditions, formatExportConfidenceWord, SAVED_COPY_NOTE } from "./exportTerms";
import { buildCanonicalUrl } from "../seo";

/**
 * The portfolio note: what an investor's platform team or an accelerator pastes
 * to the companies it backs.
 *
 * The other formats run from a company outward (`investorUpdateSnippet.ts` is a
 * founder writing to investors). This runs the other way, one sender to many
 * companies whose runways differ, so it cannot carry one runway sentence: it
 * prints what the week means at each of the four bands, from the same notes the
 * brief prints for the band a reader picks (`buildRunwayConditionedNotes`), and
 * every area's rule with its two lines. It ends where a company can set lines of
 * its own, because a shared reading is the start of a plan, not the plan.
 *
 * Built on the server from the cached reading: no runway, no company, nothing
 * from the reader's browser.
 */

type PortfolioArea = {
  area: DecisionArea;
  rule: string;
  /** "Funding pressure > 76", as the area tables print it. */
  pause?: string;
  resume?: string;
};

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const asSentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

const formatArea = ({ area, rule, pause, resume }: PortfolioArea) => {
  const clause = [
    pause ? `${DECISION_CONTRACT_LABELS.threshold.pauseIf.toLowerCase()} ${pause}` : null,
    resume ? `${DECISION_CONTRACT_LABELS.reversal.resumeWhen.toLowerCase()} ${resume}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("; ");
  const lines = clause ? ` ${clause.charAt(0).toUpperCase()}${clause.slice(1)}.` : "";
  return `- ${decisionAreaLabel(area)}: ${asSentence(rule)}${lines}`;
};

export const buildPortfolioNote = ({
  assessment,
  record,
  areas,
  sourceLabel,
  isFallback = false,
}: {
  assessment: RegimeAssessment;
  /** The treasury record the assessment was read from. */
  record: ConfidenceRecord & { record_date: string };
  areas: readonly PortfolioArea[];
  sourceLabel: string;
  isFallback?: boolean;
}): string => {
  const { tightness, riskAppetite } = assessment.scores;
  const confidence = formatExportConfidenceWord(resolvePublishedConfidence({ assessment, record }).label);

  /* Each note opens "With <runway> of runway", which reads once on the brief and
     three times in a row here; the band's label says it once instead. */
  const bands = RUNWAY_BAND_OPTIONS.flatMap((band) => {
    const runway = resolveRunwayForNotes({ band: band.key });
    if (!runway) return [];
    const opener = `With ${runway.runwayPhrase} of runway`;
    const notes = buildRunwayConditionedNotes({ regime: assessment.regime, ...runway }).map((note) =>
      capitalize(note.note.startsWith(opener) ? note.note.slice(opener.length).replace(/^,?\s*/, "") : note.note),
    );
    return notes.length > 0 ? [`- ${capitalize(runway.runwayPhrase)} of runway: ${notes.join(" ")}`] : [];
  });

  return [
    `For the companies we back: this week's funding climate, from Whether (week of ${formatDateUTC(record.record_date)}).`,
    "",
    `Conditions: ${describeConditions(assessment.regime)}. Confidence: ${confidence}.`,
    `Funding pressure is ${formatThresholdNumber(tightness)} of 100 (${signalReadingMeaning("tightness", tightness)}); risk appetite is ${formatThresholdNumber(riskAppetite)} of 100 (${signalReadingMeaning("riskAppetite", riskAppetite)}).`,
    "",
    "The rule for each area, with the line that pauses it and the line that resumes it:",
    ...areas.map(formatArea),
    "",
    "What it means at your runway:",
    ...bands,
    "",
    `To move these lines for your own plan and get an email the day one is crossed: ${buildCanonicalUrl("/operate")}#ops-plan-lines`,
    `Source: ${sourceLabel}, ${record.record_date}, via whether.work${isFallback ? ` (${SAVED_COPY_NOTE})` : ""}.`,
    buildBriefPermalinkLine(record.record_date),
  ].join("\n");
};
