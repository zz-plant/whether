import type { BriefDocument } from "../report/briefArtifact";
import { decisionAreaLabel, type DecisionArea } from "../report/boundedDecisionRules";
import type { LineState } from "../report/operatingCalls";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { formatThresholdNumber, formatWeekMondayUTC } from "../formatters";
import { signalReadingMeaning } from "../report/signalTranslations";
import { formatDocumentMargin, formatSourceFooter } from "./exportTerms";
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
 * every area's rule with the one side of it that can change the area this week.
 * It ends where a company can set lines of its own, because a shared reading is
 * the start of a plan, not the plan.
 *
 * Built on the server from the cached reading: no runway, no company, nothing
 * from the reader's browser.
 */

type PortfolioArea = {
  area: DecisionArea;
  rule: string;
  /** "Funding pressure > 76", as the area tables print it; a `"crossed"` state is an area on hold. */
  pause?: { line: string; state?: LineState };
  resume?: { line: string };
};

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const asSentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/* The one side that can change the area this week: when it restarts, for an
   area on hold, else when it pauses. Every company reads the same scores, so
   which side applies is the same for all of them; the note printed both until
   2026-11-03. */
const formatArea = ({ area, rule, pause, resume }: PortfolioArea) => {
  const clause = pause?.state === "crossed" && resume
    ? `${DECISION_CONTRACT_LABELS.reversal.resumeWhen} ${resume.line}`
    : pause
      ? `${DECISION_CONTRACT_LABELS.threshold.pauseIf} ${pause.line}`
      : null;
  return `- ${decisionAreaLabel(area)}: ${asSentence(rule)}${clause ? ` ${clause}.` : ""}`;
};

/**
 * The areas come in as the area tables print them (`app/operate/areaRows.ts`
 * joins each rule's lines), so a company reads the same lines here as on the
 * plan page; everything else is the week's brief document.
 */
export const buildPortfolioNote = (document: BriefDocument, areas: readonly PortfolioArea[]): string => {
  const { tightness, riskAppetite } = document.readings.scores;
  const confidence = formatDocumentMargin(document);

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
    `For the companies we back: this week's funding climate, from Whether (week of ${formatWeekMondayUTC(document.provenance.recordDate)}).`,
    "",
    `Conditions: ${document.conditions.line}. ${confidence}.`,
    `Funding pressure is ${formatThresholdNumber(tightness)} of 100 (${signalReadingMeaning("tightness", tightness)}); risk appetite is ${formatThresholdNumber(riskAppetite)} of 100 (${signalReadingMeaning("riskAppetite", riskAppetite)}).`,
    "",
    "The rule for each area:",
    ...areas.map(formatArea),
    "",
    "What it means at your runway:",
    ...bands,
    "",
    `To set these rules for your own plan and get an email the day an area pauses or restarts: ${buildCanonicalUrl("/operate")}#ops-plan-lines`,
    `${formatSourceFooter(document.provenance)}.`,
    `Full brief: ${document.provenance.permalink}`,
  ].join("\n");
};
