/**
 * The weekly brief rendered for issue trackers and wikis.
 *
 * Extracted from `app/operate/components/exportBriefPanel.tsx`, where it sat as
 * a private function inside a 940-line client component and so could not be
 * tested without rendering the panel. It is pure, so it belongs beside the other
 * export builders in `lib/export/`.
 *
 * Jira and Linear both consume the `markdown` form; they differ only in the
 * button that copies them, not in the bytes produced.
 */
import type { BriefDocument } from "../report/briefArtifact";
import { formatNumberWithUnit } from "../formatters";
import { buildComplianceStamp } from "../exportNotices";
import { EXPORT_SECTION_HEADINGS, RECESSION_GAUGE_LABEL, buildAreaRowLines, briefReadingLines, buildCallLines } from "./briefBuilders";
import { describeBaseRateSource, formatExportConfidenceWord } from "./exportTerms";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { regimeSignalLabel } from "../report/signalTranslations";
import { formatDecisionReversal, formatDecisionThreshold } from "../report/reportFormatting";
import type { ActionStripItem } from "../report/operatingCalls";
import { decisionAreaLabel } from "../report/boundedDecisionRules";
import { operatingLeverToDecisionArea } from "../report/businessAreaMap";

type IssueTrackerFormat = "markdown" | "wiki";

export const buildIssueTrackerMarkdownBrief = (
  document: BriefDocument,
  format: IssueTrackerFormat = "markdown",
) => {
  const { readings, provenance } = document;
  const isWiki = format === "wiki";
  const bullet = isWiki ? "*" : "-";
  const heading2 = isWiki ? "h2. " : "## ";
  const heading3 = isWiki ? "h3. " : "### ";
  const strong = (label: string) => (isWiki ? `*${label}:*` : `**${label}:**`);
  const macroLines = readings.macros.map(
    (macro) => `${bullet} ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`,
  );
  /* A top-level bullet for the row, its lines and timing indented under it. */
  const asBullets = (lines: string[]) =>
    lines.map((line) => (line.startsWith("•") ? `${bullet} ${line.replace(/^•\s*/, "")}` : `  ${bullet} ${line.trim()}`));
  const callLines = asBullets(buildCallLines(document));
  const areaRows = asBullets(buildAreaRowLines(document));
  /* The readings every paste carries, through the one builder they share: this was a
     private copy of it, and a line added to the paste's "what changed" would not have
     reached the wiki form. */
  const readingLines = briefReadingLines(document).map((line) => `${bullet} ${line}`);
  /* The stamp below carries the source in plain text for every format; the
     wiki form adds a linked one because its stamp URL is not clickable. */
  const sourceLine = isWiki ? `Source: [${provenance.sourceUrl}|${provenance.sourceUrl}]` : null;

  /*
   * The page's order: the call first, then what changed (the two scores against
   * their lines, the rate inputs, the readings), then one row per area. No
   * engine key beside the label: it used to print `**Regime:** EXPANSION` under
   * "Conditions: Sunny", a second vocabulary for one state on a card a whole
   * team reads; the JSON routes are where a machine looks it up.
   */
  return [
    `${heading2}Whether Weekly Brief — ${provenance.recordDate}`,
    `${strong("Conditions")} ${document.conditions.line}`,
    "",
    `${heading3}This week's guidance`,
    ...callLines,
    "",
    `${heading3}${EXPORT_SECTION_HEADINGS.changed}`,
    ...readingLines,
    `${bullet} ${strong(regimeSignalLabel.baseRate)} ${formatNumberWithUnit(readings.baseRate, "%")} (read from ${describeBaseRateSource(readings.baseRateUsed)})`,
    `${bullet} ${strong(RECESSION_GAUGE_LABEL)} ${formatNumberWithUnit(readings.curveSlope, "%")}`,
    ...macroLines,
    ...(areaRows.length > 0 ? ["", `${heading3}${EXPORT_SECTION_HEADINGS.areas}`, ...areaRows] : []),
    ...(sourceLine ? ["", sourceLine] : []),
    "",
    ...buildComplianceStamp({
      sourceLine: provenance.sourceUrl,
      timestamp: provenance.recordDate,
      confidence: `${formatExportConfidenceWord(document.confidence)} (how far the scores sit from the line where conditions change)`,
    }),
  ].join("\n");
};

/**
 * A per-business-area guardrail block an operator pastes into a work item.
 *
 * This is the credential-free slice of the Linear/Jira sync: no tokens are
 * stored and nothing is written to the tracker — the operator copies one block
 * per area into the card description, and the card now carries the conditions,
 * the area's pause and resume lines, and what would change the guidance. The
 * block uses the same bounded-rule fields the Slack brief and the hero print, so
 * a card cannot state a threshold the weekly call does not.
 */
export type GuardrailTagBlock = {
  /** Business-area lever, e.g. `hiring-stance`. */
  area: string;
  /** Reader-facing business-area label, e.g. "Hiring posture". */
  label: string;
  /** The role that owns this lever's line, when known. */
  ownerLabel?: string;
  /** The paste-ready markdown block. */
  markdown: string;
};

export const buildGuardrailTagBlocks = ({
  actionStripItems,
  postureLabel,
  recordDate,
  callChangesIf,
}: {
  actionStripItems: readonly ActionStripItem[];
  postureLabel: string;
  recordDate: string;
  /**
   * What would change the guidance: the brief's "Conditions change if" sentence
   * (`WeeklyCallContract.callChangesIf`), the hold's own condition on a held week.
   * It was the nearest market move ("If the 1-month Treasury bill rate rises 0.15%,
   * conditions turn Cloudy."), which on a held week named a rate move beside
   * guidance the hold says is not changing.
   */
  callChangesIf?: string;
}): GuardrailTagBlock[] =>
  actionStripItems.map((item) => ({
    area: item.lever,
    label: item.label,
    ownerLabel: item.ownerLabel,
    markdown: [
      /* The pause and resume lines below name only their condition, so the area
         they belong to heads the block. */
      `**${decisionAreaLabel(operatingLeverToDecisionArea[item.lever])}**`,
      `**Conditions:** ${postureLabel}`,
      `**${DECISION_CONTRACT_LABELS.action.actionNow}:** ${item.areaActionNow}`,
      `**${DECISION_CONTRACT_LABELS.threshold.pauseIf}:** ${formatDecisionThreshold(item.triggerThreshold)}`,
      `**${DECISION_CONTRACT_LABELS.reversal.resumeWhen}:** ${formatDecisionReversal(item.reversalCondition)}`,
      ...(callChangesIf ? [`**${DECISION_CONTRACT_LABELS.watch.flipWatch}:** ${callChangesIf}`] : []),
      `_Week of ${recordDate}_`,
    ].join("\n"),
  }));
