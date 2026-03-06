import type { Route } from "next";

export type NavigationLayerKey =
  | "weekly-brief"
  | "command-center"
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

export const navigationLayers: NavigationLayer[] = [
  {
    key: "weekly-brief",
    href: "/",
    label: "Weekly Brief",
    description: "Live posture call, confidence, and immediate operator actions.",
    boundary: "Outcome snapshot only; detailed evidence and playbooks live in downstream hubs.",
    group: "core",
  },
  {
    key: "command-center",
    href: "/start",
    label: "Command Center",
    description: "Run the weekly sequence: posture, situation, and next-step toolkit.",
    boundary: "Posture call plus weekly sequence only; no deep evidence or methodology narratives.",
    group: "workflow",
  },
  {
    key: "signals",
    href: "/signals",
    label: "Signals",
    description: "Inspect drivers, thresholds, and historical signal context.",
    boundary: "Evidence only; avoid prescribing operating policy.",
    group: "workflow",
  },
  {
    key: "operations",
    href: "/operations",
    label: "Operations",
    description: "Apply hiring, spend, and cadence guardrails to execution.",
    boundary: "Operating guardrails only; do not restate evidence narrative.",
    group: "workflow",
  },
  {
    key: "decide",
    href: "/decide",
    label: "Decide",
    description: "Translate posture guidance into role-specific choices.",
    boundary: "Role translation only; do not duplicate command or evidence layers.",
    group: "workflow",
  },
  {
    key: "toolkits",
    href: "/toolkits",
    label: "Toolkits",
    description: "Run templates and checklists for recurring decision workflows.",
    boundary: "Runnable instruments only; no duplicate posture logic or evidence summaries.",
    group: "workflow",
  },
  {
    key: "learn",
    href: "/learn",
    label: "Learn",
    description: "Use failure modes and concept references for operator education.",
    boundary: "Diagnostic and conceptual references only; no new canonical guidance.",
    group: "reference",
  },
  {
    key: "method",
    href: "/method",
    label: "Method",
    description: "Review formulas, sources, cadence, and confidence limits.",
    boundary: "Transparency surfaces only.",
    group: "reference",
  },
] as const;

export const navigationLabelByPath = navigationLayers.reduce<Record<string, string>>((acc, layer) => {
  acc[layer.href] = layer.label;
  return acc;
}, {});
