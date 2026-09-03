/**
 * Every copyable artifact the export panel offers, derived in one place.
 *
 * `ExportBriefPanel` used to build these inline as twenty separate `useMemo`
 * calls — roughly 130 lines of derivation wedged between the component's state
 * and its 600 lines of JSX, none of it reachable from a test without rendering
 * the panel. The derivations are pure, so they live here and the component
 * calls this once.
 *
 * Overrides are deliberately not applied here. The operator's override banner
 * is appended per artifact at render time, and only to some of them, so
 * applying it in the builder would put it in artifacts that must not carry it.
 */
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import type { RegimeAssessment } from "../regimeEngine";
import { resolveWeekEndingIsoDateUTC } from "../formatters";
import { formatRegimeLabel } from "../regimeFormat";
import { buildAgentPayloadJson, buildAgentPrompt } from "../agentHandoff";
import {
  buildWeeklyBoardSnippetPlainText,
  buildWeeklyCallSnapshotPlainText,
  buildWeeklyOperatorBriefCardText,
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
  buildWeeklyOperatorBriefSlackBlocks,
} from "./weeklyOperatorBrief";
import { buildStakeholderBriefs } from "./stakeholderBriefs";
import {
  buildBoardSlideBullets,
  buildBoardBrief,
  buildCallCitation,
  buildConstraintHeadlines,
  buildSlackBrief,
} from "./briefBuilders";
import { buildIssueTrackerMarkdownBrief, type ExportDecisionModel } from "./issueTrackerBrief";

export type ExportBriefArtifactsInput = {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  sensors: SensorReading[];
  macroSeries: MacroSeriesReading[];
  decisionModel?: ExportDecisionModel;
  /** Operator's free-text addition to the weekly team brief. */
  customTeamNote?: string;
};

export const buildExportBriefArtifacts = ({
  assessment,
  treasury,
  sensors,
  macroSeries,
  decisionModel,
  customTeamNote,
}: ExportBriefArtifactsInput) => {
  const fallbackActive = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const weekEndingDate = resolveWeekEndingIsoDateUTC(treasury.record_date);
  const trimmedTeamNote = customTeamNote?.trim();

  const weeklyOperatorPayload = buildWeeklyOperatorBriefPayload({
    assessment,
    treasury,
    date: weekEndingDate,
    postureWithStageLabel: decisionModel?.postureWithStageLabel,
    confidenceLabel: decisionModel?.confidenceLabel,
    actionStripItems: decisionModel?.actionStripItems,
    flipConditionLabels: decisionModel?.compactFlipConditionLabels,
    canonicalDecisionCopy: decisionModel?.canonicalDecisionCopy,
    customTeamNote: trimmedTeamNote ? trimmedTeamNote : undefined,
  });

  const postureLabel =
    decisionModel?.canonicalDecisionCopy?.currentRegimeLabel
    ?? decisionModel?.postureWithStageLabel
    ?? formatRegimeLabel(assessment.regime);
  const guardrailLine = decisionModel?.guardrailThreshold ?? weeklyOperatorPayload.pauseIf;
  const flipLine =
    decisionModel?.canonicalDecisionCopy?.flipTrigger
    ?? decisionModel?.reversalTrigger
    ?? weeklyOperatorPayload.changeCourseIf;
  const confidenceSuffix = decisionModel?.confidencePercent
    ? ` (${Math.round(decisionModel.confidencePercent)}%)`
    : "";

  const boardNote = buildWeeklyBoardSnippetPlainText({
    trustLine: fallbackActive
      ? `TRUST: FALLBACK SNAPSHOT · As of ${treasury.record_date}${treasury.fallback_reason ? ` · Reason: ${treasury.fallback_reason}` : ""}`
      : `TRUST: LIVE · As of ${treasury.record_date}`,
    postureLine: `POSTURE: ${postureLabel} · ${decisionModel?.confidenceLabel ?? "Score-based"} confidence${confidenceSuffix}`,
    changedLine: `CHANGED: ${decisionModel?.decisionShiftSummary ?? "Use the current weekly call as the operating baseline."}`,
    guardrailLine: `GUARDRAIL: ${guardrailLine}`,
    flipLine: `FLIP: ${flipLine}`,
    stabilityLine:
      "STABILITY: Act on posture changes after 2 consecutive weekly reads, unless the flip trigger fires at HIGH confidence.",
  });

  const callSnapshot = buildWeeklyCallSnapshotPlainText({
    regime: postureLabel,
    call:
      decisionModel?.canonicalDecisionCopy?.operatingCall
      ?? decisionModel?.operatingStanceLine
      ?? weeklyOperatorPayload.currentCall,
    trend: decisionModel?.trendLabel ?? "Current",
    confidence: decisionModel?.confidencePercent
      ? `${Math.round(decisionModel.confidencePercent)}% (${decisionModel?.confidenceLabel ?? "Score-based"})`
      : decisionModel?.confidenceLabel ?? "Score-based confidence",
    doNow:
      decisionModel?.canonicalDecisionCopy?.doNowLines[0]
      ?? decisionModel?.actionNow
      ?? weeklyOperatorPayload.actionNow,
    avoid: guardrailLine,
    watch: flipLine,
    flipConditions:
      decisionModel?.canonicalDecisionCopy?.flipConditions
      ?? decisionModel?.compactFlipConditionLabels
      ?? weeklyOperatorPayload.flipConditionLabels,
  });

  return {
    fallbackActive,
    weekEndingDate,
    weeklyOperatorPayload,
    briefing: buildSlackBrief(assessment, treasury, sensors, macroSeries, { modeledDecision: decisionModel }),
    weeklyOperatorPlainText: buildWeeklyOperatorBriefPlainText(weeklyOperatorPayload),
    weeklyOperatorSlackBlocks: buildWeeklyOperatorBriefSlackBlocks(weeklyOperatorPayload),
    weeklyOperatorCardText: buildWeeklyOperatorBriefCardText(weeklyOperatorPayload),
    stakeholderBriefs: buildStakeholderBriefs(weeklyOperatorPayload),
    citation: buildCallCitation(assessment, treasury, {
      postureWithStageLabel: decisionModel?.postureWithStageLabel,
      operatingStanceLine: decisionModel?.operatingStanceLine,
    }),
    /**
     * Jira and Linear both paste markdown, and the panel used to compute the
     * same string twice under two names. One value, two buttons.
     */
    markdownBrief: buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macroSeries, decisionModel, "markdown"),
    wikiBrief: buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macroSeries, decisionModel, "wiki"),
    slideBullets: buildBoardSlideBullets(assessment, treasury, macroSeries, { modeledDecision: decisionModel }),
    boardBrief: buildBoardBrief(assessment, treasury, sensors, macroSeries, { modeledDecision: decisionModel }),
    boardNote,
    callSnapshot,
    constraintHeadlines: buildConstraintHeadlines(assessment, treasury),
    agentPayload: buildAgentPayloadJson(assessment, treasury, sensors, macroSeries),
    agentPrompt: buildAgentPrompt(assessment, treasury),
  };
};

export type ExportBriefArtifacts = ReturnType<typeof buildExportBriefArtifacts>;
