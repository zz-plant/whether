import type { ReportPageLink } from "../../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/",
    label: "Current Climate",
    description: "Verdict and immediate decision call for the current planning cycle.",
  },
  {
    href: "/operations",
    label: "Playbook",
    description: "Guardrails, sequencing, and execution trade-offs for the active posture.",
  },
  {
    href: "/signals",
    label: "Signals",
    description: "Evidence and raw diagnostics behind the posture call.",
  },
  {
    href: "/methodology",
    label: "Method",
    description: "Model logic and formulas only, with source-linked definitions.",
  },
  {
    href: "/guides",
    label: "Teams",
    description: "Apply the posture by role without fragmenting the operating model.",
  },
];
