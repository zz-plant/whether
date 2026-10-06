import type { BriefDocument } from "../report/briefArtifact";
import { decisionAreaLabel, type DecisionArea } from "../report/boundedDecisionRules";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { formatDateUTC, formatThresholdNumber } from "../formatters";
import { signalReadingMeaning } from "../report/signalTranslations";
import { formatExportConfidenceWord, formatSourceFooter } from "./exportTerms";
import { buildCanonicalUrl } from "../seo";

/**
 * The portfolio note: what an investor's platform team or an accelerator pastes
 * to the companies it backs.
 *
 * The other formats run from a company outward (`investorUpdateSnippet.ts` is a
 * founder writing to investors). This runs the other way, one sender to many
 * companies whose runways differ, so it cannot carry one runway sentence: it
 * prints what the week means at each of the four bands — the document's
 * every-band runway, from the same notes the brief prints for the band a
 * reader picks (`buildRunwayConditionedNotes`) — and
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

/**
 * The areas come in as the area tables print them (`app/operate/areaRows.ts`
 * joins each rule's lines), so a company reads the same lines here as on the
 * plan page; everything else is the week's brief document.
 */
export const buildPortfolioNote = (document: BriefDocument, areas: readonly PortfolioArea[]): string => {
  const { tightness, riskAppetite } = document.readings.scores;
  const confidence = formatExportConfidenceWord(document.confidence);

  /* Each note opens "With <runway> of runway", which reads once on the brief and
     three times in a row here; the band's label says it once instead. */
  const bands = document.runway.everyBand.flatMap(({ phrase, notes }) => {
    const opener = `With ${phrase} of runway`;
    const lines = notes.map((note) =>
      capitalize(note.startsWith(opener) ? note.slice(opener.length).replace(/^,?\s*/, "") : note),
    );
    return lines.length > 0 ? [`- ${capitalize(phrase)} of runway: ${lines.join(" ")}`] : [];
  });

  return [
    `For the companies we back: this week's funding climate, from Whether (week of ${formatDateUTC(document.provenance.recordDate)}).`,
    "",
    `Conditions: ${document.conditions.line}. Confidence: ${confidence}.`,
    `Funding pressure is ${formatThresholdNumber(tightness)} of 100 (${signalReadingMeaning("tightness", tightness)}); risk appetite is ${formatThresholdNumber(riskAppetite)} of 100 (${signalReadingMeaning("riskAppetite", riskAppetite)}).`,
    "",
    "The rule for each area, with the line that pauses it and the line that resumes it:",
    ...areas.map(formatArea),
    "",
    "What it means at your runway:",
    ...bands,
    "",
    `To move these lines for your own plan and get an email the day one is crossed: ${buildCanonicalUrl("/operate")}#ops-plan-lines`,
    `${formatSourceFooter(document.provenance)}.`,
    `Full brief: ${document.provenance.permalink}`,
  ].join("\n");
};
