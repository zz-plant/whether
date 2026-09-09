import type { Route } from "./routeType";
import type { ReportSectionLink } from "../../app/components/reportShellNavigation";

export type OperationsWorkstreamLink = {
  href: Route;
  label: string;
  description: string;
};

// No decision-memory link: the record the product keeps without asking is the
// call itself, on /history.
export const operationsWorkstreamLinks: OperationsWorkstreamLink[] = [
  {
    href: "/operate",
    label: "Weekly plan",
    description: "Default: review the weekly plan before you change team pace, spend, or priorities.",
  },
  {
    href: "/operate/financial",
    label: "Financial strategy",
    description: "CFO runway planning, burn adjustments, and budget planning board memo exporter.",
  },
  {
    href: "/operate/scenarios",
    label: "Scenario studio",
    description: "Interactive counterfactual simulation: test rate cuts, inversions, and stress scenarios.",
  },
];

export const operationsSectionLinks: { plan: ReportSectionLink[] } = {
  plan: [
    { href: "#ops-monthly-action-summary", label: "Start here" },
    { href: "#ops-failure-patterns", label: "Risk checks" },
    { href: "#ops-playbook", label: "Guardrails" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-export-briefs", label: "Share brief" },
    { href: "#ops-operator-requests", label: "Operator requests" },
  ],
};
