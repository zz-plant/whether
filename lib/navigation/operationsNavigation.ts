import type { Route } from "next";
import type { ReportSectionLink } from "../../app/components/reportShellNavigation";

export type OperationsWorkstreamLink = {
  href: Route;
  label: string;
  description: string;
};

export const operationsWorkstreamLinks: OperationsWorkstreamLink[] = [
  {
    href: "/operations",
    label: "Plan",
    description: "Translate the regime into quarterly posture, playbook moves, and operator asks.",
  },
  {
    href: "/operations/integrations" as Route,
    label: "Integrations",
    description: "Optional handoff: push approved weekly mandate payloads into Slack, Notion, and Linear.",
  },

  {
    href: "/operations/data",
    label: "Data",
    description: "Optional handoff: share API guidance and data references with automation owners.",
  },
  {
    href: "/operations/cli",
    label: "CLI",
    description: "Run status, changes, history, and scenario checks directly from the terminal.",
  },
];

export const operationsSectionLinks: { plan: ReportSectionLink[] } = {
  plan: [
    { href: "#ops-monthly-action-summary", label: "Monthly summary" },
    { href: "#ops-playbook", label: "Playbook" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-export-briefs", label: "Export briefs" },
    { href: "#ops-operator-requests", label: "Operator requests" },
  ],
};
