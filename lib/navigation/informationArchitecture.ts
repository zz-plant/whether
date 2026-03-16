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
  },
  {
    key: "signals",
    href: "/signals",
    label: "Signals",
    description: "Deep evidence appendix for drivers, thresholds, and freshness behind the weekly brief.",
    boundary: "Evidence depth only; the canonical weekly workflow lives on Weekly Brief.",
    group: "workflow",
  },
  {
    key: "operations",
    href: "/operations",
    label: "Operations",
    description: "Detailed execution guardrails once the weekly plan needs deeper review.",
    boundary: "Execution depth only; Weekly Brief remains the canonical orchestration surface.",
    group: "workflow",
  },
  {
    key: "decide",
    href: "/decide",
    label: "Decide",
    description: "Direct role, situation, and toolkit shortcuts after the weekly call is set.",
    boundary: "Decision translation depth only; do not duplicate the home workspace.",
    group: "workflow",
  },
  {
    key: "toolkits",
    href: "/toolkits",
    label: "Toolkits",
    description: "Run templates after the weekly call and guardrails are set.",
    boundary: "Runnable instruments only; no duplicate posture logic or evidence summaries.",
    group: "workflow",
  },
  {
    key: "learn",
    href: "/learn",
    label: "Learn",
    description: "Background concepts and failure modes for optional operator education.",
    boundary: "Reference-only surface; never the canonical workflow or trust path.",
    group: "reference",
  },
  {
    key: "method",
    href: "/method",
    label: "Method",
    description: "Audit trust, sources, formulas, and confidence without leaving the weekly loop.",
    boundary: "Transparency surfaces only.",
    group: "reference",
  },
] as const;

export const navigationLabelByPath = navigationLayers.reduce<Record<string, string>>((acc, layer) => {
  acc[layer.href] = layer.label;
  return acc;
}, {});
