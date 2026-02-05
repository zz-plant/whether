import type { RegimeAssessment } from "../../../lib/regimeEngine";
import {
  formatDecisionAction,
  type DecisionAction,
  type DecisionCategory,
  type DecisionOutput,
  type LifecycleStage,
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

export const formatOptionLabel = <T extends string>(
  value: T,
  options: { value: T; label: string }[]
) => options.find((option) => option.value === value)?.label ?? value;

export const buildShareText = (
  assessment: RegimeAssessment,
  lifecycle: LifecycleStage,
  category: DecisionCategory,
  action: DecisionAction,
  output: DecisionOutput
) => {
  const lines = [
    "Decision Shield — Whether Report",
    `Market climate: ${assessment.regime}`,
    `Lifecycle: ${formatOptionLabel(lifecycle, lifecycleOptions)}`,
    `Category: ${formatOptionLabel(category, categoryOptions)}`,
    `Action: ${formatDecisionAction(action)}`,
    `Verdict: ${output.verdict}`,
    "",
    `Summary: ${output.summary}`,
    "",
    "Signals:",
    ...output.bullets.map((bullet) => `- ${bullet}`),
    "",
    `Guardrail: ${output.guardrail}`,
    `Reversal trigger: ${output.reversalTrigger}`,
  ];

  return lines.join("\n");
};

export const parseParam = <T extends string>(
  value: string | null,
  options: { value: T; label: string }[]
): T | null => options.find((option) => option.value === value)?.value ?? null;
