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
];

export const operationsDeveloperReferenceLinks = [
  {
    href: "https://github.com/zz-plant/whether/blob/main/docs/developer/api-reference.md",
    label: "API reference",
    description: "Endpoint contracts and payload shapes for machine consumers.",
  },
  {
    href: "https://github.com/zz-plant/whether/blob/main/docs/developer/cli-fallback.md",
    label: "CLI fallback guide",
    description: "Terminal workflows and fallback expectations for operator handoffs.",
  },
  {
    href: "https://github.com/zz-plant/whether/blob/main/docs/developer/integrations.md",
    label: "Integrations guide",
    description: "Slack, Notion, and Linear integration usage for weekly brief distribution.",
  },
] as const;

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
