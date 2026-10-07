import type { ActionStripItem } from "../../lib/report/operatingCalls";
import { formatPointsToLine } from "../../lib/report/operatingCalls";
import { operatingLeverToDecisionArea } from "../../lib/report/businessAreaMap";
import type { DecisionArea, RuleCondition, RuleConditionMetric } from "../../lib/report/boundedDecisionRules";
import type { Route } from "../../lib/navigation/routeType";
import { findLeadAnswerForArea } from "../answers/decisionPages";

/**
 * The action strip as area rows, in the shape `AreaTable` draws.
 *
 * Built once here for both surfaces that tabulate the five areas — the plan
 * page's weekly plan and the guardrail tags on /share — so the rule, the pause
 * line and its distance, and the resume line and its distance are the same
 * strings on both, and the /share table can be handed to a client component
 * as plain text. The lines come from the rule's own condition data
 * (`pauseConditions` / `resumeConditions`), never re-parsed from the sentence;
 * a rule with no numeric line prints its sentence in the slot instead.
 *
 * Plain strings on purpose: a row is assignable to `AreaRowData` as it is, and
 * a client component takes the type alone — this module reads the answer
 * pages for the row links, which must not follow it into a client bundle.
 */
export type AreaRowText = {
  area: DecisionArea;
  rule: string;
  pause?: { line: string; distance?: string };
  resume?: { line: string; distance?: string };
  /** The scores the printed lines are drawn on. */
  scores?: RuleConditionMetric[];
  href?: Route;
};

/* The page a searcher lands on for this area's question. There is no per-area
   toolkit; the answer page is the surface that opens with the area's own
   reading. The same selector as the homepage's first-visit picker: this took
   the first page of any category whose primary area matched, so the order of
   `content/answers/pages.json` decided it, and raising money and expansion
   linked the climate reads here while the homepage linked the decision
   answers. */
const answerHrefForArea = (area: DecisionArea): Route | undefined => {
  const page = findLeadAnswerForArea(area);
  return page ? `/answers/${page.slug}` : undefined;
};

const joinConditions = (conditions: readonly RuleCondition[], join: "or" | "and", qualifier?: string) => {
  const parts = conditions.map((condition) => condition.label);
  if (qualifier) parts.push(qualifier);
  return parts.join(` ${join} `);
};

const distanceTo = (nearest: ActionStripItem["nearestPause"], kind: "pause" | "resume") =>
  nearest ? formatPointsToLine(nearest.pointsToLine, kind, nearest.satisfied) : undefined;

export const buildAreaRows = (items: readonly ActionStripItem[]): AreaRowText[] =>
  items.map((item) => {
    const area = operatingLeverToDecisionArea[item.lever];
    const pauseConditions = item.pauseConditions ?? [];
    const resumeConditions = item.resumeConditions ?? [];
    return {
      area,
      rule: item.areaActionNow,
      pause: {
        line: pauseConditions.length > 0 ? joinConditions(pauseConditions, "or", item.pauseQualifier) : item.triggerThreshold,
        distance: pauseConditions.length > 0 ? distanceTo(item.nearestPause, "pause") : undefined,
      },
      resume: {
        line: resumeConditions.length > 0 ? joinConditions(resumeConditions, "and", item.resumeQualifier) : item.reversalCondition,
        distance: resumeConditions.length > 0 ? distanceTo(item.bindingResume, "resume") : undefined,
      },
      scores: [...pauseConditions, ...resumeConditions].map((condition) => condition.metric),
      href: answerHrefForArea(area),
    };
  });
