import type { ReportPageLink } from "../../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/",
    label: "Current Climate",
    description: "Canonical operating posture for the current planning cycle.",
  },
  {
    href: "/operations",
    label: "Playbook",
    description: "Translate posture into hiring, spend, and execution guardrails.",
  },
  {
    href: "/signals",
    label: "Signals",
    description: "Inspect drivers, thresholds, and timestamps behind the posture call.",
  },
  {
    href: "/methodology",
    label: "Method",
    description: "Audit plain-English formulas, source links, and refresh cadence.",
  },
  {
    href: "/guides",
    label: "Teams",
    description: "Apply the posture by role without fragmenting the operating model.",
  },
];
