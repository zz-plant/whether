import type { Route } from "./routeType";

export type NavigationLayerKey =
  | "weekly-brief"
  | "signals"
  | "planning"
  | "resolve"
  | "trust"
  | "history"
  | "compare";

export type NavigationLayer = {
  key: NavigationLayerKey;
  href: Route;
  label: string;
  navLabel?: string;
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
    navLabel: "Start here",
    description: "See this week's call, what to do now, and a brief you can share.",
    boundary: "Use this first to see the current call and the next move.",
    group: "core",
    tier: "primary",
  },
  {
    key: "signals",
    href: "/evidence",
    label: "Evidence",
    navLabel: "Evidence",
    description: "See what changed, what drove it, and the thresholds worth watching.",
    boundary: "Use this when you want the proof behind the call.",
    group: "reference",
    tier: "primary",
  },
  {
    key: "planning",
    href: "/planning",
    label: "Plan",
    navLabel: "Plan",
    description: "Turn this week's brief into decisions on hiring, spend, roadmap, and what to share.",
    boundary: "Use this when you are ready to turn the brief into approvals.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "resolve",
    href: "/resolve",
    label: "Resolve",
    navLabel: "Resolve",
    description: "Find the right answer or tool for one remaining question.",
    boundary: "Use this page when the brief is clear but one question still needs an answer.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "trust",
    href: "/trust",
    label: "Readiness",
    navLabel: "Readiness",
    description: "Check freshness, confidence, source coverage, and what would change the brief.",
    boundary: "Use this when you want to sanity-check the brief before a big decision.",
    group: "reference",
    tier: "primary",
  },
  {
    key: "history",
    href: "/history",
    label: "History",
    navLabel: "History",
    description: "See how tightness and risk appetite have changed over time.",
    boundary: "Use this to spot regime transitions and compare current conditions to past periods.",
    group: "reference",
    tier: "primary",
  },
  {
    key: "compare",
    href: "/history/compare",
    label: "Compare Epochs",
    navLabel: "Compare",
    description: "Compare side-by-side macro signal diffs across historical epochs.",
    boundary: "Use this to contrast the current posture with previous periods.",
    group: "reference",
    tier: "supporting",
    parentKey: "history",
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
  if (href === "/evidence") return "Evidence";
  if (href === "/planning") return "Plan";
  if (href === "/resolve") return "Resolve";
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
    canonicalHref: "/trust",
    status: "legacy-alias",
    note: "Methodology permanently redirects to the Trust formula reference anchor.",
  },
] as const;
