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
import { getRegimePublicLabel } from "../regimePresentation";
import { buildComplianceStamp } from "../exportNotices";
import { buildBoundedDecisionLines, type ModeledExportDecisionPayload } from "./briefBuilders";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import type { ActionStripItem } from "../report/operatingCalls";

type IssueTrackerFormat = "markdown" | "wiki";

type ExportDecisionModel = ModeledExportDecisionPayload & {
  confidenceLabel?: "HIGH" | "MED" | "LOW";
  confidencePercent?: number;
  compactFlipConditionLabels?: string[];
  canonicalDecisionCopy?: CanonicalDecisionCopy;
  decisionShiftSummary?: string;
  trendLabel?: string;
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
  const regimeLabel = getRegimePublicLabel(assessment.regime);
  const postureLabel = decisionModel?.postureWithStageLabel ?? regimeLabel;
  const isWiki = format === "wiki";
  const bullet = isWiki ? "*" : "-";
  const heading2 = isWiki ? "h2. " : "## ";
  const heading3 = isWiki ? "h3. " : "### ";
  const strong = (label: string) => (isWiki ? `*${label}:*` : `**${label}:**`);
  const macroLines = macros.map(
    (macro) => `${bullet} ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`,
  );
  const boundedDecisionLines = buildBoundedDecisionLines(assessment, { modeledDecision: decisionModel })
    .map((line) => `${bullet} ${line.replace(/^•\s*/, "")}`);
  const sourceLine = isWiki
    ? `Source: [${treasury.source}|${treasury.source}]`
    : `Source: ${treasury.source}`;

  return [
    `${heading2}Whether Weekly Brief — ${treasury.record_date}`,
    `${strong("Posture")} ${postureLabel}`,
    // The posture label is display copy ("Sunny — Late") and the regime is an
    // engine key ("EXPANSION"), so this line effectively always renders. Kept as
    // it was: the engine key is useful in a ticket, and dropping it would change
    // every existing exported brief.
    ...(postureLabel !== assessment.regime ? [`${strong("Regime")} ${assessment.regime}`] : []),
    `${strong("Funding pressure")} ${assessment.scores.tightness} / ${strong("Risk appetite")} ${assessment.scores.riskAppetite}`,
    `${strong("Base rate")} ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `${strong("Curve slope")} ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    "",
    `${heading3}Macro signals`,
    ...macroLines,
    "",
    `${heading3}Bounded decision`,
    ...boundedDecisionLines,
    "",
    sourceLine,
    "",
    ...buildExportStamp(
      treasury,
      decisionModel?.confidenceLabel
        ? `${decisionModel.confidenceLabel} confidence`
        : "Score-based posture confidence",
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
      `**Posture:** ${postureLabel}`,
      `**${DECISION_CONTRACT_LABELS.action.actionNow}:** ${item.areaActionNow}`,
      `**${DECISION_CONTRACT_LABELS.threshold.pauseIf}:** ${item.triggerThreshold}`,
      `**${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}:** ${item.reversalCondition}`,
      ...(flipWatchSentence ? [`**${DECISION_CONTRACT_LABELS.watch.flipWatch}:** ${flipWatchSentence}`] : []),
      `_Week of ${recordDate}_`,
    ].join("\n"),
  }));
