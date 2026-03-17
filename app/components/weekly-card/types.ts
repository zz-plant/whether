import type { ReactNode } from "react";
import type { BoundedDecisionRule } from "../../../lib/report/boundedDecisionRules";
import type { DecisionMatrixPayload, WeeklyDecisionCardViewModel } from "../../../lib/report/homeBriefModel";
import type { ActionStripItem, RoleAwareOperatingTemplate } from "../../../lib/report/operatingCalls";
import type { ForecastRegimeLabel } from "../../../lib/report/forecastModel";
import type { ReportDynamics, ReportEvidenceItem } from "../../../lib/report/reportData";

export type WeeklyMovement = {
  score: number;
  direction: "defensive" | "expansionary" | "neutral";
  summary: string;
};

export type FailureModeWarningItem = { id: string; warning: string; mitigationCheck: string };

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
  failureModes: FailureModeWarningItem[];
  historicalTimeline: WeeklyDecisionCardViewModel["history"]["historicalTimeline"];
  sinceLastReview?: WeeklyDecisionCardViewModel["sinceLastReview"];
  renderBoundedRulesMatrix: (props: { decisionMatrix?: DecisionMatrixPayload; decisionRules: BoundedDecisionRule[] }) => ReactNode;
};
