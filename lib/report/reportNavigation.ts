import type { ReportPageLink } from "../../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/start",
    label: "Start Here",
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
    href: "/use-cases",
    label: "Use Cases",
    description: "Curated role and situation entry points into operational guidance.",
  },
  {
    href: "/toolkits",
    label: "Toolkits",
    description: "Runnable instruments and templates by decision surface.",
  },
  {
    href: "/library",
    label: "Library",
    description: "Failure modes diagnostics and canon depth.",
  },
  {
    href: "/about",
    label: "About",
    description: "Method, trust context, and contact surfaces.",
  },
];
