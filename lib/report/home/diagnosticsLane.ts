import type { buildHomeBriefModel, buildWeeklyDecisionCardViewModel } from "../homeBriefModel";
import type { ReportData } from "../reportData";
import type { HomePageDiagnosticsLane } from "./contracts";

export const buildDiagnosticsLanePayload = ({
  homeBriefModel,
  weeklyDecisionCardModel,
  statusLabel,
  reportDynamics,
}: {
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  statusLabel: string;
  reportDynamics: ReportData["reportDynamics"];
}): HomePageDiagnosticsLane => ({
  weeklyMemoLines: homeBriefModel.weeklyMemoLines,
  immediateDecision: weeklyDecisionCardModel.decision.immediateDecision,
  revisitDecisions: homeBriefModel.revisitDecisions,
  guardrail: homeBriefModel.guardrail,
  regimeDistance: homeBriefModel.regimeDistance,
  postureWithStageLabel: homeBriefModel.postureWithStageLabel,
  statusLabel,
  trendLabel: homeBriefModel.trendLabel,
  confidencePercent: homeBriefModel.confidencePercent,
  decisionMatrix: homeBriefModel.decisionMatrix,
  decisionRules: homeBriefModel.decisionRules,
  roleAwareTemplates: homeBriefModel.roleAwareTemplates,
  evidenceItems: homeBriefModel.evidenceItems,
  reportDynamics,
  weeklyMovement: homeBriefModel.weeklyMovement,
  transitionProbabilities: homeBriefModel.transitionProbabilities,
  failureModes: homeBriefModel.failureModes,
  historicalTimeline: homeBriefModel.historicalTimeline,
});
