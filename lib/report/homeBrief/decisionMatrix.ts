import { buildWeeklyLockCommitment } from "../decisionKnobs";
import type { BoundedDecisionRule } from "../boundedDecisionRules";
import type { DecisionMatrixPayload, DecisionMatrixRow, DecisionMatrixRowKey, Regime } from "../homeBriefModel";

const compactMatrixText = (value: string, fallback: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  const [firstClause] = normalized.split(/[.;]/);
  return firstClause?.trim() || fallback;
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
    const fallbackDelay = "Pause when thresholds weaken";
    const fallbackFlipCondition = lockCommitment.flipConditions[flipConditionIndex] ?? lockCommitment.flipConditions[0] ?? "Recheck thresholds on next refresh.";

    return {
      key,
      label,
      cells: {
        approve: {
          text: compactMatrixText(rule?.doNow[0] ?? "", fallbackApprove),
          detail: rule?.rationale ?? "Use current posture until signal quality improves.",
        },
        delay: {
          text: compactMatrixText(rule?.pauseTrigger ?? "", fallbackDelay),
          detail: rule?.rationale ?? "Keep thresholds attached to measurable operating triggers.",
        },
        flip: {
          text: compactMatrixText(rule?.resumeTrigger ?? "", fallbackFlipCondition),
          detail: rule?.rationale ?? "Reverse only after supportive threshold recovery holds.",
        },
      },
    };
  });

  return {
    columns: [
      { key: "approve", label: "Action" },
      { key: "delay", label: "Threshold" },
      { key: "flip", label: "Reverse" },
    ],
    rows,
  };
};
