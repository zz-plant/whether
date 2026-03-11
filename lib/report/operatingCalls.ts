import type { BoundedDecisionRule, DecisionArea } from "./boundedDecisionRules";
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

const sanitizeGuardrail = (pauseTrigger: string) =>
  pauseTrigger.replace(/^Pause\s+/i, "").replace(/\.$/, "");

const sanitizeFlip = (resumeTrigger: string) =>
  resumeTrigger.replace(/^Resume\s+/i, "").replace(/\.$/, "");

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
      actionNow: rule?.recommendation ?? OPERATING_LEVER_FALLBACK.actionNow,
      triggerThreshold: rule?.pauseTrigger ?? OPERATING_LEVER_FALLBACK.triggerThreshold,
      reversalCondition: rule?.resumeTrigger ?? OPERATING_LEVER_FALLBACK.reversalCondition,
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
      avoidNow: [hiringRule?.pauseTrigger, productRule?.pauseTrigger]
        .filter(isString)
        .map(sanitizeGuardrail)
        .join(" "),
      flipTrigger: sanitizeFlip(expansionRule?.resumeTrigger ?? hiringRule?.resumeTrigger ?? ""),
    },
    {
      role: "vc-partner",
      roleLabel: "VC partner",
      doNow: [capitalRule?.recommendation, burnRule?.recommendation]
        .filter(isString)
        .join(" "),
      avoidNow: [capitalRule?.pauseTrigger, expansionRule?.pauseTrigger]
        .filter(isString)
        .map(sanitizeGuardrail)
        .join(" "),
      flipTrigger: sanitizeFlip(capitalRule?.resumeTrigger ?? expansionRule?.resumeTrigger ?? ""),
    },
  ];
};
