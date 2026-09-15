import type { DecisionArea } from "../lib/report/boundedDecisionRules";
import { indexableSignalsClusters } from "./signals/clusterRoutes";

type DecisionScenarioDefinition = {
  slug: DecisionArea;
  title: string;
};

export const decisionScenarioDefinitions: DecisionScenarioDefinition[] = [
  { slug: "hiring", title: "Hiring" },
  { slug: "product-tempo", title: "Product tempo" },
  { slug: "capital-raising", title: "Capital raising" },
  { slug: "burn-discipline", title: "Burn discipline" },
  { slug: "expansion-bets", title: "Expansion bets" },
];

export const signalScenarioRoutes = indexableSignalsClusters.flatMap((signal) =>
  decisionScenarioDefinitions.map((scenario) => ({
    signalSlug: signal.slug,
    decisionScenario: scenario.slug,
    isCanonical: true,
  })),
);

export const findDecisionScenario = (slug: string) =>
  decisionScenarioDefinitions.find((scenario) => scenario.slug === slug);
