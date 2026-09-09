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

export type IssueTrackerFormat = "markdown" | "wiki";

export type ExportDecisionModel = ModeledExportDecisionPayload & {
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
