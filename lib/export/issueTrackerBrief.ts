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
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import type { RegimeAssessment } from "../regimeEngine";
import type { CanonicalDecisionCopy } from "../report/canonicalDecisionCopy";
import { formatNumberWithUnit } from "../formatters";
import { buildComplianceStamp } from "../exportNotices";
import { EXPORT_SECTION_HEADINGS, RECESSION_GAUGE_LABEL, buildAreaRowLines, buildCallLines, buildReadingLines, type ModeledExportDecisionPayload } from "./briefBuilders";
import { describeBaseRateSource, describeConditions, formatExportConfidenceWord } from "./exportTerms";
import type { PreviousReading } from "./scoreReference";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { resolvePublishedConfidence } from "../report/confidence";
import { regimeSignalLabel } from "../report/signalTranslations";
import { formatDecisionReversal, formatDecisionThreshold } from "../report/reportFormatting";
import type { ActionStripItem } from "../report/operatingCalls";
import { decisionAreaLabel } from "../report/boundedDecisionRules";
import { operatingLeverToDecisionArea } from "../report/businessAreaMap";

type IssueTrackerFormat = "markdown" | "wiki";

type ExportDecisionModel = ModeledExportDecisionPayload & {
  confidencePercent?: number;
  compactFlipConditionLabels?: string[];
  canonicalDecisionCopy?: CanonicalDecisionCopy;
  decisionShiftSummary?: string;
  trendLabel?: string;
  /** The earlier scores and the date they are from, when the caller's read carries a comparison; never invented. */
  previousScores?: PreviousReading | null;
};

export const buildExportStamp = (treasury: TreasuryData, confidence: string) =>
  buildComplianceStamp({
    sourceLine: treasury.source,
    timestamp: treasury.record_date,
    confidence,
  });

export const buildIssueTrackerMarkdownBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[],
  decisionModel?: ExportDecisionModel,
  format: IssueTrackerFormat = "markdown",
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const conditionsLabel = describeConditions(assessment.regime, decisionModel?.postureWithStageLabel);
  const isWiki = format === "wiki";
  const bullet = isWiki ? "*" : "-";
  const heading2 = isWiki ? "h2. " : "## ";
  const heading3 = isWiki ? "h3. " : "### ";
  const strong = (label: string) => (isWiki ? `*${label}:*` : `**${label}:**`);
  const macroLines = macros.map(
    (macro) => `${bullet} ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`,
  );
  const exportOptions = { modeledDecision: decisionModel, previousScores: decisionModel?.previousScores ?? null };
  /* A top-level bullet for the row, its lines and timing indented under it. */
  const asBullets = (lines: string[]) =>
    lines.map((line) => (line.startsWith("•") ? `${bullet} ${line.replace(/^•\s*/, "")}` : `  ${bullet} ${line.trim()}`));
  const callLines = asBullets(buildCallLines(assessment, exportOptions));
  const areaRows = asBullets(buildAreaRowLines(exportOptions));
  /* The readings every paste carries, through the one builder they share: this was a
     private copy of it, and a line added to the paste's "what changed" would not have
     reached the wiki form. */
  const readingLines = buildReadingLines(assessment, exportOptions).map((line) => `${bullet} ${line}`);
  /* The stamp below carries the source in plain text for every format; the
     wiki form adds a linked one because its stamp URL is not clickable. */
  const sourceLine = isWiki ? `Source: [${treasury.source}|${treasury.source}]` : null;

  /*
   * The page's order: the call first, then what changed (the two scores against
   * their lines, the rate inputs, the readings), then one row per area. No
   * engine key beside the label: it used to print `**Regime:** EXPANSION` under
   * "Conditions: Sunny", a second vocabulary for one state on a card a whole
   * team reads; the JSON routes are where a machine looks it up.
   */
  return [
    `${heading2}Whether Weekly Brief — ${treasury.record_date}`,
    `${strong("Conditions")} ${conditionsLabel}`,
    "",
    `${heading3}This week's guidance`,
    ...callLines,
    "",
    `${heading3}${EXPORT_SECTION_HEADINGS.changed}`,
    ...readingLines,
    `${bullet} ${strong(regimeSignalLabel.baseRate)} ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (read from ${describeBaseRateSource(assessment.scores.baseRateUsed)})`,
    `${bullet} ${strong(RECESSION_GAUGE_LABEL)} ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    ...macroLines,
    ...(areaRows.length > 0 ? ["", `${heading3}${EXPORT_SECTION_HEADINGS.areas}`, ...areaRows] : []),
    ...(sourceLine ? ["", sourceLine] : []),
    "",
    ...buildExportStamp(
      treasury,
      `${formatExportConfidenceWord(resolvePublishedConfidence({ assessment, record: treasury }).label)} (how far the scores sit from the line where conditions change)`,
    ),
  ].join("\n");
};

/**
 * A per-business-area guardrail block an operator pastes into a work item.
 *
 * This is the credential-free slice of the Linear/Jira sync: no tokens are
 * stored and nothing is written to the tracker — the operator copies one block
 * per area into the card description, and the card now carries posture, the
 * pause trigger, the flip condition, and the flip watch. The block uses the
 * same bounded-rule fields the Slack brief and the hero print, so a card
 * cannot state a threshold the weekly call does not.
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
  flipWatchSentence,
}: {
  actionStripItems: readonly ActionStripItem[];
  postureLabel: string;
  recordDate: string;
  /** The nearest flip distance in the market's units, as the hero prints it. */
  flipWatchSentence?: string;
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
      ...(flipWatchSentence ? [`**${DECISION_CONTRACT_LABELS.watch.flipWatch}:** ${flipWatchSentence}`] : []),
      `_Week of ${recordDate}_`,
    ].join("\n"),
  }));
