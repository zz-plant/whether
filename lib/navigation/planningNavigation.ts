import type { Route } from "./routeType";
import type { ReportSectionLink } from "../../app/components/reportShellNavigation";

export type OperationsWorkstreamLink = {
  href: Route;
  label: string;
  description: string;
};

// No decision-memory link: the record the product keeps without asking is the
// call itself, on /history.
export const operationsWorkstreamLinks: OperationsWorkstreamLink[] = [
  {
    href: "/operate",
    label: "Weekly plan",
    description: "Default: review the weekly plan before you change team pace, spend, or priorities.",
  },
  {
    href: "/operate/financial",
    label: "Runway planner",
    description: "CFO runway planning, burn adjustments, and budget planning board memo exporter.",
  },
  {
    href: "/operate/scenarios",
    label: "Scenarios",
    description: "Interactive counterfactual simulation: test rate cuts, inversions, and stress scenarios.",
  },
];

export const operationsSectionLinks: {
  plan: ReportSectionLink[];
  financial: ReportSectionLink[];
  scenarios: ReportSectionLink[];
} = {
  // One index for the page, in page order, under the names the sections use.
  // /operate used to carry three: this list (six labels in a different order,
  // two of them naming panels inside other steps and none naming the Test
  // step), the stepper's own sticky chip row, and a card grid at the tail.
  plan: [
    { href: "#ops-monthly-action-summary", label: "Weekly plan" },
    { href: "#ops-export-briefs", label: "Share the brief" },
    { href: "#ops-playbook", label: "Rules before you commit" },
    { href: "#ops-plan-lines", label: "Set this plan's lines" },
    { href: "#ops-decision-shield", label: "Test a decision" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-failure-patterns", label: "Risk checks" },
  ],
  financial: [
    { href: "#ops-runway-inputs", label: "Financial inputs" },
    { href: "#ops-runway-risk", label: "Runway analysis" },
    /* No "Board memo" chip. That section is behind a toggle inside the results,
       so the anchor exists only after two separate user actions — a nav target
       that does nothing on most visits is worse than one fewer chip, and the
       memo is reachable from the control that opens it. */
  ],
  scenarios: [
    { href: "#scenario-presets-heading", label: "Presets" },
    { href: "#sliders-controls-heading", label: "Simulation controls" },
    { href: "#deltas-heading", label: "Score deltas" },
    { href: "#playbook-deltas-heading", label: "Playbook deltas" },
  ],
};
