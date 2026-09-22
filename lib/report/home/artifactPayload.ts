import { buildBoardBrief, buildCallCitation } from "../../export/briefBuilders";
import {
  buildWeeklyBoardSnippetPlainText,
  buildWeeklyCallSnapshotPlainText,
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../../export/weeklyOperatorBrief";
import { buildCanonicalDecisionCopy } from "../canonicalDecisionCopy";
import { DECISION_CONTRACT_LABELS } from "../reportCopy";
import { buildInterpretationLayer, type InterpretationView } from "../interpretationLayer";
import type { buildHomeBriefModel } from "../homeBriefModel";
import type { buildPostureState } from "../postureStateSource";
import type { ReportData } from "../reportData";
import { buildWeeklyCallContract, type WeeklyCallContract } from "../weeklyCallContract";
import type { ArtifactPayload } from "./contracts";

type BuildArtifactPayloadArgs = {
  assessment: ReportData["assessment"];
  treasury: ReportData["treasury"];
  weeklyRecordDate: ReportData["weeklyRecordDate"];
  sensors: ReportData["sensors"];
  macroSeries: ReportData["macroSeries"];
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  postureState: Awaited<ReturnType<typeof buildPostureState>>;
  interpretationView: InterpretationView;
  forecast: ReportData["forecast"];
  freshnessLabel: string;
  weeklyCall?: WeeklyCallContract;
};

type WeeklyOperatorBriefCopyInput = Parameters<typeof buildWeeklyOperatorBriefPayload>[0];

const buildWeeklyOperatorBriefCopyPayload = (input: WeeklyOperatorBriefCopyInput) =>
  buildWeeklyOperatorBriefPayload(input);

export const buildWeeklyOperatorBriefCopyText = (input: WeeklyOperatorBriefCopyInput) =>
  buildWeeklyOperatorBriefPlainText(buildWeeklyOperatorBriefCopyPayload(input));

const buildDeltaOnlyBriefText = ({
  freshnessLabel,
  homeBriefModel,
  canonicalDecisionCopy,
  citation,
}: {
  freshnessLabel: string;
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  canonicalDecisionCopy: ReturnType<typeof buildCanonicalDecisionCopy>;
  citation: string;
}) => {
  const revisitLines = homeBriefModel.revisitQueue.length > 0
    ? homeBriefModel.revisitQueue.map((item) => `- ${item.label}: ${item.action}. Flip back in if ${item.flipCondition}.`)
    : [`- Keep this week's rules until next week's reading moves.`];

  return [
    "DELTA-ONLY BRIEF",
    `Readiness: ${homeBriefModel.decisionReadiness.label}`,
    `Changed: ${homeBriefModel.decisionShiftSummary.replace(/^Changed:\s*/i, "").trim()}`,
    "",
    "Revisit now",
    ...revisitLines,
    "",
    `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${homeBriefModel.guardrail}`,
    `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${canonicalDecisionCopy.flipTrigger}`,
    `Trust: ${homeBriefModel.decisionReadiness.detail}`,
    `Data refreshed: ${freshnessLabel}`,
    "",
    "Citation",
    citation,
  ].join("\n");
};

export const buildLeadershipArtifactPayload = async ({
  assessment,
  treasury,
  weeklyRecordDate,
  sensors,
  macroSeries,
  homeBriefModel,
  postureState,
  interpretationView,
  forecast,
  freshnessLabel,
  weeklyCall: providedWeeklyCall,
}: BuildArtifactPayloadArgs): Promise<ArtifactPayload | null> => {
  await Promise.resolve();

  try {
    const interpretationLayer = buildInterpretationLayer({
      view: interpretationView,
      homeBriefModel,
      assessment,
      forecast,
      decisionRules: homeBriefModel.decisionRules,
      isFallback: Boolean(treasury?.fallback_at || treasury?.fallback_reason),
    });
    const exportLayerOptions = {
      interpretationLayer,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      operatingStanceLine: homeBriefModel.operatingStanceLine,
      trendLabel: homeBriefModel.trendLabel,
      transitionWatch: homeBriefModel.transitionWatch,
      regimeDistancePoints: homeBriefModel.regimeDistance.pointsToFlip,
      historicalAnalogs: homeBriefModel.historicalAnalogs,
      failureModes: homeBriefModel.failureModes,
      actionStripItems: homeBriefModel.actionStripItems,
      confidenceLabel: homeBriefModel.confidenceLabel,
      freshnessLabel,
      postureState,
    };
    const boardSummary = buildBoardBrief(assessment, treasury, sensors, macroSeries, exportLayerOptions);
    const weeklyCall = providedWeeklyCall ?? buildWeeklyCallContract({
      assessment,
      homeBriefModel,
    });
    const canonicalDecisionCopy = buildCanonicalDecisionCopy({
      homeBriefModel,
      postureState,
      weeklyCall,
    });
    const weeklyOperatorBriefPayload = buildWeeklyOperatorBriefCopyPayload({
      assessment,
      treasury,
      date: weeklyRecordDate,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      confidenceLabel: homeBriefModel.confidenceLabel,
      actionStripItems: homeBriefModel.actionStripItems,
      flipConditionLabels: homeBriefModel.compactFlipConditionLabels,
      postureState,
      canonicalDecisionCopy,
      weeklyCall,
      weeklyLeadershipSummary: homeBriefModel.weeklyLeadershipSummary,
    });
    const callCitation = buildCallCitation(assessment, treasury, {
      interpretationLayer,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
    });

    const boardSnippetText = buildWeeklyBoardSnippetPlainText({
      trustLine: treasury.fallback_at || treasury.fallback_reason
        ? `TRUST: FALLBACK SNAPSHOT · As of ${freshnessLabel}${treasury.fallback_reason ? ` · Reason: ${treasury.fallback_reason}` : ""}`
        : `TRUST: LIVE · As of ${freshnessLabel}`,
      postureLine: `BOLDNESS BUDGET: ${homeBriefModel.weeklyLeadershipSummary.boldnessScore}/100 (${homeBriefModel.weeklyLeadershipSummary.boldnessDelta === 0 ? "no change vs last week" : `${homeBriefModel.weeklyLeadershipSummary.boldnessDelta > 0 ? "+" : ""}${homeBriefModel.weeklyLeadershipSummary.boldnessDelta} vs last week`}) · POSTURE: ${canonicalDecisionCopy.currentRegimeLabel} · ${homeBriefModel.confidenceLabel} ${Math.round(homeBriefModel.confidencePercent)}% confidence`,
      changedLine: `CHANGED: ${homeBriefModel.decisionShiftSummary.replace(/^Changed:\s*/i, "").trim()}`,
      guardrailLine: `GUARDRAIL: ${weeklyCall.pauseIf}`,
      flipLine: `FLIP: ${weeklyCall.changeCourseIf}`,
      stabilityLine: "STABILITY: Act on a change in the call only after two weekly readings agree, unless it fires at HIGH confidence.",
    });
    const weeklyOperatorBriefText = buildWeeklyOperatorBriefPlainText(weeklyOperatorBriefPayload);
    const weeklyCallSnapshotText = buildWeeklyCallSnapshotPlainText({
      regime: canonicalDecisionCopy.currentRegimeLabel,
      call: canonicalDecisionCopy.operatingCall,
      trend: homeBriefModel.trendLabel,
      confidence: `${Math.round(homeBriefModel.confidencePercent)}% (${homeBriefModel.confidenceLabel})`,
      doNow: weeklyCall.actionNow,
      avoid: weeklyCall.pauseIf,
      watch: weeklyCall.changeCourseIf,
      flipConditions: weeklyCall.flipConditionLabels,
    });

    const meetingPackText = [
      "BOARD NOTE",
      boardSnippetText,
      "",
      "Call snapshot",
      weeklyCallSnapshotText,
      "",
      "WEEKLY BRIEF",
      weeklyOperatorBriefText,
      "",
      "BOARD SUMMARY",
      boardSummary,
      "",
      "CITATION",
      callCitation,
    ].join("\n");

    return {
      boardSummary,
      boardSnippetText,
      weeklyOperatorBriefText,
      weeklyCallSnapshotText,
      deltaOnlyBriefText: buildDeltaOnlyBriefText({
        freshnessLabel,
        homeBriefModel,
        canonicalDecisionCopy,
        citation: callCitation,
      }),
      callCitation,
      meetingPackText,
    };
  } catch (error) {
    console.error("[home] leadership artifact export unavailable", error);
    return null;
  }
};
