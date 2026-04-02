import {
  formatActionStripReversalText,
  formatActionStripThresholdText,
  formatBoundedDecisionAction,
  type BoundedDecisionRule,
  type DecisionArea,
} from "./boundedDecisionRules";
import { operatingLeverLabel, operatingLeverOrder, type OperatingLeverKey } from "./decisionKnobs";
import { operatingLeverToDecisionArea } from "./operatingLeverMap";
import type { DecisionTransmissionBoundedRule } from "./reportData";

/**
 * Loop stage owner: decision.
 *
 * Builds reusable bounded decision artifacts (action strip + role templates)
 * from canonical decision rules. Keep this logic detached from component-level
 * rendering concerns.
 */

export type ActionStripItem = {
  lever: OperatingLeverKey;
  label: string;
  actionNow: string;
  triggerThreshold: string;
  reversalCondition: string;
  currentStateLabel?: "Closed" | "Guarded" | "Staged" | "Open";
  currentStateStep?: 0 | 1 | 2 | 3;
  corridorProgressPercent?: number;
  tightenDistanceLabel?: string;
  reopenDistanceLabel?: string;
};

export type RoleAwareOperatingTemplate = {
  role: "startup-leadership" | "vc-partner";
  roleLabel: string;
  doNow: string;
  avoidNow: string;
  flipTrigger: string;
};

const findRule = (rules: BoundedDecisionRule[], area: DecisionArea) =>
  rules.find((rule) => rule.area === area);

const isString = (value: string | undefined): value is string => typeof value === "string";

const OPERATING_LEVER_FALLBACK = {
  actionNow: "Keep current operating posture until a rule refresh is available.",
  triggerThreshold: "Tighten only if confidence and threshold signals worsen.",
  reversalCondition: "Loosen only when threshold conditions recover and hold.",
} satisfies Omit<ActionStripItem, "lever" | "label">;

const MANUAL_REVIEW_THRESHOLD_PLACEHOLDER = "Threshold unavailable — manual review required.";
const MANUAL_REVIEW_REVERSAL_PLACEHOLDER = "Reversal condition unavailable — manual review required.";

const hasText = (value: string | undefined | null) => typeof value === "string" && value.trim().length > 0;

const toDecisionTransmissionRule = ({
  action,
  triggerThreshold,
  reversalCondition,
}: {
  action?: string;
  triggerThreshold?: string;
  reversalCondition?: string;
}): DecisionTransmissionBoundedRule => {
  const missingThreshold = !hasText(triggerThreshold);
  const missingReversal = !hasText(reversalCondition);

  return {
    action: hasText(action) ? action.trim() : OPERATING_LEVER_FALLBACK.actionNow,
    triggerThreshold: missingThreshold ? MANUAL_REVIEW_THRESHOLD_PLACEHOLDER : triggerThreshold.trim(),
    reversalCondition: missingReversal ? MANUAL_REVIEW_REVERSAL_PLACEHOLDER : reversalCondition.trim(),
    manualReviewRequired: missingThreshold || missingReversal,
  };
};

export const buildDecisionTransmissionBoundedRules = ({
  rules,
  actionStripItems,
}: {
  rules?: BoundedDecisionRule[];
  actionStripItems?: ActionStripItem[];
}): DecisionTransmissionBoundedRule[] => {
  if (Array.isArray(actionStripItems) && actionStripItems.length > 0) {
    return actionStripItems.map((item) =>
      toDecisionTransmissionRule({
        action: item.actionNow,
        triggerThreshold: item.triggerThreshold,
        reversalCondition: item.reversalCondition,
      }),
    );
  }

  if (Array.isArray(rules) && rules.length > 0) {
    return rules.map((rule) =>
      toDecisionTransmissionRule({
        action: formatBoundedDecisionAction(rule),
        triggerThreshold: formatActionStripThresholdText(rule),
        reversalCondition: formatActionStripReversalText(rule),
      }),
    );
  }

  return [
    toDecisionTransmissionRule({
      action: OPERATING_LEVER_FALLBACK.actionNow,
      triggerThreshold: undefined,
      reversalCondition: undefined,
    }),
  ];
};

