import type { ReportPageLink } from "../../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/",
    label: "Weekly briefing",
    description: "Weekly decisions, leadership summary, and climate signals in plain English.",
  },
  {
    href: "/onboarding",
    label: "Onboarding & glossary",
    description: "Start here for the quick guide and plain-English glossary.",
  },
  {
    href: "/operations",
    label: "Action playbook",
    description: "Execution-ready moves, decision guardrails, and briefing kits.",
  },
  {
    href: "/signals",
    label: "Signal evidence",
    description: "Live data sources, thresholds, and historical context.",
  },
  {
    href: "/formulas",
    label: "Methodology",
    description: "Plain-English formulas and source links for each signal.",
  },
];
