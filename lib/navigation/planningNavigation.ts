import type { Route } from "./routeType";
import type { ReportSectionLink } from "../../app/components/reportShellNavigation";

export type OperationsWorkstreamLink = {
  href: Route;
  label: string;
  description: string;
};

export const operationsWorkstreamLinks: OperationsWorkstreamLink[] = [
  {
    href: "/operate",
    label: "Weekly plan",
    description: "Default: review the weekly plan before you change team pace, spend, or priorities.",
  },
  {
    href: "/planning/financial",
    label: "Financial strategy",
    description: "CFO runway planning, burn adjustments, and budget planning board memo exporter.",
  },
  {
    href: "/planning/memory",
    label: "Decision memory",
    description: "Immutable timeline registry of committed posture overrides and audit checks.",
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
