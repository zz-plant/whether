import type { DecisionArea } from "../lib/report/boundedDecisionRules";
import { useCaseRoles, type ToolkitSlug } from "../lib/informationArchitecture";
import { indexableSignalsClusters } from "./signals/clusterRoutes";

export type DecisionScenarioDefinition = {
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

const rolePrimaryScenarios: Record<string, DecisionArea> = {
  ceo: "capital-raising",
  board: "burn-discipline",
  product: "product-tempo",
  engineering: "expansion-bets",
  "growth-gtm": "product-tempo",
  "ops-risk": "burn-discipline",
};

export const decideCanonicalRoutes = useCaseRoles.flatMap((role) =>
  decisionScenarioDefinitions.map((scenario) => ({
    role: role.slug,
    scenario: scenario.slug,
    isCanonical: rolePrimaryScenarios[role.slug] === scenario.slug,
  })),
);

const toolkitPrimaryContexts: Record<ToolkitSlug, string> = {
  pmf: "risk-appetite-watch",
  focus: "capital-tightness-watch",
  rollback: "yield-curve-flip-watch",
  "decision-rights": "capital-tightness-watch",
  claims: "risk-appetite-watch",
  "launch-gates": "yield-curve-flip-watch",
  "ops-capacity": "capital-tightness-watch",
};

export const toolkitCanonicalRoutes = (Object.keys(toolkitPrimaryContexts) as ToolkitSlug[]).flatMap((toolkitType) =>
  indexableSignalsClusters.map((context) => ({
    toolkitType,
    macroContext: context.slug,
    isCanonical: toolkitPrimaryContexts[toolkitType] === context.slug,
  })),
);

export const signalScenarioRoutes = indexableSignalsClusters.flatMap((signal) =>
  decisionScenarioDefinitions.map((scenario) => ({
    signalSlug: signal.slug,
    decisionScenario: scenario.slug,
    isCanonical: true,
  })),
);

export const findDecisionScenario = (slug: string) =>
  decisionScenarioDefinitions.find((scenario) => scenario.slug === slug);

export const findCanonicalDecideRoute = (role: string, scenario: string) =>
  decideCanonicalRoutes.find((route) => route.role === role && route.scenario === scenario);

export const findCanonicalToolkitRoute = (toolkitType: string, macroContext: string) =>
  toolkitCanonicalRoutes.find((route) => route.toolkitType === toolkitType && route.macroContext === macroContext);