type CurrentScores = {
  tightness: number;
  riskAppetite: number;
};

type RuleThresholdCondition = {
  metric: keyof CurrentScores;
  operator: ">" | ">=" | "<" | "<=";
  value: number;
  label: string;
};

export type RuleThresholdDistance = RuleThresholdCondition & {
  currentValue: number;
  pointsToLine: number;
  satisfied: boolean;
};

export type DecisionLaneState = {
  currentStateLabel: "Closed" | "Guarded" | "Staged" | "Open";
  currentStateStep: 0 | 1 | 2 | 3;
  currentLane: "blocked" | "caution" | "allowed";
  corridorProgressPercent: number;
  nearestPause?: RuleThresholdDistance;
  nearestResume?: RuleThresholdDistance;
  tightenDistanceLabel: string;
  reopenDistanceLabel: string;
};

const stateLabelByStep = ["Closed", "Guarded", "Staged", "Open"] as const;
const progressByStep = [12, 38, 70, 92] as const;

const metricLabel = (metric: keyof CurrentScores) => (metric === "riskAppetite" ? "Risk appetite" : "Tightness");

const parseRuleThresholdConditions = (text: string): RuleThresholdCondition[] => {
  const matches = text.matchAll(/(tightness|risk appetite)\s*(>=|<=|>|<|falls below|rises above)\s*(-?\d+(?:\.\d+)?)/gi);

  return Array.from(matches, (match) => ({
    metric: match[1].toLowerCase() === "risk appetite" ? "riskAppetite" : "tightness",
    operator: (match[2].toLowerCase() === "falls below"
      ? "<"
      : match[2].toLowerCase() === "rises above"
        ? ">"
        : match[2]) as RuleThresholdCondition["operator"],
    value: Number(match[3]),
    label: `${match[1]} ${match[2]} ${match[3]}`,
  }));
};

const isConditionSatisfied = (currentValue: number, operator: RuleThresholdCondition["operator"], targetValue: number) => {
  switch (operator) {
    case ">":
      return currentValue > targetValue;
    case ">=":
      return currentValue >= targetValue;
    case "<":
      return currentValue < targetValue;
    case "<=":
      return currentValue <= targetValue;
    default:
      return false;
  }
};

const toThresholdDistance = (condition: RuleThresholdCondition, scores: CurrentScores): RuleThresholdDistance => {
  const currentValue = scores[condition.metric];
  const satisfied = isConditionSatisfied(currentValue, condition.operator, condition.value);
  const rawGap = condition.operator === ">" || condition.operator === ">="
    ? condition.value - currentValue
    : currentValue - condition.value;

  return {
    ...condition,
    currentValue,
    pointsToLine: satisfied ? 0 : Math.max(0, rawGap),
    satisfied,
  };
};

const formatDistanceLabel = (distance: RuleThresholdDistance | undefined, kind: "caution" | "reopen") => {
  if (!distance) {
    return kind === "caution" ? "Caution line unavailable." : "Reopen line unavailable.";
  }

  if (distance.satisfied) {
    return kind === "caution"
      ? `${metricLabel(distance.metric)} already crossed the caution line.`
      : `${metricLabel(distance.metric)} already clears the reopen line.`;
  }

  return `${metricLabel(distance.metric)} ${distance.pointsToLine.toFixed(1)} pts to ${kind === "caution" ? "caution" : "reopen"}.`;
};

const sortThresholdDistance = (left: RuleThresholdDistance, right: RuleThresholdDistance) =>
  left.pointsToLine - right.pointsToLine;

