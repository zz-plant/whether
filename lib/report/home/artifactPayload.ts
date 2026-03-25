import { buildBoardBrief, buildCallCitation } from "../../export/briefBuilders";
import {
  buildWeeklyBoardSnippetPlainText,
  buildWeeklyCallSnapshotPlainText,
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../../export/weeklyOperatorBrief";
import { buildCanonicalDecisionCopy } from "../canonicalDecisionCopy";
import { buildInterpretationLayer, type InterpretationView } from "../interpretationLayer";
import type { buildHomeBriefModel } from "../homeBriefModel";
import type { buildPostureState } from "../postureStateSource";
import type { ReportData } from "../reportData";
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
}: BuildArtifactPayloadArgs): Promise<ArtifactPayload | null> => {
  await Promise.resolve();

  try {
    const interpretationLayer = buildInterpretationLayer({
      view: interpretationView,
      homeBriefModel,
      assessment,
      forecast,
      decisionRules: homeBriefModel.decisionRules,
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
    const canonicalDecisionCopy = buildCanonicalDecisionCopy({
      homeBriefModel,
      postureState,
    });
    const weeklyOperatorBriefPayload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      date: weeklyRecordDate,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      confidenceLabel: homeBriefModel.confidenceLabel,
      actionStripItems: homeBriefModel.actionStripItems,
      flipConditionLabels: homeBriefModel.compactFlipConditionLabels,
      postureState,
      canonicalDecisionCopy,
    });

    return {
      boardSummary,
      boardSnippetText: buildWeeklyBoardSnippetPlainText({
        trustLine: treasury.fallback_at || treasury.fallback_reason
          ? `TRUST: FALLBACK SNAPSHOT · As of ${freshnessLabel}${treasury.fallback_reason ? ` · Reason: ${treasury.fallback_reason}` : ""}`
          : `TRUST: LIVE · As of ${freshnessLabel}`,
        postureLine: `POSTURE: ${canonicalDecisionCopy.currentRegimeLabel} · ${homeBriefModel.confidenceLabel} ${Math.round(homeBriefModel.confidencePercent)}% confidence`,
        changedLine: `CHANGED: ${homeBriefModel.decisionShiftSummary.replace(/^Changed:\s*/i, "").trim()}`,
        guardrailLine: `GUARDRAIL: ${homeBriefModel.executiveOperationalStance.avoid[0] ?? homeBriefModel.guardrail}`,
        flipLine: `FLIP: ${canonicalDecisionCopy.flipTrigger}`,
        stabilityLine: "STABILITY: Act on posture changes after 2 consecutive weekly reads, unless the flip trigger fires at HIGH confidence.",
      }),
      weeklyOperatorBriefText: buildWeeklyOperatorBriefPlainText(weeklyOperatorBriefPayload),
      weeklyCallSnapshotText: buildWeeklyCallSnapshotPlainText({
        regime: canonicalDecisionCopy.currentRegimeLabel,
        call: canonicalDecisionCopy.operatingCall,
        trend: homeBriefModel.trendLabel,
        confidence: `${Math.round(homeBriefModel.confidencePercent)}% (${homeBriefModel.confidenceLabel})`,
        doNow: canonicalDecisionCopy.doNowLines[0],
        avoid: homeBriefModel.executiveOperationalStance.avoid[0] ?? homeBriefModel.guardrail,
        watch: canonicalDecisionCopy.flipTrigger,
        flipConditions: canonicalDecisionCopy.flipConditions,
      }),
      callCitation: buildCallCitation(assessment, treasury, {
        interpretationLayer,
        postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      }),
    };
  } catch (error) {
    console.error("[home] leadership artifact export unavailable", error);
    return null;
  }
};
