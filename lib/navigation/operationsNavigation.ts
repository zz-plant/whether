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
  },
  {
    href: "/operations/briefings",
    label: "Briefings",
    description: "Export aligned narratives, leadership briefs, and CXO-ready deliverables.",
  },
];

export const operationsSectionLinks: Record<string, ReportSectionLink[]> = {
  overview: [
    { href: "#ops-monthly-action-summary", label: "Step 1: Monthly summary" },
    { href: "#ops-workstreams", label: "Step 2: Workstreams" },
  ],
  plan: [
    { href: "#ops-monthly-action-summary", label: "Monthly summary" },
    { href: "#ops-playbook", label: "Playbook" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-insight-database", label: "Insight database" },
    { href: "#ops-operator-requests", label: "Operator requests" },
  ],
  decisions: [
    { href: "#ops-decision-shield", label: "Decision shield" },
    { href: "#ops-assumption-locking", label: "Assumption locking" },
    { href: "#ops-decision-memory", label: "Decision memory" },
    { href: "#ops-decision-shield-templates", label: "Decision templates" },
    { href: "#ops-counterfactuals", label: "Counterfactual view" },
  ],
  briefings: [
    { href: "#ops-strategy-brief", label: "Strategy brief" },
    { href: "#ops-export-briefs", label: "Export briefs" },
    { href: "#ops-executive-briefing", label: "Executive briefing" },
    { href: "#ops-cxo-functions", label: "CXO outputs" },
  ],
};
