import type { BoundedDecisionRule } from "./boundedDecisionRules";
import type { ReportDynamics } from "./reportData";

export type ReportSignalDirection = "tightening" | "easing" | "unchanged";
export type DecisionRiskLabel = "Low" | "Controlled" | "High";

/**
 * Canonical operator-facing signal names. These match the glossary in
 * `lib/report/reportCopy.ts` — do not introduce a fourth spelling of the same
 * four signals.
 */
export const deltaLabelBySignal: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Funding pressure",
  riskAppetite: "Risk appetite",
  baseRate: "Fed interest rate",
  curveSlope: "Recession warning gauge",
};

export const signalOrder: Array<ReportDynamics["changedSignals"][number]["key"]> = [
  "tightness",
  "riskAppetite",
  "baseRate",
  "curveSlope",
];

export const resolveSignalDirection = (delta: number): ReportSignalDirection =>
  delta > 0 ? "tightening" : delta < 0 ? "easing" : "unchanged";

export const normalizeMeterToPercent = (value: number, max: number) => {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.abs(value) / max) * 100)));
};

export const movementMeterToneByDirection: Record<ReportSignalDirection, string> = {
  tightening: "bg-amber-300/80",
  easing: "bg-emerald-300/80",
  unchanged: "bg-slate-500/80",
};


export const TOP_FOLD_DECISION_PRIORITY_COPY =
  "Lead with action, guardrail, and flip condition; treat scores as context for continuity.";

export const STARTUP_INDEX_CONTEXT_LABEL = "Context metric: Startup Climate Index";

export const signalDeltaToneByDirection: Record<ReportSignalDirection, string> = {
  tightening: "border-semantic-tightening-border/70 bg-semantic-tightening-bg/70 text-semantic-tightening-fg",
  easing: "border-semantic-easing-border/70 bg-semantic-easing-bg/70 text-semantic-easing-fg",
  unchanged: "border-semantic-unchanged-border/70 bg-semantic-unchanged-bg/70 text-semantic-unchanged-fg",
};

export const riskMeterByLabel: Record<DecisionRiskLabel, number> = {
  Low: 28,
  Controlled: 55,
  High: 82,
};

export const riskColorByLabel: Record<DecisionRiskLabel, string> = {
  Low: "text-emerald-200",
  Controlled: "text-amber-200",
  High: "text-rose-200",
};

export const decisionRiskLabel = (rule: BoundedDecisionRule): DecisionRiskLabel => {
  const recommendation = rule.recommendation.toLowerCase();
  if (
    recommendation.includes("hold") ||
    recommendation.includes("backfills") ||
    recommendation.includes("mission-critical")
  ) {
    return "High";
  }
  if (
    recommendation.includes("selective") ||
    recommendation.includes("gated") ||
    recommendation.includes("staged")
  ) {
    return "Controlled";
  }
  return "Low";
};

const postureOrder = ["Expansion", "Mixed", "Scarcity", "Defensive"] as const;

export const postureDisplayLabel = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("defensive")) return "Defensive";
  if (normalized.includes("scarcity")) return "Scarcity";
  if (normalized.includes("mixed") || normalized.includes("balanced")) return "Mixed";
  return "Expansion";
};

export const timelinePosturePercent = (postureLabel: string) => {
  const level = postureOrder.indexOf(postureDisplayLabel(postureLabel)) + 1;
  return Math.round((level / postureOrder.length) * 100);
};
