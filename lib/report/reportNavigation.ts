import type { ReportPageLink } from "../../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/start",
    label: "Command Center",
    description: "Posture-first onboarding and situation routing.",
  },
  {
    href: "/signals",
    label: "Signals",
    description: "Live macro inputs, thresholds, and confidence context.",
  },
  {
    href: "/operations",
    label: "Operations",
    description: "Execution playbooks and operational guardrails by posture.",
  },
  {
    href: "/decide",
    label: "Decide",
    description: "Curated role and situation entry points into operational guidance.",
  },
  {
    href: "/plan",
    label: "Plan",
    description: "Runnable instruments and templates by decision surface.",
  },
  {
    href: "/learn",
    label: "Learn",
    description: "Failure modes diagnostics and canon depth.",
  },
  {
    href: "/method",
    label: "Method",
    description: "How the model works, what sources power it, and where to get help.",
  },
];
