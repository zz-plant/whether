import {
  formatActionStripReversalText,
  formatActionStripThresholdText,
  formatBoundedDecisionAction,
  type BoundedDecisionRule,
  type DecisionArea,
} from "./boundedDecisionRules";
import { operatingLeverLabel, operatingLeverOrder, type OperatingLeverKey } from "./decisionKnobs";
import { operatingLeverToDecisionArea } from "./operatingLeverMap";

export type ActionStripItem = {
  lever: OperatingLeverKey;
  label: string;
  actionNow: string;
  triggerThreshold: string;
  reversalCondition: string;
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

export const buildActionStripItems = (rules: BoundedDecisionRule[]): ActionStripItem[] =>
  operatingLeverOrder.map((lever) => {
    const area = operatingLeverToDecisionArea[lever];
    const rule = findRule(rules, area);

    return {
      lever,
      label: operatingLeverLabel[lever],
      actionNow: rule ? formatBoundedDecisionAction(rule) : OPERATING_LEVER_FALLBACK.actionNow,
      triggerThreshold: rule ? formatActionStripThresholdText(rule) : OPERATING_LEVER_FALLBACK.triggerThreshold,
      reversalCondition: rule ? formatActionStripReversalText(rule) : OPERATING_LEVER_FALLBACK.reversalCondition,
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
