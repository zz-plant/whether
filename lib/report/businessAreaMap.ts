import type { DecisionArea } from "./boundedDecisionRules";
import type { BusinessAreaKey } from "./decisionKnobs";

export const decisionAreaToOperatingLever: Record<DecisionArea, BusinessAreaKey> = {
  hiring: "hiring-stance",
  "burn-discipline": "investment-pace",
  "capital-raising": "sales-posture",
  "product-tempo": "product-priorities",
  "expansion-bets": "risk-tolerance",
};

export const operatingLeverToDecisionArea: Record<BusinessAreaKey, DecisionArea> = {
  "hiring-stance": "hiring",
  "investment-pace": "burn-discipline",
  "sales-posture": "capital-raising",
  "product-priorities": "product-tempo",
  "risk-tolerance": "expansion-bets",
};
