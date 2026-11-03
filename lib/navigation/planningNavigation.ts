import type { ReportSectionLink } from "../../app/components/reportShellNavigation";
import { isDecisionArea, type DecisionArea } from "../report/boundedDecisionRules";

/*
 * "Email me when they restart" (2026-11-03): a link from a group of held areas on `/` to
 * the plan-lines form, with only those areas ticked (`?watch=hiring,capital-raising`).
 * The form starts with every area ticked; a reader who came for one restart would
 * otherwise sign up for five areas' emails without meaning to.
 */
const PLAN_LINES_WATCH_PARAM = "watch";

export const buildPlanLinesWatchHref = (areas: readonly DecisionArea[]) =>
  `/operate?${PLAN_LINES_WATCH_PARAM}=${areas.join(",")}#ops-plan-lines`;

/** The areas a `?watch=` names, in its order; empty when it names none. */
export const parsePlanLinesWatch = (params: Record<string, string | undefined> | undefined): DecisionArea[] =>
  [...new Set((params?.[PLAN_LINES_WATCH_PARAM] ?? "").split(","))].filter(isDecisionArea);

export const operationsSectionLinks: {
  plan: ReportSectionLink[];
  financial: ReportSectionLink[];
  scenarios: ReportSectionLink[];
} = {
  // One index for the page, in page order, under the names the sections use.
  // /operate used to carry three: this list (six labels in a different order,
  // two of them naming panels inside other steps and none naming the Test
  // step), the stepper's own sticky chip row, and a card grid at the tail.
  // Rules first since 2026-10-07: the area table, the do/don't lists, then the
  // test that checks a move against them.
  plan: [
    { href: "#ops-monthly-action-summary", label: "Rule for each area" },
    { href: "#ops-playbook", label: "Rules before you commit" },
    { href: "#ops-decision-shield", label: "Test a decision" },
    { href: "#ops-plan-lines", label: "Set your own rules" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-failure-patterns", label: "Warnings before you approve" },
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
    { href: "#sliders-controls-heading", label: "Set the rates" },
    { href: "#deltas-heading", label: "Compared with this week" },
    { href: "#playbook-deltas-heading", label: "What you'd stop and start" },
  ],
};
