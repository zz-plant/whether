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
    label: "Weekly Brief",
    description: "Posture call and constraints snapshot for this week.",
    staticHub: false,
  },
  {
    href: "/start",
    label: "Start Here",
    description: "Default starting point for this week’s posture, situation, and next action.",
  },
  {
    href: "/decide",
    label: "Role Guides",
    description: "Role-based guidance for founder, product, finance, and strategy decisions.",
  },
  {
    href: "/operations",
    label: "Playbook",
    description: "Operating guardrails for hiring, spend, and pacing.",
  },
  {
    href: "/signals",
    label: "Signals",
    description: "The numbers behind the call (with timestamps + thresholds).",
  },
  {
    href: "/toolkits",
    label: "Templates",
    description: "Runnable templates, instruments, and checklists for operating decisions.",
  },
  {
    href: "/method",
    label: "How it works",
    description: "How the system works: formulas, sources, cadence, and limitations.",
  },
  {
    href: "/learn",
    label: "Concepts",
    description: "Concepts, failure modes, and diagnostic references for decision quality.",
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
