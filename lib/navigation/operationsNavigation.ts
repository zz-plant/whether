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
    href: "/operations/briefings",
    label: "Briefings",
    description: "Export aligned narratives, leadership briefs, and CXO-ready deliverables.",
  },
  {
    href: "/operations/integrations" as Route,
    label: "Integrations",
    description: "Push weekly mandate payloads into Slack, Notion, and Linear.",
  },

  {
    href: "/operations/data",
    label: "Data",
    description: "Access weekly API usage guidance and handoff references for operators.",
  },
];

export const operationsSectionLinks: Record<string, ReportSectionLink[]> = {
  overview: [
    { href: "#ops-monthly-action-summary", label: "Monthly summary" },
    { href: "#ops-horizon-plan", label: "Horizon plan" },
  ],
  plan: [
    { href: "#ops-monthly-action-summary", label: "Monthly summary" },
    { href: "#ops-playbook", label: "Playbook" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-insight-database", label: "Insight database" },
    { href: "#ops-export-briefs", label: "Export briefs" },
    { href: "#ops-operator-requests", label: "Operator requests" },
  ],
  decisions: [
    { href: "#ops-decisions-availability", label: "Availability" },
    { href: "#ops-decision-templates", label: "Decision templates" },
  ],
  briefings: [
    { href: "#ops-strategy-brief", label: "Strategy brief" },
    { href: "#ops-export-briefs", label: "Export briefs" },
    { href: "#ops-executive-briefing", label: "Executive briefing" },
    { href: "#ops-cxo-functions", label: "CXO outputs" },
  ],
};
