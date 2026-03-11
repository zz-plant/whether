import type { DecisionArea } from "./boundedDecisionRules";
import type { OperatingLeverKey } from "./decisionKnobs";

export const decisionAreaToOperatingLever: Record<DecisionArea, OperatingLeverKey> = {
  hiring: "hiring-stance",
  "burn-discipline": "investment-pace",
  "capital-raising": "sales-posture",
  "product-tempo": "product-priorities",
  "expansion-bets": "risk-tolerance",
};

export const operatingLeverToDecisionArea: Record<OperatingLeverKey, DecisionArea> = {
  "hiring-stance": "hiring",
  "investment-pace": "burn-discipline",
  "sales-posture": "capital-raising",
  "product-priorities": "product-tempo",
  "risk-tolerance": "expansion-bets",
};
