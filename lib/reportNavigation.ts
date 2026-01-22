import type { ReportPageLink } from "../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/",
    label: "Quick start",
    description: "What to do this week, plus the current climate in plain English.",
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