export const resolveDecisionLaneState = ({
  rule,
  scores,
}: {
  rule?: Pick<BoundedDecisionRule, "pauseTrigger" | "resumeTrigger">;
  scores?: CurrentScores;
}): DecisionLaneState | null => {
  if (!rule || !scores) {
    return null;
  }

  const pauseConditions = parseRuleThresholdConditions(rule.pauseTrigger).map((condition) => toThresholdDistance(condition, scores));
  const resumeConditions = parseRuleThresholdConditions(rule.resumeTrigger).map((condition) => toThresholdDistance(condition, scores));
  const nearestPause = [...pauseConditions].sort(sortThresholdDistance)[0];
  const nearestResume = [...resumeConditions].sort(sortThresholdDistance)[0];
  const pauseSatisfied = pauseConditions.some((condition) => condition.satisfied);
  const resumeSatisfiedCount = resumeConditions.filter((condition) => condition.satisfied).length;

  let currentStateStep: 0 | 1 | 2 | 3 = pauseSatisfied
    ? 0
    : resumeConditions.length === 0 || resumeSatisfiedCount === 0
      ? 1
      : resumeSatisfiedCount < resumeConditions.length
        ? 2
        : 3;

  if (!pauseSatisfied && nearestPause && nearestPause.pointsToLine <= 4 && currentStateStep > 1) {
    currentStateStep = (currentStateStep - 1) as 0 | 1 | 2 | 3;
  }

  return {
    currentStateLabel: stateLabelByStep[currentStateStep],
    currentStateStep,
    currentLane: currentStateStep === 0 ? "blocked" : currentStateStep === 1 ? "caution" : "allowed",
    corridorProgressPercent: progressByStep[currentStateStep],
    nearestPause,
    nearestResume,
    tightenDistanceLabel: formatDistanceLabel(nearestPause, "caution"),
    reopenDistanceLabel: formatDistanceLabel(nearestResume, "reopen"),
  };
};

export const buildActionStripItems = (rules: BoundedDecisionRule[], scores?: CurrentScores): ActionStripItem[] =>
  operatingLeverOrder.map((lever) => {
    const area = operatingLeverToDecisionArea[lever];
    const rule = findRule(rules, area);
    const laneState = resolveDecisionLaneState({ rule, scores });

    return {
      lever,
      label: operatingLeverLabel[lever],
      actionNow: rule ? formatBoundedDecisionAction(rule) : OPERATING_LEVER_FALLBACK.actionNow,
      triggerThreshold: rule ? formatActionStripThresholdText(rule) : OPERATING_LEVER_FALLBACK.triggerThreshold,
      reversalCondition: rule ? formatActionStripReversalText(rule) : OPERATING_LEVER_FALLBACK.reversalCondition,
      currentStateLabel: laneState?.currentStateLabel,
      currentStateStep: laneState?.currentStateStep,
      corridorProgressPercent: laneState?.corridorProgressPercent,
      tightenDistanceLabel: laneState?.tightenDistanceLabel,
      reopenDistanceLabel: laneState?.reopenDistanceLabel,
    };
  });

export const buildRoleAwareOperatingTemplates = (rules: BoundedDecisionRule[]): RoleAwareOperatingTemplate[] => {
  const hiringRule = findRule(rules, "hiring");
  const productRule = findRule(rules, "product-tempo");
  const capitalRule = findRule(rules, "capital-raising");
  const burnRule = findRule(rules, "burn-discipline");
  const expansionRule = findRule(rules, "expansion-bets");

  return [
    {
      role: "startup-leadership",
      roleLabel: "Startup leadership",
      doNow: [hiringRule?.recommendation, productRule?.recommendation, burnRule?.recommendation]
        .filter(isString)
        .join(" "),
      avoidNow: [hiringRule && formatActionStripThresholdText(hiringRule), productRule && formatActionStripThresholdText(productRule)]
        .filter(isString)
        .join(" "),
      flipTrigger: expansionRule
        ? formatActionStripReversalText(expansionRule)
        : hiringRule
          ? formatActionStripReversalText(hiringRule)
          : "",
    },
    {
      role: "vc-partner",
      roleLabel: "VC partner",
      doNow: [capitalRule?.recommendation, burnRule?.recommendation]
        .filter(isString)
        .join(" "),
      avoidNow: [capitalRule && formatActionStripThresholdText(capitalRule), expansionRule && formatActionStripThresholdText(expansionRule)]
        .filter(isString)
        .join(" "),
      flipTrigger: capitalRule
        ? formatActionStripReversalText(capitalRule)
        : expansionRule
          ? formatActionStripReversalText(expansionRule)
          : "",
    },
  ];
};
