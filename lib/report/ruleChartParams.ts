/**
 * Where the homepage's conditions chart keeps its state: the URL (UI standards §V), so a
 * link copied with Fundraising's lines shaded, or the left-out inputs counted, opens on the
 * same picture.
 *
 * Its own keys rather than the decision picker's `?decision=`: the picker opens an area's
 * detail and remembers it in a cookie, and two islands writing one key without hearing each
 * other would leave the URL naming an area one of them no longer shows. Kept apart from
 * `ruleRegions.ts`, which judges readings, so the chart's island does not ship that module.
 */
import { isDecisionArea, type DecisionArea } from "./boundedDecisionRules";

/** The area whose pause and restart regions the chart shades: `/?rule=capital-raising`. */
export const RULE_CHART_AREA_PARAM = "rule";
/** The left-out startup-market inputs counted on the chart: `/?counted=1`. */
export const RULE_CHART_COUNTED_PARAM = "counted";
/** The chart's section, where a link to a state of the chart lands. */
const RULE_CHART_SECTION = "what-would-change";

export const parseRuleChartArea = (value: string | undefined): DecisionArea | undefined =>
  value !== undefined && isDecisionArea(value) ? value : undefined;

export const parseRuleChartCounted = (value: string | undefined) => value === "1";

type PageQuery = Record<string, string | undefined> | undefined;

/**
 * A link to one state of the chart, keeping the rest of the page's query (its horizon, a
 * month) so the reader lands on the same brief. `area` null is the chart's default, which
 * carries no key. The chart's own chooser and switch are these links, so each works
 * without script and copies as the picture it shows.
 */
export const buildRuleChartHref = (query: PageQuery, next: { area: DecisionArea | null; counted: boolean }) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && key !== RULE_CHART_AREA_PARAM && key !== RULE_CHART_COUNTED_PARAM) params.set(key, value);
  }
  if (next.area) params.set(RULE_CHART_AREA_PARAM, next.area);
  if (next.counted) params.set(RULE_CHART_COUNTED_PARAM, "1");
  const search = params.toString();
  return `/${search ? `?${search}` : ""}#${RULE_CHART_SECTION}`;
};

/** The chart with the left-out inputs counted, on the area the page shows. */
export const buildCountedChartHref = (query: PageQuery) =>
  buildRuleChartHref(query, { area: parseRuleChartArea(query?.[RULE_CHART_AREA_PARAM]) ?? null, counted: true });
