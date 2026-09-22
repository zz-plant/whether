import type { DecisionArea } from "../lib/report/boundedDecisionRules";
import { decisionAreaLabel } from "../lib/report/boundedDecisionRules";
import { indexableSignalsClusters } from "./signals/clusterRoutes";

type DecisionScenarioDefinition = {
  slug: DecisionArea;
  title: string;
};

export const decisionScenarioDefinitions: DecisionScenarioDefinition[] = [
  { slug: "hiring", title: decisionAreaLabel("hiring") },
  { slug: "product-tempo", title: decisionAreaLabel("product-tempo") },
  { slug: "capital-raising", title: decisionAreaLabel("capital-raising") },
  { slug: "burn-discipline", title: decisionAreaLabel("burn-discipline") },
  { slug: "expansion-bets", title: decisionAreaLabel("expansion-bets") },
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
