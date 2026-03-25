import type { Route } from "./routeType";

export type NavigationLayerKey =
  | "weekly-brief"
  | "signals"
  | "operations"
  | "decide"
  | "toolkits"
  | "learn"
  | "method";

export type NavigationLayer = {
  key: NavigationLayerKey;
  href: Route;
  label: string;
  description: string;
  boundary: string;
  group: "core" | "workflow" | "reference";
  tier: "primary" | "supporting";
  parentKey?: NavigationLayerKey;
};

export const navigationGroupLabels = {
  core: "Now",
  workflow: "Workflows",
  reference: "Reference",
} as const;

export const navigationLayers: NavigationLayer[] = [
  {
    key: "weekly-brief",
    href: "/",
    label: "Weekly Brief",
    description: "Current posture, bounded call, and share-ready artifact.",
    boundary: "Outcome snapshot only; detailed evidence and playbooks live in downstream hubs.",
    group: "core",
    tier: "primary",
  },
  {
    key: "signals",
    href: "/signals",
    label: "Signals",
    description: "Deep evidence appendix for drivers, thresholds, and freshness behind the weekly brief.",
    boundary: "Evidence depth only; the canonical weekly workflow lives on Weekly Brief.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "decide",
    href: "/decide",
    label: "Decide",
    description: "Role, situation, and utility paths that translate the weekly call into bounded choices.",
    boundary: "Decision translation depth only; do not duplicate the home workspace.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "operations",
    href: "/operations",
    label: "Operations",
    description: "Detailed execution guardrails once the weekly plan needs deeper review.",
    boundary: "Execution depth only; Weekly Brief remains the canonical orchestration surface.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "method",
    href: "/method",
    label: "Method",
    description: "Audit trust, sources, formulas, and confidence without leaving the weekly loop.",
    boundary: "Transparency surfaces only.",
    group: "reference",
    tier: "primary",
  },
  {
    key: "toolkits",
    href: "/toolkits",
    label: "Toolkits",
    description: "Supporting instrument library under Decide for runnable templates and checklists.",
    boundary: "Supporting surface under Decide; no duplicate posture logic or evidence summaries.",
    group: "workflow",
    tier: "supporting",
    parentKey: "decide",
  },
  {
    key: "learn",
    href: "/learn",
    label: "Learn",
    description: "Supporting reference library under Method for concepts, diagnostics, and failure modes.",
    boundary: "Supporting surface under Method; never the canonical workflow or trust path.",
    group: "reference",
    tier: "supporting",
    parentKey: "method",
  },
] as const;

export const primaryNavigationLayers = navigationLayers.filter((layer) => layer.tier === "primary");

export const supportingNavigationLayers = navigationLayers.filter((layer) => layer.tier === "supporting");

export const navigationLayerByKey = navigationLayers.reduce<Record<NavigationLayerKey, NavigationLayer>>((acc, layer) => {
  acc[layer.key] = layer;
  return acc;
}, {} as Record<NavigationLayerKey, NavigationLayer>);

export const navigationLabelByPath = navigationLayers.reduce<Record<string, string>>((acc, layer) => {
  acc[layer.href] = layer.label;
  return acc;
}, {});

export const trustHubAliases: ReadonlyArray<{ href: Route; canonicalHref: Route; status: "legacy-alias" | "subordinate"; note: string }> = [
  {
    href: "/methodology",
    canonicalHref: "/method",
    status: "legacy-alias",
    note: "Methodology remains a legacy alias that resolves to Method formula reference content.",
  },
] as const;

export const secondarySurfaceRoots: ReadonlyArray<Route> = [
  "/guides",
  "/resources",
  "/answers",
  "/concepts",
  "/solutions/engineering-capacity",
  "/solutions/product-roadmapping",
  "/solutions/market-regime-playbook",
  "/solutions/career-paths",
] as const;
