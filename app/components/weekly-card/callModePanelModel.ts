import type { ReactNode } from "react";
import type { DecisionReadinessState } from "../../../lib/report/trustStatus";
import type { ConfidenceTrendFraming, WeeklyConfidencePoint } from "../../../lib/report/reportData";
import type { RevisitQueueItem, StartupVariantPolicy } from "../../../lib/report/homeBriefModel";

export type PolicyDetails = {
  summary: string;
  chips: string[];
};

export type CallModePanelModel = {
  startupVariantPolicy: StartupVariantPolicy;
  operatingCall: string;
  actionNow: string;
  snapshotGuardrail: string;
  snapshotWatch: string;
  revisitDecisions: boolean;
  revisitQueue: RevisitQueueItem[];
  decisionReadiness: DecisionReadinessState;
  effectiveFlipLabels: string[];
  compactInsetClassName: string;
  tierOnePanelClassName: string;
  sectionSpacingClassName: string;
  tierOneHeadingClassName: string;
  whyItMattersLine?: string;
  needsTrustWarning: boolean;
  trustStateDetail: string;
  trustReason?: string;
  inlineTrustLabel: string;
  inlineTrustTone: "stable" | "warning" | "historical";
  comparisonSummary: string;
  postureSteps: Array<{ label: string; posture: string; detail: string; isCurrent: boolean }>;
  trajectoryDeltaSummary?: string;
  stabilityRule: string;
  weeklyLeadershipSummary: {
    boldnessScore: number;
    boldnessDelta: number;
    notchShiftLabel: string;
    shorthandLine: string;
    hiringWindow: string;
    expansionWindow: string;
    raiseWindow: string;
    netDeltaLabel: string;
  };
  decisionBullets: Array<{ label: string; detail: string }>;
  driverHighlights: Array<{
    label: string;
    weightLabel: string;
    weightPercent: number | null;
    deltaLabel: string;
    implication: string;
    postureDirection: "tightening" | "opening" | "flat";
    postureDirectionLabel: string;
  }>;
  guardrailPolicyDetails: PolicyDetails;
  flipPolicyDetails: PolicyDetails;
  glossaryHref?: string;
  citationMetaLine: string;
  citation: string;
  actions?: ReactNode;
  confidenceHistory: WeeklyConfidencePoint[];
  confidenceTrend?: ConfidenceTrendFraming;
  confidencePercent: number;
};

const compactChangedThisWeekDetail = (detail: string) => {
  const lead = detail.split(/\b(?:Do now|Action|Flip):/i)[0]?.trim();
  return lead && lead.length > 0 ? lead : detail;
};

const formatBackdropValue = (
  value: string,
  kind: "hiring" | "expansion" | "raise",
) => {
  if (kind === "raise") {
    if (value === "Improving") {
      return "Opening";
    }
    if (value === "Stable") {
      return "Steady";
    }
    return value;
  }

  if (value === "Strong") {
    return "Supportive";
  }
  if (value === "Constrained") {
    return "Tight";
  }
  return value;
};

export const buildCallModePanelViewModel = (model: CallModePanelModel) => {
  const selectedModeLabel = model.startupVariantPolicy.options.find((option) => option.mode === model.startupVariantPolicy.selectedMode)?.label ?? "Default";
  const detailDisclosureBase = "mt-2 rounded-md bg-slate-950/40 px-3 py-2.5";
  const flipSupport = model.effectiveFlipLabels
    .filter((label) => label.trim().length > 0 && label.trim() !== model.snapshotWatch.trim())
    .slice(0, 2);
  const changedThisWeekDetail = compactChangedThisWeekDetail(
    model.decisionBullets.find((item) => item.label === "What changed")?.detail ?? "No material weekly delta.",
  );
  const recommendationLine = model.decisionBullets.find((item) => item.label === "What that changes")?.detail ?? model.operatingCall;
  const revisitLabel = model.revisitDecisions ? "Yes. Last week's decisions need another look." : "No. This week's plan can stay on track.";
  const revisitDetail = model.revisitDecisions
    ? "Revisit last week's approvals before adding fixed cost."
    : "";
  const shouldShowReadinessCallout = model.needsTrustWarning || model.inlineTrustTone !== "stable" || Boolean(model.trustReason);
  const trustStatusSummary = model.trustReason
    ? `Using the last clean snapshot because ${model.trustReason}`
    : model.trustStateDetail;
  const compactMetricCardBase = "rounded-md bg-slate-950/25 px-3 py-3 tabular-nums";
  const primaryDriver = model.driverHighlights[0] ?? null;
  const supportingDrivers = primaryDriver ? model.driverHighlights.slice(1, 3) : model.driverHighlights.slice(0, 2);
  const featuredRevisitItem = model.revisitDecisions ? model.revisitQueue[0] ?? null : null;
  const deferredRevisitItems = model.revisitDecisions ? model.revisitQueue.slice(1) : [];
  const hasSecondaryLane = model.revisitDecisions || flipSupport.length > 0;
  const boldnessDeltaLabel = model.weeklyLeadershipSummary.boldnessDelta > 0
    ? `+${model.weeklyLeadershipSummary.boldnessDelta}`
    : `${model.weeklyLeadershipSummary.boldnessDelta}`;
  const postureSummaryCards = [
    {
      label: "Boldness budget",
      value: `${model.weeklyLeadershipSummary.boldnessScore} / 100`,
      detail: model.weeklyLeadershipSummary.boldnessDelta === 0
        ? "No change vs last week"
        : `${boldnessDeltaLabel} vs last week`,
      className: `${compactMetricCardBase} border-slate-700/80 bg-slate-900/65`,
    },
    {
      label: "Hiring market",
      value: formatBackdropValue(model.weeklyLeadershipSummary.hiringWindow, "hiring"),
      detail: "U.S. labor backdrop",
      className: compactMetricCardBase,
    },
    {
      label: "Expansion market",
      value: formatBackdropValue(model.weeklyLeadershipSummary.expansionWindow, "expansion"),
      detail: "U.S. demand backdrop",
      className: compactMetricCardBase,
    },
    {
      label: "Funding market",
      value: formatBackdropValue(model.weeklyLeadershipSummary.raiseWindow, "raise"),
      detail: "U.S. funding backdrop",
      className: compactMetricCardBase,
    },
  ] as const;
  const trustChipClass =
    model.inlineTrustTone === "warning"
      ? "weather-chip-amber"
      : model.inlineTrustTone === "historical"
        ? "weather-chip-violet"
        : "weather-chip-slate";
  const showModeChip = selectedModeLabel !== "Default";

  return {
    ...model,
    selectedModeLabel,
    detailDisclosureBase,
    flipSupport,
    changedThisWeekDetail,
    recommendationLine,
    revisitLabel,
    revisitDetail,
    shouldShowReadinessCallout,
    trustStatusSummary,
    primaryDriver,
    supportingDrivers,
    featuredRevisitItem,
    deferredRevisitItems,
    hasSecondaryLane,
    postureSummaryCards,
    trustChipClass,
    showModeChip,
  };
};

export type CallModePanelViewModel = ReturnType<typeof buildCallModePanelViewModel>;
