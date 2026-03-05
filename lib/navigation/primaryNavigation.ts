import type { Route } from "next";

export type PrimaryNavigationItem = {
  href: Route;
  label: string;
  description: string;
};

export const primaryNavigation: PrimaryNavigationItem[] = [
  {
    href: "/",
    label: "This Week",
    description: "Live operating posture call, constraints, and immediate actions.",
  },
  {
    href: "/start",
    label: "Start",
    description: "Run the guided weekly sequence: posture, situation, and toolkit.",
  },
  {
    href: "/operations",
    label: "Operate",
    description: "Translate posture into planning, integrations, and operator actions.",
  },
  {
    href: "/signals",
    label: "Evidence",
    description: "Inspect the data behind the call, including thresholds and timing.",
  },
  {
    href: "/toolkits",
    label: "Templates",
    description: "Runnable toolkits and checklists for recurring operating decisions.",
  },
  {
    href: "/reference",
    label: "Reference",
    description: "Canonical methods, formulas, sources, and learning pathways.",
  },
];
