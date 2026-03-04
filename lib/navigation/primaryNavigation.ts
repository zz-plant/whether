import type { Route } from "next";

export type PrimaryNavigationItem = {
  href: Route;
  label: string;
  description: string;
  staticHub?: boolean;
};

export const primaryNavigation: PrimaryNavigationItem[] = [
  {
    href: "/",
    label: "Weekly Capital Posture Brief",
    description: "Weekly governance artifact: posture call, constraints, and top actions.",
  },
  {
    href: "/signals",
    label: "Evidence",
    description: "Evidence appendix for the weekly brief: diagnostics, thresholds, and timestamps.",
  },
  {
    href: "/operations",
    label: "Operations",
    description: "Deep playbook guardrails for hiring, spend, and pacing.",
  },
  {
    href: "/resources",
    label: "Resources",
    description: "Board-facing SEO pillars, governance templates, and Decision Shield overview.",
  },
  {
    href: "/learn",
    label: "Reference",
    description: "Reference library: toolkits, diagnostics, and methodology.",
  },
];
