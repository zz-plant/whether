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
    description: "Live inputs, thresholds, and regime diagnostics.",
  },
  {
    href: "/operations",
    label: "Operations",
    description: "Action playbooks, briefs, and decision workflows.",
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
