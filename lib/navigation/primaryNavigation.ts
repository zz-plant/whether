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
    label: "Command Center",
    description: "Start the weekly sequence: posture, situation, and next-step toolkit.",
  },
  {
    href: "/signals",
    label: "Signals",
    description: "Inspect the evidence behind the posture call and confidence shifts.",
  },
  {
    href: "/operations",
    label: "Operations",
    description: "Apply operating guardrails to planning, cadence, and team execution.",
  },
  {
    href: "/decide",
    label: "Decide",
    description: "Translate guidance by role and situation before committing.",
  },
  {
    href: "/toolkits",
    label: "Toolkits",
    description: "Run decision templates and checklists for recurring operating choices.",
  },
  {
    href: "/learn",
    label: "Learn",
    description: "Use diagnostic references and concepts to sharpen interpretation.",
  },
  {
    href: "/method",
    label: "Method",
    description: "Review formulas, source coverage, and model transparency surfaces.",
  },
];
