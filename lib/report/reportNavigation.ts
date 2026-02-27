import type { ReportPageLink } from "../../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/",
    label: "Command Center",
    description: "Weekly posture and immediate decision call.",
  },
  {
    href: "/decide",
    label: "Decide",
    description: "Assess live signals, posture confidence, and near-term action choices.",
  },
  {
    href: "/plan",
    label: "Plan",
    description: "Convert the current posture into execution plans and role-based workflows.",
  },
  {
    href: "/learn",
    label: "Learn",
    description: "Reference toolkits, concepts, and diagnostics that support execution.",
  },
  {
    href: "/method",
    label: "Method",
    description: "Inspect methodology, formulas, sources, and trust framing.",
  },
];
