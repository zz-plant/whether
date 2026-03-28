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
    label: "Evidence",
    description: "Why the weekly call moved: drivers, thresholds, freshness, and replay.",
    boundary: "Evidence depth only; Weekly Brief remains the source of truth for the live call.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "decide",
    href: "/decide",
    label: "Decision Tools",
    description: "Role, situation, and bounded utilities for edge cases the weekly plan does not settle.",
    boundary: "Translation depth only; do not duplicate the live brief or weekly plan.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "operations",
    href: "/operations",
    label: "Planning",
    description: "Approve the weekly operating plan, guardrails, finance posture, and final brief.",
    boundary: "Execution depth only; Weekly Brief remains the canonical orchestration surface.",
    group: "workflow",
    tier: "primary",
  },
  {
    key: "method",
    href: "/method",
    label: "Trust",
    description: "Defend the call with freshness, confidence, sources, and formulas.",
    boundary: "Transparency surfaces only.",
    group: "reference",
    tier: "primary",
  },
  {
    key: "toolkits",
    href: "/toolkits",
    label: "Toolkits",
    description: "Supporting instrument library under Decision Tools for runnable templates and checklists.",
    boundary: "Supporting surface under Decision Tools; no duplicate posture logic or evidence summaries.",
    group: "workflow",
    tier: "supporting",
    parentKey: "decide",
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
    note: "Methodology permanently redirects to the Trust formula reference anchor.",
  },
] as const;

export const secondarySurfaceRoots: ReadonlyArray<Route> = [
  "/guides",
  "/resources",
  "/answers",
  "/concepts",
] as const;
