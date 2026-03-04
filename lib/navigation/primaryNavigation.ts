import type { Route } from "next";

export type PrimaryNavigationItem = {
  href: Route;
  label: string;
  description: string;
  staticHub?: boolean;
};

export const primaryNavigation: PrimaryNavigationItem[] = [
  {
    href: "/start",
    label: "Command Center",
    description: "Default start path: posture, situation, and toolkit sequence.",
  },
  {
    href: "/signals",
    label: "Signals",
    description: "Evidence layer with thresholds, timestamps, and historical context.",
  },
  {
    href: "/operations",
    label: "Operations",
    description: "Deep playbook guardrails for hiring, spend, and pacing.",
  },
  {
    href: "/decide",
    label: "Decide",
    description: "Role-based translation for founder, product, finance, and strategy decisions.",
  },
  {
    href: "/toolkits",
    label: "Toolkits",
    description: "Runnable instruments, templates, and checklists for operating decisions.",
  },
  {
    href: "/learn",
    label: "Learn",
    description: "Diagnostic and conceptual references for decision quality.",
  },
  {
    href: "/method",
    label: "Method",
    description: "Transparency layer for formulas, sources, cadence, and limitations.",
  },
  {
    href: "/",
    label: "Weekly Brief",
    description: "Posture call and constraints snapshot for this week.",
    staticHub: false,
  },
  {
    href: "/resources",
    label: "Resources",
    description: "Board-facing templates and case examples.",
    staticHub: false,
  },
  {
    href: "/reference",
    label: "Reference",
    description: "Canonical methods and diagnostics archive.",
    staticHub: false,
  },
];
