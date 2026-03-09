import type { RegimeKey } from "../regimeEngine";
import type { BoundedDecisionRule, DecisionArea } from "./boundedDecisionRules";

export type OperatingCall = {
  hiring: string;
  roadmap: string;
  spend: string;
};

export type RoleAwareOperatingTemplate = {
  role: "startup-leadership" | "vc-partner";
  roleLabel: string;
  doNow: string;
  avoidNow: string;
  flipTrigger: string;
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
