import { buildBoardBrief, buildCallCitation } from "../../export/briefBuilders";
import {
  buildWeeklyBoardSnippetPlainText,
  buildWeeklyCallSnapshotPlainText,
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../../export/weeklyOperatorBrief";
import { buildCanonicalDecisionCopy } from "../canonicalDecisionCopy";
import { DECISION_CONTRACT_LABELS, OPERATING_LATITUDE_GLOSS, OPERATING_LATITUDE_LABEL } from "../reportCopy";
import { formatDecisionReversal } from "../reportFormatting";
import { resolveDataStatusGuidance } from "../trustStatus";
import { describeConditions, formatExportConfidence, pauseConditionOnly } from "../../export/exportTerms";
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
    ? homeBriefModel.revisitQueue.map(
        (item) => `- ${item.label}: ${item.action}. ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${formatDecisionReversal(item.flipCondition)}.`,
      )
    : [`- Keep this week's rules until next week's reading moves.`];

  return [
    "DELTA-ONLY BRIEF",
    `Readiness: ${homeBriefModel.decisionReadiness.label}`,
    `Changed: ${homeBriefModel.decisionShiftHeadline}`,
    "",
    "Revisit now",
    ...revisitLines,
    "",
    `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${homeBriefModel.guardrail}`,
    `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${canonicalDecisionCopy.flipTrigger}`,
    `Data: ${homeBriefModel.decisionReadiness.detail}`,
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

    /*
     * The board note is read cold, by people who have never opened the page,
     * so every slot carries its meaning on its own line and uses the page's
     * names. It used to open "TRUST: FALLBACK SNAPSHOT" and "BOLDNESS BUDGET",
     * print confidence as a percent, and label the call-change line "FLIP:".
     * `weeklyCall.callChangesIf` is the line where the call itself changes
     * (the lead rule's resume line is a separate, lower one), so it is printed
     * under that name; the resume line comes from the lead rule when it has one,
     * followed by the stage's `resumeWhen` when a stage is chosen.
     */
    const isSavedCopy = Boolean(treasury.fallback_at || treasury.fallback_reason);
    const latitude = homeBriefModel.weeklyLeadershipSummary;
    const latitudeDelta = latitude.boldnessDelta === 0
      ? "no change"
      : `${latitude.boldnessDelta > 0 ? "+" : ""}${latitude.boldnessDelta} ${Math.abs(latitude.boldnessDelta) === 1 ? "point" : "points"}`;
    const leadResume = homeBriefModel.actionStripItems?.[0]?.reversalCondition;
    const resumeConditions = [
      ...(leadResume ? [formatDecisionReversal(leadResume)] : []),
      ...(weeklyCall.resumeWhen ? [weeklyCall.resumeWhen] : []),
    ];
    const boardSnippetText = buildWeeklyBoardSnippetPlainText({
      dataLine: isSavedCopy
        ? `DATA: Saved copy from ${freshnessLabel}. ${resolveDataStatusGuidance({ isFallbackSnapshot: true })}`
        : `DATA: Live, as of ${freshnessLabel}`,
      latitudeLine: `${OPERATING_LATITUDE_LABEL.toUpperCase()}: ${latitude.boldnessScore}/100 (${OPERATING_LATITUDE_GLOSS}) · vs last week: ${latitudeDelta}`,
      conditionsLine: `CONDITIONS: ${describeConditions(assessment.regime, canonicalDecisionCopy.currentRegimeLabel)} · ${formatExportConfidence(homeBriefModel.confidenceLabel)}`,
      changedLine: `CHANGED: ${homeBriefModel.decisionShiftHeadline}`,
      pauseLine: `${DECISION_CONTRACT_LABELS.threshold.pauseIf.toUpperCase()}: ${pauseConditionOnly(weeklyCall.pauseIf)}`,
      // The lead area's resume level, then the stage's discipline when one is
      // chosen: both say when a hold lifts, so they share the one resume line.
      resumeLine: resumeConditions.length > 0
        ? `${DECISION_CONTRACT_LABELS.reversal.resumeWhen.toUpperCase()}: ${resumeConditions.join("; ")}`
        : undefined,
      callChangeLine: `${DECISION_CONTRACT_LABELS.watch.postureFlips.toUpperCase()}: ${weeklyCall.callChangesIf}`,
      stabilityLine: "WHEN CONDITIONS CHANGE: wait for two weekly readings that agree before acting, unless the change comes with high confidence.",
    });
    const weeklyOperatorBriefText = buildWeeklyOperatorBriefPlainText(weeklyOperatorBriefPayload);
    const weeklyCallSnapshotText = buildWeeklyCallSnapshotPlainText({
      regime: canonicalDecisionCopy.currentRegimeLabel,
      call: canonicalDecisionCopy.operatingCall,
      trend: homeBriefModel.trendLabel,
      confidence: formatExportConfidence(homeBriefModel.confidenceLabel),
      doNow: weeklyCall.actionNow,
      avoid: weeklyCall.pauseIf,
      watch: weeklyCall.callChangesIf,
      ...(weeklyCall.resumeWhen ? { resume: weeklyCall.resumeWhen } : {}),
      flipConditions: weeklyCall.flipConditionLabels,
    });

    const meetingPackText = [
      "BOARD NOTE",
      boardSnippetText,
      "",
      "Guidance snapshot",
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
