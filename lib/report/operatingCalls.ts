import type { RegimeKey } from "../regimeEngine";
import type { BoundedDecisionRule, DecisionArea } from "./boundedDecisionRules";
import { operatingLeverLabel, type OperatingLeverKey } from "./decisionKnobs";

export type OperatingCall = {
  hiring: string;
  roadmap: string;
  spend: string;
};

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

export const decisionAreaToOperatingLever: Record<DecisionArea, OperatingLeverKey> = {
  hiring: "hiring-stance",
  "burn-discipline": "investment-pace",
  "capital-raising": "sales-posture",
  "product-tempo": "product-priorities",
  "expansion-bets": "risk-tolerance",
};

const orderedOperatingLeverAreas: Array<{ lever: OperatingLeverKey; area: DecisionArea }> = [
  { lever: "hiring-stance", area: "hiring" },
  { lever: "investment-pace", area: "burn-discipline" },
  { lever: "sales-posture", area: "capital-raising" },
  { lever: "product-priorities", area: "product-tempo" },
  { lever: "risk-tolerance", area: "expansion-bets" },
];

const canonicalRuleFallback: Omit<ActionStripItem, "lever" | "label"> = {
  actionNow: "Keep current operating posture until a canonical rule refresh is available.",
  triggerThreshold: "Tighten only if confidence and threshold signals worsen.",
  reversalCondition: "Loosen only when threshold conditions recover and hold.",
};

export const operatingCallsByRegime: Record<RegimeKey, OperatingCall> = {
  SCARCITY: {
    hiring: "Maintain freeze",
    roadmap: "Cut to must-win commitments",
    spend: "Require immediate payback",
  },
  DEFENSIVE: {
    hiring: "Backfill critical roles only",
    roadmap: "Favor retention and reliability",
    spend: "Gate discretionary programs",
  },
  VOLATILE: {
    hiring: "Stay selective by role",
    roadmap: "Prioritize near-term ROI",
    spend: "Fund only measurable returns",
  },
  EXPANSION: {
    hiring: "Add targeted growth capacity",
    roadmap: "Scale validated bets",
    spend: "Increase with guardrails",
  },
};

const findRule = (rules: BoundedDecisionRule[], area: DecisionArea) =>
  rules.find((rule) => rule.area === area);

const sanitizeGuardrail = (pauseTrigger: string) =>
  pauseTrigger.replace(/^Pause\s+/i, "").replace(/\.$/, "");

const sanitizeFlip = (resumeTrigger: string) =>
  resumeTrigger.replace(/^Resume\s+/i, "").replace(/\.$/, "");

const isString = (value: string | undefined): value is string => typeof value === "string";

export const buildActionStripItems = (rules: BoundedDecisionRule[]): ActionStripItem[] =>
  orderedOperatingLeverAreas.map(({ lever, area }) => {
    const rule = findRule(rules, area);
    return {
      lever,
      label: operatingLeverLabel[lever],
      actionNow: rule?.recommendation ?? canonicalRuleFallback.actionNow,
      triggerThreshold: rule?.pauseTrigger ?? canonicalRuleFallback.triggerThreshold,
      reversalCondition: rule?.resumeTrigger ?? canonicalRuleFallback.reversalCondition,
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
