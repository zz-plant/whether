import { buildWeeklyLockCommitment } from "../decisionKnobs";
import {
  extractCompactClause,
  formatBoundedDecisionAction,
  formatBoundedDecisionReverse,
  formatBoundedDecisionThreshold,
  type BoundedDecisionRule,
} from "../boundedDecisionRules";
import type { DecisionMatrixPayload, DecisionMatrixRow, DecisionMatrixRowKey, Regime } from "../homeBriefModel";

const compactMatrixText = (value: string, fallback: string) => extractCompactClause(value, fallback);

const joinFlipConditions = (conditions: string[]) => {
  if (conditions.length === 0) return "";
  if (conditions.length === 1) return conditions[0] ?? "";
  if (conditions.length === 2) return `${conditions[0]} and ${conditions[1]}`;

  return `${conditions.slice(0, -1).join(", ")}, and ${conditions[conditions.length - 1]}`;
};

const matrixRowConfig: Array<{ key: DecisionMatrixRowKey; label: string; area: BoundedDecisionRule["area"]; flipConditionIndex: number }> = [
  { key: "hiring", label: "Hiring", area: "hiring", flipConditionIndex: 0 },
  { key: "product", label: "Product", area: "product-tempo", flipConditionIndex: 1 },
  { key: "capital", label: "Capital", area: "capital-raising", flipConditionIndex: 1 },
  { key: "burn", label: "Burn", area: "burn-discipline", flipConditionIndex: 2 },
];

export const buildDecisionMatrixPayload = ({
  regime,
  thresholds,
  decisionRules,
  confidenceDegraded,
  freshnessDegraded,
}: {
  regime: Regime;
  thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
  decisionRules: BoundedDecisionRule[];
  confidenceDegraded: boolean;
  freshnessDegraded: boolean;
}): DecisionMatrixPayload => {
  const rulesByArea = new Map(decisionRules.map((rule) => [rule.area, rule]));
  const lockCommitment = buildWeeklyLockCommitment({
    regime,
    tightnessRegime: thresholds.tightnessRegime,
    riskAppetiteRegime: thresholds.riskAppetiteRegime,
    confidenceDegraded,
    freshnessDegraded,
  });

  const rows: DecisionMatrixRow[] = matrixRowConfig.map(({ key, label, area, flipConditionIndex }) => {
    const rule = rulesByArea.get(area);
    const fallbackApprove = "Stage approvals on short-cycle proof";
    const fallbackDelay = "Delay irreversible commitments";
    const structuredFlipCondition = joinFlipConditions(
      rule?.flipConditions
      .map((condition) => condition.label.trim())
      .filter((condition) => condition.length > 0)
      ?? [],
    );
    const fallbackFlipCondition = lockCommitment.flipConditions[flipConditionIndex] ?? lockCommitment.flipConditions[0] ?? "Recheck thresholds on next refresh.";
    const flipSummary = structuredFlipCondition || rule?.resumeTrigger || fallbackFlipCondition;
    const flipDetail = [rule?.resumeTrigger, structuredFlipCondition, !rule ? fallbackFlipCondition : ""]
      .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0))
      .join(" ")
      .trim();

    return {
      key,
      label,
      cells: {
        approve: {
          text: compactMatrixText(rule ? formatBoundedDecisionAction(rule) : "", fallbackApprove),
          detail: rule?.rationale ?? "Use current posture until signal quality improves.",
          action: rule ? formatBoundedDecisionAction(rule) : fallbackApprove,
          threshold: rule ? formatBoundedDecisionThreshold(rule) : "Pause if thresholds weaken",
          reversal: rule ? formatBoundedDecisionReverse(rule) : "Reverse only after threshold recovery",
        },
        delay: {
          text: compactMatrixText(rule?.avoidNow[0] ?? "", fallbackDelay),
          detail: rule?.pauseTrigger ?? "Pause if macro confidence degrades or thresholds weaken.",
          action: compactMatrixText(rule?.avoidNow[0] ?? "", fallbackDelay),
          threshold: rule ? formatBoundedDecisionThreshold(rule) : "Pause if thresholds weaken",
          reversal: rule ? formatBoundedDecisionReverse(rule) : "Reverse only after threshold recovery",
        },
        flip: {
          text: compactMatrixText(flipSummary, "Flip only after threshold recovery"),
          detail: flipDetail || "Resume only with sustained threshold recovery.",
          action: rule ? formatBoundedDecisionAction(rule) : fallbackApprove,
          threshold: rule ? formatBoundedDecisionThreshold(rule) : fallbackFlipCondition,
          reversal: compactMatrixText(flipSummary, "Flip only after threshold recovery"),
        },
      },
    };
  });

  return {
    columns: [
      { key: "approve", label: "Approve" },
      { key: "delay", label: "Delay" },
      { key: "flip", label: "Flip" },
    ],
    rows,
  };
};
