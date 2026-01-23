import type { ReportPageLink } from "../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/",
    label: "Weekly briefing",
    description: "Weekly decisions, leadership summary, and climate signals in plain English.",
  },
  {
    href: "/onboarding",
    label: "Onboarding",
    description: "Get oriented with the glossary and a quick guide to reading the report.",
  },
  {
    href: "/signals",
    label: "Why we believe this",
    description: "See the data sources and how each signal is scored.",
  },
  {
    href: "/operations",
    label: "What to do next",
    description: "Concrete actions and decision safeguards for your team.",
  },
  {
    href: "/formulas",
    label: "Sensor formulas",
    description: "Plain-English methods and source links for each signal.",
  },
];
