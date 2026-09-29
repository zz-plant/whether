import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import {
  formatDecisionAction,
  type DecisionAction,
  type DecisionCategory,
  type DecisionOutput,
  type LifecycleStage,
  type PlanStressTestResult,
  type PlanComparisonResult,
} from "../../../lib/decisionShield";

export const lifecycleOptions: { value: LifecycleStage; label: string }[] = [
  { value: "DISCOVERY", label: "Discovery" },
  { value: "GROWTH", label: "Growth" },
  { value: "SCALE", label: "Scale" },
  { value: "MATURE", label: "Mature" },
];

export const categoryOptions: { value: DecisionCategory; label: string }[] = [
  { value: "HIRING", label: "Hiring" },
  { value: "ROADMAP", label: "Roadmap" },
  { value: "PRICING", label: "Pricing" },
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "M_AND_A", label: "M&A" },
  { value: "GEOGRAPHIC_EXPANSION", label: "Geographic expansion" },
  { value: "RESTRUCTURING", label: "Restructuring" },
];

export const actionOptions: { value: DecisionAction; label: string }[] = [
  { value: "HIRE", label: "Hire" },
  { value: "REWRITE", label: "Rewrite" },
  { value: "LAUNCH", label: "Launch" },
  { value: "DISCOUNT", label: "Discount" },
  { value: "EXPAND", label: "Expand" },
  { value: "ACQUIRE", label: "Acquire" },
  { value: "DIVEST", label: "Divest" },
  { value: "INFRA_SPEND", label: "Infra spend" },
  { value: "REGIONAL_EXPANSION", label: "Regional expansion" },
  { value: "RESTRUCTURE", label: "Restructure" },
];

export const verdictStyles: Record<DecisionOutput["verdict"], string> = {
  SAFE: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  RISKY: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  DANGEROUS: "border-rose-400/40 bg-rose-500/10 text-rose-200",
};

/* The note beside the pause line explains a hiring pause, which only makes
   sense for a move that adds headcount or fixed cost. It used to render for
   every action, Divest and Restructure included. */
const HIRING_PAUSE_ACTIONS: ReadonlySet<DecisionAction> = new Set<DecisionAction>([
  "HIRE",
  "REWRITE",
  "LAUNCH",
  "EXPAND",
  "ACQUIRE",
  "INFRA_SPEND",
  "REGIONAL_EXPANSION",
]);

export const hiringPauseApplies = (action: DecisionAction): boolean => HIRING_PAUSE_ACTIONS.has(action);

export const formatOptionLabel = <T extends string>(
  value: T,
  options: { value: T; label: string }[]
) => options.find((option) => option.value === value)?.label ?? value;


type BuildShareTextOptions = {
  planMode?: "dropdown" | "natural_language" | "compare";
  planText?: string;
  planBText?: string;
  stressTestResult?: PlanStressTestResult;
  comparisonResult?: PlanComparisonResult;
  businessModel?: "VC_BACKED" | "BOOTSTRAPPED";
  grossMarginPct?: number;
};

export const buildShareText = (
  assessment: RegimeAssessment,
  lifecycle: LifecycleStage,
  category: DecisionCategory,
  action: DecisionAction,
  output: DecisionOutput,
  options?: BuildShareTextOptions
) => {
  if (options?.planMode === "natural_language" && options.planText?.trim() && options.stressTestResult) {
    const res = options.stressTestResult;
    const modelLine = options.businessModel === "BOOTSTRAPPED"
      ? `Model: Bootstrapped${options.grossMarginPct !== undefined ? ` (${options.grossMarginPct}% gross margin)` : ""}`
      : "Model: VC-Backed";

    const lines = [
      "Decision Shield — Plan Stress Test",
      `This week's conditions: ${getRegimePublicLabel(assessment.regime)}`,
      modelLine,
      `Lifecycle: ${formatOptionLabel(lifecycle, lifecycleOptions)}`,
      "",
      `Plan: "${options.planText.trim()}"`,
      `Decision verdict: ${res.verdict}`,
      `Summary: ${res.headline}`,
      ...(res.sizingNote ? ["", `Sizing: ${res.sizingNote}`] : []),
      ...(res.fragileAssumptions.length > 0
        ? ["", "What this plan assumes:", ...res.fragileAssumptions.map((a) => `- ${a}`)]
        : []),
      "",
      `${publicDecisionLabels.threshold}: ${res.boundedGuardrail}`,
      ...(res.reversibleAlternative ? [`A more reversible version: ${res.reversibleAlternative}`] : []),
      `${publicDecisionLabels.reversal}: ${res.reversalTrigger}`,
    ];

    return lines.join("\n");
  }

  if (options?.planMode === "compare" && options.planText?.trim() && options.planBText?.trim() && options.comparisonResult) {
    const cmp = options.comparisonResult;
    const lines = [
      "Decision Shield — Plan Comparison",
      `This week's conditions: ${getRegimePublicLabel(assessment.regime)}`,
      `Recommendation: ${cmp.comparativeRecommendation}`,
      "",
      `Plan A: "${options.planText.trim()}"`,
      `- Decision verdict: ${cmp.planA.verdict}`,
      `- ${publicDecisionLabels.threshold}: ${cmp.planA.boundedGuardrail}`,
      "",
      `Plan B: "${options.planBText.trim()}"`,
      `- Decision verdict: ${cmp.planB.verdict}`,
      `- ${publicDecisionLabels.threshold}: ${cmp.planB.boundedGuardrail}`,
    ];

    return lines.join("\n");
  }

  const lines = [
    "Decision Shield — Whether Weekly Brief",
    `This week's conditions: ${getRegimePublicLabel(assessment.regime)}`,
    `Lifecycle: ${formatOptionLabel(lifecycle, lifecycleOptions)}`,
    `Category: ${formatOptionLabel(category, categoryOptions)}`,
    `Action: ${formatDecisionAction(action)}`,
    `Decision verdict: ${output.verdict}`,
    "",
    `Summary: ${output.summary}`,
    "",
    "Evidence:",
    ...output.bullets.map((bullet) => `- ${bullet}`),
    "",
    `${publicDecisionLabels.threshold}: ${output.guardrail}`,
    `${publicDecisionLabels.reversal}: ${output.reversalTrigger}`,
  ];

  return lines.join("\n");
};

export const parseParam = <T extends string>(
  value: string | null,
  options: { value: T; label: string }[]
): T | null => options.find((option) => option.value === value)?.value ?? null;
