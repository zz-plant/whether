import type { BoundedDecisionRule } from "../../../lib/report/boundedDecisionRules";
import type { DecisionMatrixPayload, WeeklyDecisionCardViewModel } from "../../../lib/report/homeBriefModel";
import type { ActionStripItem, RoleAwareOperatingTemplate } from "../../../lib/report/operatingCalls";
import type { ForecastRegimeLabel } from "../../../lib/report/forecastModel";
import type { ReportDynamics, ReportEvidenceItem } from "../../../lib/report/reportData";

export type WeeklyMovement = {
  score: number;
  direction: "tightening" | "easing" | "stable";
  summary: string;
};

export type TrustWarningItem = { id: string; warning: string; mitigationCheck: string };

// Legacy top-fold section contract kept for DecisionCallHeader tests.
export type DecisionHeroSectionProps = {
  [key: string]: unknown;
  statusLabel: string;
  postureLabel?: string;
  stageLabel?: string;
  postureWithStageLabel?: string;
  immediateDecision: string;
  operatingStanceLine: string;
  confidencePercent: number;
  confidenceLabel: WeeklyDecisionCardViewModel["status"]["confidenceLabel"];
  trendLabel: WeeklyDecisionCardViewModel["status"]["trendLabel"];
  transitionWatch: WeeklyDecisionCardViewModel["status"]["transitionWatch"];
  regimeDistance: WeeklyDecisionCardViewModel["diagnostics"]["regimeDistance"];
  fetchedAtLabel?: string;
  freshnessLine?: string;
  weeklyMovement?: WeeklyDecisionCardViewModel["decision"]["weeklyMovement"];
  regimeSignalIndicators?: WeeklyDecisionCardViewModel["diagnostics"]["regimeSignalIndicators"];
  sinceLastReview?: WeeklyDecisionCardViewModel["sinceLastReview"];
  whyItMattersLine?: string;
  readThisCardItems?: Array<{ label: string; detail: string }>;
  glossaryHref?: string;
};

export type ActionStripSectionProps = { items: ActionStripItem[] };

export type HistorySectionProps = {
  historicalTimeline: WeeklyDecisionCardViewModel["history"]["historicalTimeline"];
  title?: string;
  subtitle?: string;
};

export type DiagnosticsSectionProps = {
  weeklyMemoLines: string[];
  immediateDecision: string;
  revisitDecisions: boolean;
  guardrail: string;
  regimeDistance: WeeklyDecisionCardViewModel["diagnostics"]["regimeDistance"];
  postureWithStageLabel?: string;
  statusLabel: string;
  trendLabel: string;
  confidencePercent: number;
  decisionMatrix?: DecisionMatrixPayload;
  decisionRules: BoundedDecisionRule[];
  roleAwareTemplates: RoleAwareOperatingTemplate[];
  evidenceItems: ReportEvidenceItem[];
  reportDynamics: ReportDynamics;
  weeklyMovement: WeeklyMovement;
  transitionProbabilities: Record<ForecastRegimeLabel, number>;
  failureModes: TrustWarningItem[];
  sinceLastReview?: WeeklyDecisionCardViewModel["sinceLastReview"];
};
