import type { Route } from "./routeType";
import type { ReportSectionLink } from "../../app/components/reportShellNavigation";

export type OperationsWorkstreamLink = {
  href: Route;
  label: string;
  description: string;
};

export const operationsWorkstreamLinks: OperationsWorkstreamLink[] = [
  {
    href: "/operations",
    label: "Weekly plan",
    description: "Default: review the weekly plan before you change team pace, spend, or priorities.",
  },
  {
    href: "/operations/integrations" as Route,
    label: "Send to tools",
    description: "Optional: push the approved brief into Slack, Notion, and Linear.",
  },

  {
    href: "/operations/data",
    label: "Data/API",
    description: "Optional: share payloads, endpoints, and references with automation owners.",
  },
  {
    href: "/operations/cli",
    label: "Terminal",
    description: "Optional: inspect status, changes, history, and scenarios from the command line.",
  },
];

export const operationsSectionLinks: { plan: ReportSectionLink[] } = {
  plan: [
    { href: "#ops-monthly-action-summary", label: "Start here" },
    { href: "#ops-playbook", label: "Guardrails" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-export-briefs", label: "Share brief" },
    { href: "#ops-operator-requests", label: "Operator requests" },
  ],
};
