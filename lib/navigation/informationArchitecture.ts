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
  tier: "primary" | "supporting";
  parentKey?: NavigationLayerKey;
};

// Primary layers are listed in operator-loop order: brief → evidence → plan →
// resolve → readiness. Header next-step cues and nav ordering derive from this
// array — do not maintain a parallel ordering elsewhere.
export const navigationLayers: NavigationLayer[] = [
  {
    key: "weekly-brief",
    href: "/",
    label: "Weekly Brief",
    navLabel: "Brief",
    description: "See this week's call, what to do now, and a brief you can share.",
    boundary: "Use this first to see the current call and the next move.",
    tier: "primary",
  },
  {
    key: "signals",
    href: "/signals",
    label: "Evidence",
    navLabel: "Evidence",
    description: "See what changed, what drove it, and the thresholds worth watching.",
    boundary: "Use this when you want the proof behind the call.",
    tier: "primary",
  },
  {
    key: "planning",
    href: "/operate",
    label: "Plan",
    navLabel: "Plan",
    description: "Turn this week's brief into decisions on hiring, spend, roadmap, and what to share.",
    boundary: "Use this when you are ready to turn the brief into approvals.",
    tier: "primary",
  },
  {
    key: "resolve",
    href: "/answer",
    label: "Resolve",
    navLabel: "Resolve",
    description: "Find the right answer or tool for one remaining question.",
    boundary: "Use this page when the brief is clear but one question still needs an answer.",
    tier: "primary",
  },
  {
    key: "trust",
    href: "/trust",
    label: "Trust",
    navLabel: "Trust",
    description: "Check freshness, confidence, source coverage, and what would change the brief.",
    boundary: "Use this when you want to sanity-check the brief before a big decision.",
    tier: "primary",
  },
  {
    key: "history",
    href: "/history",
    label: "History",
    navLabel: "History",
    description: "See how tightness and risk appetite have changed over time.",
    boundary: "Use this to spot regime transitions and compare current conditions to past periods.",
    tier: "supporting",
    parentKey: "signals",
  },
  {
    key: "compare",
    href: "/history/compare",
    label: "Compare Epochs",
    navLabel: "Compare",
    description: "Compare side-by-side macro signal diffs across historical epochs.",
    boundary: "Use this to contrast the current posture with previous periods.",
    tier: "supporting",
    parentKey: "history",
  },
] as const;

export const primaryNavigationLayers = navigationLayers.filter((layer) => layer.tier === "primary");

// Routes that render the condensed report shell header. Supporting layers are
// nested under primary hrefs, so listing every layer href is safe and keeps
// this in lockstep with the IA.
export const reportShellPaths: Route[] = navigationLayers.map((layer) => layer.href);

export const navigationLayerByKey = navigationLayers.reduce<Record<NavigationLayerKey, NavigationLayer>>((acc, layer) => {
  acc[layer.key] = layer;
  return acc;
}, {} as Record<NavigationLayerKey, NavigationLayer>);

export const navigationLabelByPath = navigationLayers.reduce<Record<string, string>>((acc, layer) => {
  acc[layer.href] = layer.label;
  return acc;
}, {});

/**
 * Utility links — framework, template, API docs, about.
 * These sit outside the operator loop. Single source for mobile sheet, footer, header dropdown.
 */
export const utilityLinks = [
  {
    href: "/threshold",
    label: "Framework",
    description: "Thresholds, vocabulary, reversal logic",
  },
  {
    href: "/template",
    label: "Template",
    description: "Blank bounded-decision form",
  },
  {
    href: "/api-docs",
    label: "API Docs",
    description: "Integration reference",
  },
  {
    href: "/about",
    label: "About",
    description: "Product philosophy & team",
  },
] as const;

export type UtilityLink = typeof utilityLinks[number];
