import type { DecisionArea } from "./boundedDecisionRules";
import type { BusinessAreaKey } from "./decisionKnobs";

export const operatingLeverToDecisionArea: Record<BusinessAreaKey, DecisionArea> = {
  "hiring-stance": "hiring",
  "investment-pace": "burn-discipline",
  "sales-posture": "capital-raising",
  "product-priorities": "product-tempo",
  "risk-tolerance": "expansion-bets",
};
