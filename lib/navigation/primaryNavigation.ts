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
    description: "Posture-first onboarding and situation routing.",
  },
  {
    href: "/signals",
    label: "Signals",
    description: "Live macro inputs, thresholds, and confidence context.",
    staticHub: false,
  },
  {
    href: "/operations",
    label: "Operations",
    description: "Execution playbooks and operational guardrails by posture.",
    staticHub: false,
  },
  {
    href: "/decide",
    label: "Role Lenses",
    description: "Role-specific decision lenses and situation references.",
    staticHub: false,
  },
  {
    href: "/toolkits",
    label: "Toolkits",
    description: "Runnable instruments and templates by decision surface.",
    staticHub: false,
  },
  {
    href: "/learn",
    label: "Learn",
    description: "Failure modes diagnostics and canon depth.",
  },
  {
    href: "/method",
    label: "Method",
    description: "How the model works, what sources power it, and where to get help.",
  },
];
