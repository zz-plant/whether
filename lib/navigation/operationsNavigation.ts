import type { Route } from "next";
import type { ReportSectionLink } from "../../app/components/reportShellNavigation";

export type OperationsWorkstreamLink = {
  href: Route;
  label: string;
  description: string;
  availability?: "available" | "coming-soon";
  tier?: "standard" | "premium";
};

export const operationsWorkstreamLinks: OperationsWorkstreamLink[] = [
  {
    href: "/operations",
    label: "Overview",
    description: "Get the monthly action summary and choose a focused workstream.",
  },
  {
    href: "/operations/plan",
    label: "Plan",
    description: "Translate the regime into quarterly posture, playbook moves, and operator asks.",
  },
  {
    href: "/operations/decisions",
    label: "Decisions",
    description: "Lock assumptions, validate guardrails, and pressure-test bets before committing.",
    availability: "coming-soon",
    tier: "premium",
  },
  {
    href: "/operations/briefings",
    label: "Briefings",
    description: "Export aligned narratives, leadership briefs, and CXO-ready deliverables.",
  },
];

export const operationsSectionLinks: Record<string, ReportSectionLink[]> = {
  overview: [
    { href: "#ops-monthly-action-summary", label: "Monthly summary" },
    { href: "#ops-workstreams", label: "Workstreams" },
  ],
  plan: [
    { href: "#ops-monthly-action-summary", label: "Monthly summary" },
    { href: "#ops-playbook", label: "Playbook" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-insight-database", label: "Insight database" },
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
