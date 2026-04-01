import type { Route } from "./routeType";

export type NavigationLayerKey =
  | "weekly-brief"
  | "signals"
  | "operations"
  | "decide"
  | "toolkits"
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
  core: "This week",
  workflow: "Decide",
  reference: "Check",
} as const;

export const navigationLayers: NavigationLayer[] = [
  {
    key: "weekly-brief",
    href: "/",
    label: "Weekly Brief",
    description: "Read this week's call, bounded action, and the share-ready artifact.",
    boundary: "Canonical weekly workspace. Leave home only if proof, planning, edge cases, or trust still need work.",
    group: "core",
    tier: "primary",
  },
  {
    key: "signals",
    href: "/signals",
    label: "Evidence",
    description: "Check what changed, what drove it, and which watch lines matter now.",
    boundary: "Evidence depth only. Weekly Brief stays canonical for the live operating call.",
    group: "reference",
    tier: "primary",
  },
  {
    key: "operations",
    href: "/operations",
    label: "Planning",
    description: "Set this week's guardrails for hiring, spend, roadmap, and the final brief.",
    boundary: "Execution depth only. Weekly Brief remains the canonical orchestration surface.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "decide",
    href: "/decide",
    label: "Decision Tools",
    description: "Resolve one remaining question with the smallest useful answer or tool.",
    boundary: "Routing and translation depth only. Do not duplicate the live brief or weekly plan.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "method",
    href: "/method",
    label: "Trust",
    description: "Check freshness, confidence, source coverage, and reversal conditions.",
    boundary: "Transparency and trust checks only. Return to Weekly Brief once validated.",
    group: "reference",
    tier: "primary",
  },
  {
    key: "toolkits",
    href: "/toolkits",
    label: "Toolkits",
    description: "Supporting instruments under Decision Tools for one already-routed decision exercise.",
    boundary: "Supporting surface under Decision Tools. No duplicate posture logic or evidence summaries.",
    group: "workflow",
    tier: "supporting",
    parentKey: "decide",
  },
] as const;

export const primaryNavigationLayers = navigationLayers.filter((layer) => layer.tier === "primary");
export const primaryNavigationSurfaceCount = primaryNavigationLayers.length;

export const primaryNavigationSurfaceIndexByHref = primaryNavigationLayers.reduce<Record<Route, number>>((acc, layer, index) => {
  acc[layer.href] = index;
  return acc;
}, {} as Record<Route, number>);

export const resolvePrimaryNavigationSurfaceCue = (href: Route) => {
  if (href === "/") return "Start here";
  if (href === "/signals") return "Check proof";
  if (href === "/operations") return "Set guardrails";
  if (href === "/decide") return "Resolve one question";
  if (href === "/method") return "Check trust";
  return null;
};

export const resolveNavigationRouteCue = (href: Route) => (href === "/" ? "Weekly Brief" : href);

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
    note: "Methodology permanently redirects to the Trust formula reference anchor.",
  },
] as const;
