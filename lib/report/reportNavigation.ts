import type { ReportPageLink } from "../../app/components/reportShellNavigation";

export const reportPageLinks: ReportPageLink[] = [
  {
    href: "/",
    label: "Decide",
    description: "Confirm this week's posture and immediate cross-functional actions.",
  },
  {
    href: "/operations/plan",
    label: "Plan",
    description: "Assign owners and sequence work by Now, Next, and Watch horizons.",
  },
  {
    href: "/signals",
    label: "Evidence",
    description: "Validate confidence with thresholds, timelines, and source provenance.",
  },
  {
    href: "/operations/briefings",
    label: "Brief",
    description: "Prepare copy-ready narratives in Briefings for leadership and team alignment.",
  },
  {
    href: "/methodology",
    label: "Methodology",
    description: "Plain-English formulas and source links for each signal.",
  },
];
