/**
 * Where the homepage's conditions chart keeps its state: the URL (UI standards §V), so a
 * link copied with Fundraising's lines shaded, the left-out inputs counted, or the reading
 * after two Fed cuts opens on the same picture.
 *
 * Two keys. The area is the brief's own `?decision=` (2026-11-18), the key the decision
 * picker reads and a cookie remembers, so choosing an area on the chart and in the picker
 * is one choice; `?rule=`, the chart's own key until then, still opens its area. Which
 * reading the chart plots is `?reading=`: `counted`, `cut-1` to `cut-3` or `hike-1`, with
 * `?counted=1` kept as the old name for `counted`. Kept apart from `ruleRegions.ts`, which
 * judges readings, so the chart's island does not ship that module.
 */
import { decisionAreaLabel, isDecisionArea, type DecisionArea } from "./boundedDecisionRules";
import { HOME_DECISION_PARAM, parseHomeDecision } from "./home/homeSectionModel";

/** The chart's area key until 2026-11-18, read as an alias of `?decision=`: `/?rule=capital-raising`. */
export const RULE_CHART_AREA_PARAM = "rule";
/** The chart's area key: the brief's decision. */
export const RULE_CHART_DECISION_PARAM = HOME_DECISION_PARAM;
/** Which reading the chart plots: `/?reading=cut-2`. */
export const RULE_CHART_READING_PARAM = "reading";
/** The left-out startup-market inputs counted, before `?reading=` held it: `/?counted=1`. */
export const RULE_CHART_COUNTED_PARAM = "counted";
/** The chart's section, where a link to a state of the chart lands. */
const RULE_CHART_SECTION = "what-would-change";

/** The readings the chart can plot besides this week's, in the order the choices print. */
const RULE_CHART_READING_KEYS = ["counted", "cut-1", "cut-2", "cut-3", "hike-1"] as const;
export type RuleChartReadingKey = (typeof RULE_CHART_READING_KEYS)[number];

const isReadingKey = (value: string | undefined): value is RuleChartReadingKey =>
  RULE_CHART_READING_KEYS.some((key) => key === value);

type PageQuery = Record<string, string | undefined> | undefined;

export const parseRuleChartArea = (value: string | undefined): DecisionArea | undefined =>
  value !== undefined && isDecisionArea(value) ? value : undefined;

/** The area the URL names: `?decision=`, else the old `?rule=`. */
export const parseRuleChartDecision = (query: PageQuery): DecisionArea | undefined =>
  parseHomeDecision(query?.[RULE_CHART_DECISION_PARAM]) ?? parseRuleChartArea(query?.[RULE_CHART_AREA_PARAM]);

/** The reading the URL names: `?reading=`, else `counted` for the old `?counted=1`; null for this week's. */
export const parseRuleChartReading = (query: PageQuery): RuleChartReadingKey | null => {
  const value = query?.[RULE_CHART_READING_PARAM];
  if (isReadingKey(value)) return value;
  return query?.[RULE_CHART_COUNTED_PARAM] === "1" ? "counted" : null;
};

const CHART_KEYS = new Set([RULE_CHART_AREA_PARAM, RULE_CHART_DECISION_PARAM, RULE_CHART_READING_PARAM, RULE_CHART_COUNTED_PARAM]);

/**
 * A link to one state of the chart, keeping the rest of the page's query (its horizon, a
 * month) so the reader lands on the same brief. `area` null leaves the decision out, so
 * the chart opens on the guidance's own area; `reading` null is this week's. The chart's
 * own choices are these links, so each works without script and copies as the picture
 * it shows. Old keys (`?rule=`, `?counted=`) are written as the new ones.
 */
export const buildRuleChartHref = (query: PageQuery, next: { area: DecisionArea | null; reading: RuleChartReadingKey | null }) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && !CHART_KEYS.has(key)) params.set(key, value);
  }
  if (next.area) params.set(RULE_CHART_DECISION_PARAM, next.area);
  if (next.reading) params.set(RULE_CHART_READING_PARAM, next.reading);
  const search = params.toString();
  return `/${search ? `?${search}` : ""}#${RULE_CHART_SECTION}`;
};

/** The chart with the left-out inputs counted, on the area the page shows. */
export const buildCountedChartHref = (query: PageQuery) =>
  buildRuleChartHref(query, { area: parseRuleChartDecision(query) ?? null, reading: "counted" });

/**
 * Where a reading sits against one area's rule, in the area's verb: "where Hiring
 * pauses", "where Hiring restarts", "between the two, where nothing changes". The
 * chart's text alternative, here so the island can say it for a reading it switches to.
 */
export const describeRuleChartWhere = (area: DecisionArea, state: "pause" | "restart" | "between"): string => {
  if (state === "between") return "between the two, where nothing changes";
  return `where ${decisionAreaLabel(area)} ${state === "pause" ? "pauses" : "restarts"}`;
};
