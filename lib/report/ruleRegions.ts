/**
 * An area's pause and restart rule as regions of the conditions chart.
 *
 * A rule is data (`BoundedDecisionRule.pause` / `.resume`): lines on the two scores and how
 * they combine. On the chart's plane (risk appetite across, funding pressure down) a line is
 * a half-plane, a pause that fires on any line is their union (an L along the edges) and a
 * restart that needs every line is their intersection (a box in a corner). The band left
 * between them is where nothing changes, which is the point of setting the two apart.
 *
 * Everything here reads the rule's own conditions and judges a reading with the predicates
 * the tables print with (`isRuleConditionMet`, `anyPauseLineMet`, `resolveLineState`), so a
 * region cannot say an area pauses where the table beside it says it does not. The drawing
 * lives in `app/components/ui/ruleRegionShapes.tsx`; the sentences a reader copies stay where
 * they were, and this module only adds the words a picture needs beside it.
 */
import {
  decisionAreaLabel,
  decisionAreaOrder,
  distanceToRuleCondition,
  isRuleConditionMet,
  type BoundedDecisionRule,
  type DecisionArea,
  type RuleCondition,
  type RuleConditionMetric,
} from "./boundedDecisionRules";
import { operatingLeverToDecisionArea } from "./businessAreaMap";
import { resolveLineState, type ActionStripItem, type LineState } from "./operatingCalls";
import { anyPauseLineMet } from "./reportEvidence";
import { formatDecisionReversal, formatDecisionThreshold } from "./reportFormatting";
import { regimeAtCoordinates } from "../regimePhaseSpace";
import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { formatMonthYearShortFromValue } from "../formatters";
import { getRegimePublicLabel } from "../regimePresentation";
import type { RegimeKey } from "../types";
import {
  describeRuleChartWhere,
  type RuleChartReadingKey,
} from "./ruleChartParams";

type Scores = { tightness: number; riskAppetite: number };

/** One side of a rule, as the rule stores it (`BoundedDecisionRule.pause` is assignable). */
type RuleClause = {
  conditions: readonly RuleCondition[];
  /** A pause fires on any line ("or"); a restart needs every line ("and"). */
  join: "or" | "and";
  /** A condition no score measures ("two weekly readings in a row come in weaker"). */
  qualifier?: string;
};

export type AreaRule = { area: DecisionArea; pause: RuleClause; resume: RuleClause };

type Range = readonly [number, number];

/** A box on the plane, in score points (0–100 on both axes). */
type ScoreRect = { tightness: Range; riskAppetite: Range };

/** The edge of a region: the line where `metric` equals `value`, drawn across `span` of the other score. */
type ScoreEdge = { metric: RuleConditionMetric; value: number; span: Range };

export type RuleRegion = { rects: ScoreRect[]; edges: ScoreEdge[] };

export type AreaRuleRegions = { pause: RuleRegion; resume: RuleRegion };

/** Where a reading sits against one area's rule. */
export type RegionState = "pause" | "restart" | "between";

const DOMAIN: Range = [0, 100];

const clampScore = (value: number) => Math.min(100, Math.max(0, value));

/* A rising line ("> 76") holds above it, a falling one ("< 44") below. Strictness is a
   question for the predicate, not the picture: the edge is the same line either way. */
const halfRange = (condition: RuleCondition): Range =>
  condition.operator === ">" || condition.operator === ">="
    ? [clampScore(condition.value), 100]
    : [0, clampScore(condition.value)];

const rectFor = (condition: RuleCondition): ScoreRect => ({
  tightness: condition.metric === "tightness" ? halfRange(condition) : DOMAIN,
  riskAppetite: condition.metric === "riskAppetite" ? halfRange(condition) : DOMAIN,
});

/* A line on the frame draws nothing the frame does not. */
const onFrame = (condition: RuleCondition) => condition.value <= 0 || condition.value >= 100;

const subtract = (spans: readonly Range[], cut: Range): Range[] =>
  spans.flatMap(([from, to]): Range[] => {
    const [cutFrom, cutTo] = cut;
    if (cutTo <= from || cutFrom >= to) return [[from, to]];
    return [
      ...(cutFrom > from ? [[from, cutFrom] as const] : []),
      ...(cutTo < to ? [[cutTo, to] as const] : []),
    ];
  });

/* Any line: each line's half-plane, and the parts of each line no other half-plane covers. */
const unionRegion = (conditions: readonly RuleCondition[]): RuleRegion => ({
  rects: conditions.map(rectFor),
  edges: conditions.flatMap((condition, index) => {
    if (onFrame(condition)) return [];
    const others = conditions.filter((_, otherIndex) => otherIndex !== index);
    const value = clampScore(condition.value);
    /* A line inside another line's half-plane on the same score is interior: "> 76" under "> 70". */
    const interior = others.some((other) => {
      if (other.metric !== condition.metric) return false;
      const [from, to] = halfRange(other);
      return value > from && value < to;
    });
    if (interior) return [];
    const spans = others
      .filter((other) => other.metric !== condition.metric)
      .reduce<Range[]>((remaining, other) => subtract(remaining, halfRange(other)), [DOMAIN]);
    return spans.filter(([from, to]) => to > from).map((span) => ({ metric: condition.metric, value, span }));
  }),
});

/* Every line: one box, edged by the lines that bound it. */
const intersectionRegion = (conditions: readonly RuleCondition[]): RuleRegion => {
  if (conditions.length === 0) return { rects: [], edges: [] };
  const bound = (metric: RuleConditionMetric): Range =>
    conditions
      .filter((condition) => condition.metric === metric)
      .reduce<Range>((acc, condition) => {
        const [from, to] = halfRange(condition);
        return [Math.max(acc[0], from), Math.min(acc[1], to)];
      }, DOMAIN);
  const tightness = bound("tightness");
  const riskAppetite = bound("riskAppetite");
  if (tightness[1] <= tightness[0] || riskAppetite[1] <= riskAppetite[0]) return { rects: [], edges: [] };
  const seen = new Set<string>();
  const edges = conditions.flatMap((condition) => {
    if (onFrame(condition)) return [];
    const value = clampScore(condition.value);
    const own = condition.metric === "tightness" ? tightness : riskAppetite;
    const key = `${condition.metric}:${value}`;
    if ((value !== own[0] && value !== own[1]) || seen.has(key)) return [];
    seen.add(key);
    return [{ metric: condition.metric, value, span: condition.metric === "tightness" ? riskAppetite : tightness }];
  });
  return { rects: [{ tightness, riskAppetite }], edges };
};

const regionFor = (clause: RuleClause): RuleRegion =>
  clause.join === "or" ? unionRegion(clause.conditions) : intersectionRegion(clause.conditions);

/** The two regions a rule's lines enclose. A clause with no numeric line has no region. */
export const buildRuleRegions = (rule: AreaRule): AreaRuleRegions => ({
  pause: regionFor(rule.pause),
  resume: regionFor(rule.resume),
});

/* The pause by the predicate every area surface uses (`anyPauseLineMet`); a clause stored
   as "and" needs every line, as its sentence says. */
const pauseMet = (rule: AreaRule, scores: Scores) =>
  rule.pause.conditions.length > 0 &&
  (rule.pause.join === "and"
    ? rule.pause.conditions.every((condition) => isRuleConditionMet(condition, scores[condition.metric]))
    : anyPauseLineMet([{ pauseConditions: [...rule.pause.conditions] }], scores));

const restartMet = (rule: AreaRule, scores: Scores) =>
  rule.resume.conditions.length > 0 &&
  (rule.resume.join === "or"
    ? rule.resume.conditions.some((condition) => isRuleConditionMet(condition, scores[condition.metric]))
    : rule.resume.conditions.every((condition) => isRuleConditionMet(condition, scores[condition.metric])));

export const regionAt = (rule: AreaRule, scores: Scores): RegionState =>
  pauseMet(rule, scores) ? "pause" : restartMet(rule, scores) ? "restart" : "between";

export type AreaChanges = { pauses: DecisionArea[]; restarts: DecisionArea[] };

/**
 * Which areas another reading would move, each by the one side that can change it
 * (2026-11-03): an area paused at this week's reading restarts once its restart
 * condition holds, and any other area pauses once a pause line is met. A paused area
 * that leaves its pause lines short of restarting stays on hold: between the two,
 * nothing changes. In the areas' own order.
 */
export const areaChangesAt = (rules: readonly AreaRule[], published: Scores, other: Scores): AreaChanges => {
  const ordered = decisionAreaOrder.flatMap((area) => rules.filter((rule) => rule.area === area));
  return {
    pauses: ordered.filter((rule) => !pauseMet(rule, published) && pauseMet(rule, other)).map((rule) => rule.area),
    restarts: ordered.filter((rule) => pauseMet(rule, published) && restartMet(rule, other)).map((rule) => rule.area),
  };
};

/**
 * The answer, first: "Hiring, Fundraising and New bets would restart", "Roadmap would
 * pause", "No area would pause or restart". Without the full stop, so a caller can end it.
 */
export const describeAreaChanges = ({ pauses, restarts }: AreaChanges): string => {
  const restart = restarts.length > 0 ? `${listAreas(restarts)} would restart` : null;
  const pause = pauses.length > 0 ? `${listAreas(pauses)} would pause` : null;
  if (restart && pause) return `${restart} and ${pause}`;
  return restart ?? pause ?? "No area would pause or restart";
};

/**
 * "Conditions would turn Cloudy.", or null when another reading's scores land where
 * this week's conditions already are, or where this week's scores already land (a
 * change awaiting confirmation is the published brief's to state, not this sentence's).
 */
export const describeConditionsChange = ({
  regime,
  published,
  other,
  changeLines,
}: {
  /** This week's published conditions. */
  regime: string | undefined;
  published: Scores;
  other: Scores;
  changeLines: Scores;
}): string | null => {
  const lines = { ...DEFAULT_THRESHOLDS, tightnessRegime: changeLines.tightness, riskAppetiteRegime: changeLines.riskAppetite };
  const landing = regimeAtCoordinates(other.tightness, other.riskAppetite, lines);
  const here = regimeAtCoordinates(published.tightness, published.riskAppetite, lines);
  if (landing === here || landing === regime?.toUpperCase()) return null;
  return `Conditions would turn ${getRegimePublicLabel(landing)}.`;
};

/**
 * The area's state against its pause lines, as the rules table grades it: crossed, close
 * (within 5 points, `resolveLineState`) or clear, from the nearest pause line.
 */
const pauseLineStateAt = (rule: AreaRule, scores: Scores): LineState | undefined => {
  if (rule.pause.conditions.length === 0) return undefined;
  const points = Math.min(...rule.pause.conditions.map((condition) => distanceToRuleCondition(condition, scores[condition.metric])));
  return resolveLineState(points, "pause", pauseMet(rule, scores));
};

/** A rule from an action-strip row, which stores its lines without the join: a pause on any, a restart on all. */
export const ruleFromStripItem = (
  item: Pick<ActionStripItem, "lever" | "pauseConditions" | "resumeConditions" | "pauseQualifier" | "resumeQualifier">,
): AreaRule => ({
  area: operatingLeverToDecisionArea[item.lever],
  pause: { conditions: item.pauseConditions ?? [], join: "or", qualifier: item.pauseQualifier },
  resume: { conditions: item.resumeConditions ?? [], join: "and", qualifier: item.resumeQualifier },
});

const listFormat = new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" });
const listAreas = (areas: readonly DecisionArea[]) => listFormat.format(areas.map(decisionAreaLabel));

/* The compact form the rules table prints ("Funding pressure > 76 or Risk appetite < 44"). */
const clauseLabel = (clause: RuleClause) => clause.conditions.map((condition) => condition.label).join(` ${clause.join} `);

/** The rule as a sentence, the same for every reading: "Hiring pauses where … and restarts where …." */
export const describeRuleSides = (rule: AreaRule): string => {
  const label = decisionAreaLabel(rule.area);
  const sides = [
    rule.pause.conditions.length > 0 ? `pauses where ${clauseLabel(rule.pause)}` : null,
    rule.resume.conditions.length > 0 ? `restarts where ${clauseLabel(rule.resume)}` : null,
  ].filter((side): side is string => side !== null);
  return sides.length > 0 ? `${label} ${sides.join(" and ")}.` : `${label} turns on neither score.`;
};

/**
 * The chart's claim in words, for its text alternative: where the area pauses and
 * restarts, and where the reading sits, in the area's verb (2026-11-18; "in the pause
 * region" until then, the drawing's name for it). "Hiring pauses where Funding pressure
 * > 76 or Risk appetite < 44 and restarts where Funding pressure < 66 and Risk appetite
 * > 54. This week's reading is where Hiring pauses."
 */
export const describeRegionsAt = (rule: AreaRule, scores: Scores, readingName: string): string =>
  `${describeRuleSides(rule)} ${readingName} is ${describeRuleChartWhere(rule.area, regionAt(rule, scores))}.`;

/**
 * The conditions a region cannot draw, because no score measures them, said once under the
 * chart: "Not drawn: Roadmap also pauses if two weekly readings in a row come in weaker, and
 * its restart also waits until the weekly reading holds or improves." Null when there are none.
 */
const describeUndrawnConditions = (rule: AreaRule): string | null => {
  const label = decisionAreaLabel(rule.area);
  const pause = rule.pause.qualifier
    ? rule.pause.join === "or"
      ? `${label} also pauses if ${rule.pause.qualifier}`
      : `${label} pauses only once ${rule.pause.qualifier} too`
    : null;
  const resume = rule.resume.qualifier
    ? rule.resume.join === "and"
      ? `restart also waits until ${rule.resume.qualifier}`
      : `restarts also if ${rule.resume.qualifier}`
    : null;
  if (pause && resume) return `Not drawn: ${pause}, and its ${resume}.`;
  if (pause) return `Not drawn: ${pause}.`;
  if (resume) return `Not drawn: ${label}'s ${resume}.`;
  return null;
};

type LeftOutEntry = { metric: RuleConditionMetric; score: number };

/**
 * The reading the left-out startup-market inputs would give: each score they move, at what
 * they would make it. Null when they move neither. `WhyConditionsSection` states the same
 * point in words, from the same entries.
 */
const leftOutReading = (notCounted: readonly LeftOutEntry[], published: Scores): Scores | null => {
  if (notCounted.length === 0) return null;
  return {
    tightness: notCounted.find((entry) => entry.metric === "tightness")?.score ?? published.tightness,
    riskAppetite: notCounted.find((entry) => entry.metric === "riskAppetite")?.score ?? published.riskAppetite,
  };
};

/* The scores another reading moves, as its answer's last sentence states them. */
const describeMovedScores = (published: Scores, other: Scores): string => {
  const tightness = other.tightness !== published.tightness;
  const riskAppetite = other.riskAppetite !== published.riskAppetite;
  if (tightness && riskAppetite) return `funding pressure would be ${other.tightness} and risk appetite ${other.riskAppetite}`;
  if (tightness) return `funding pressure would be ${other.tightness}`;
  if (riskAppetite) return `risk appetite would be ${other.riskAppetite}`;
  return "neither score would move";
};

/**
 * Another reading the chart can plot besides this week's (2026-11-18): the left-out
 * inputs counted, or this week's after a whole number of Fed steps (`rateScenario.ts`).
 * Each is judged by the predicates the published reading is, and the published guidance
 * never changes under it: this says what the other reading would do.
 */
export type RuleChartReading = Scores & {
  key: RuleChartReadingKey;
  /** The conditions its scores land in, which the plotted marker takes. */
  regime: RegimeKey;
  /** The choice's words: "Startup-market inputs counted", "After one Fed cut". */
  label: string;
  /** In full, as the marker and the choice's accessible name say it: "After one quarter-point Fed cut". */
  name: string;
  /**
   * The answer under the chart, what would move first, then the number and what is held:
   * "Hiring would restart. One quarter-point Fed cut would take the 1-month rate to 3.85%
   * and funding pressure to 63, with everything else as this week."
   */
  answer: string;
  /** Where it sits against each area's rule, for the chart's text alternative. */
  where: Partial<Record<DecisionArea, RegionState>>;
};

/** A reading at a Fed step, as `buildRateMoves` (rateScenario.ts) scores it: the scores and the sentence saying how. */
export type RuleChartRateMove = Scores & {
  key: Exclude<RuleChartReadingKey, "counted">;
  label: string;
  name: string;
  /** "One quarter-point Fed cut would take the 1-month rate to 3.85% and funding pressure to 63, with everything else as this week." */
  how: string;
};

export type RuleChartArea = {
  area: DecisionArea;
  regions: AreaRuleRegions;
  /** The conditions the regions cannot draw, or null. */
  note: string | null;
  /** The area's own "Pause if" and "Restart when", as the guidance block prints a rule's. */
  pauseLine: string;
  resumeLine: string;
  /** Whether this week's reading meets a pause line: the side that can change the area is the restart. */
  held: boolean;
  /** The rule as a sentence, the first half of the chart's text alternative (`describeRuleSides`). */
  rule: string;
  /** Where this week's reading sits against it. */
  where: RegionState;
};

export type RuleChartModel = {
  areas: RuleChartArea[];
  /** The area the chart opens on: the guidance's lead rule, whose sentences sit beside it. Null when those sentences are not that rule's. */
  defaultArea: DecisionArea | null;
  /** The readings the chart can plot besides this week's, in the order the choices print; empty when there are none. */
  readings: RuleChartReading[];
  /**
   * The short rate each funding-pressure value the chart can label comes with, and the
   * rate's name ("1-month rate"), where the rate alone makes funding pressure this week
   * (`fundingPressureRateLookup`, rateScenario.ts); null otherwise, and the chart then
   * labels no rate.
   */
  fundingPressureRates: { name: string; values: Array<{ value: number; rate: number }> } | null;
};

/**
 * The conditions chart's rule layer on the brief: each area's regions, sentences and claim,
 * built once on the server from the rules the page prints. `leadArea` is the rule whose
 * sentences the section already prints (`corridorRule`), or null where a stage or override
 * replaced them, so the chart never opens on regions the sentence beside it does not state.
 * `notCounted` is the scoring basis's left-out scores and `rateMoves` this week's reading
 * after each Fed step; both are empty on an archived or saved read, where they have
 * nothing to show.
 */
export const buildRuleChartModel = ({
  rules,
  scores,
  leadArea,
  notCounted,
  changeLines,
  regime,
  rateMoves = [],
  rateAtFundingPressure,
}: {
  rules: readonly BoundedDecisionRule[];
  scores: Scores;
  leadArea: DecisionArea | null;
  notCounted: readonly LeftOutEntry[];
  /** The two lines the conditions are cut at, which name another reading's conditions. */
  changeLines: Scores;
  /** This week's published conditions. */
  regime?: string;
  rateMoves?: readonly RuleChartRateMove[];
  /** The rate at a funding-pressure value, or null, and the rate's name; absent when the rate does not make the whole score. */
  rateAtFundingPressure?: { name: string; at: (value: number) => number | null };
}): RuleChartModel => {
  const ordered = decisionAreaOrder.flatMap((area) => rules.filter((rule) => rule.area === area));
  const lines = { ...DEFAULT_THRESHOLDS, tightnessRegime: changeLines.tightness, riskAppetiteRegime: changeLines.riskAppetite };
  const chartReading = (entry: Scores & Pick<RuleChartReading, "key" | "label" | "name">, how: string): RuleChartReading => {
    const other = { tightness: entry.tightness, riskAppetite: entry.riskAppetite };
    const conditions = describeConditionsChange({ regime, published: scores, other, changeLines });
    return {
      ...entry,
      regime: regimeAtCoordinates(other.tightness, other.riskAppetite, lines),
      answer: [`${describeAreaChanges(areaChangesAt(ordered, scores, other))}.`, conditions, how].filter(Boolean).join(" "),
      where: Object.fromEntries(ordered.map((rule) => [rule.area, regionAt(rule, other)])),
    };
  };
  const counted = leftOutReading(notCounted, scores);
  const readings = [
    ...(counted
      ? [chartReading(
          { ...counted, key: "counted", label: "Startup-market inputs counted", name: "The reading with startup-market inputs counted" },
          `With startup-market inputs counted, ${describeMovedScores(scores, counted)}.`,
        )]
      : []),
    ...rateMoves.map(({ how, ...move }) => chartReading(move, how)),
  ];
  /* Every funding-pressure value an area's rule or the conditions turn on, once each. */
  const fundingPressureValues = [
    ...new Set([
      changeLines.tightness,
      ...ordered
        .flatMap((rule) => [...rule.pause.conditions, ...rule.resume.conditions])
        .filter((condition) => condition.metric === "tightness")
        .map((condition) => condition.value),
    ]),
  ].sort((left, right) => left - right);
  return {
    areas: ordered.map((rule) => ({
      area: rule.area,
      regions: buildRuleRegions(rule),
      note: describeUndrawnConditions(rule),
      pauseLine: formatDecisionThreshold(rule.pauseTrigger),
      resumeLine: formatDecisionReversal(rule.resumeTrigger),
      held: pauseMet(rule, scores),
      rule: describeRuleSides(rule),
      where: regionAt(rule, scores),
    })),
    defaultArea: leadArea,
    readings,
    fundingPressureRates: rateAtFundingPressure
      ? {
          name: rateAtFundingPressure.name,
          values: fundingPressureValues.flatMap((value) => {
            const rate = rateAtFundingPressure.at(value);
            return rate === null ? [] : [{ value, rate }];
          }),
        }
      : null,
  };
};

const STATE_WORDS: Record<LineState, string> = {
  crossed: "paused",
  near: "close to pausing",
  clear: "clear",
};

export type AreaStateMonth = {
  recordDate: string;
  year: number;
  month: number;
  /** "Sep 2026". */
  label: string;
  tightness: number;
  riskAppetite: number;
  states: Array<{ area: DecisionArea; state: LineState | undefined }>;
  /** The month in words: "Sep 2026: Hiring, Fundraising, Spending and New bets paused; Roadmap clear. Funding pressure 90, risk appetite 56." */
  summary: string;
};

/**
 * Each area's state at each of the last `count` month-ends, by this week's rules: the
 * month-end readings as the record holds them (scored with today's formula), judged
 * against today's lines with the predicates the rules table uses. A month with no scores
 * is left out rather than guessed.
 */
export const buildAreaStateHistory = (
  rules: readonly AreaRule[],
  history: ReadonlyArray<{ record_date: string; tightness?: number; riskAppetite?: number }>,
  count = 12,
): AreaStateMonth[] => {
  const ordered = decisionAreaOrder.flatMap((area) => rules.filter((rule) => rule.area === area));
  return history
    .flatMap((entry) =>
      typeof entry.tightness === "number" && typeof entry.riskAppetite === "number"
        ? [{ recordDate: entry.record_date, tightness: entry.tightness, riskAppetite: entry.riskAppetite }]
        : [],
    )
    .sort((left, right) => left.recordDate.localeCompare(right.recordDate))
    .slice(-count)
    .map((entry) => {
      const [year = 0, month = 0] = entry.recordDate.split("-").map(Number);
      const scores = { tightness: entry.tightness, riskAppetite: entry.riskAppetite };
      const states = ordered.map((rule) => ({ area: rule.area, state: pauseLineStateAt(rule, scores) }));
      const label = formatMonthYearShortFromValue(entry.recordDate);
      const byState = (["crossed", "near", "clear"] as const).flatMap((state) => {
        const areas = states.filter((entryState) => entryState.state === state).map((entryState) => entryState.area);
        return areas.length > 0 ? [`${listAreas(areas)} ${STATE_WORDS[state]}`] : [];
      });
      return {
        ...entry,
        year,
        month,
        label,
        states,
        summary: `${label}: ${byState.join("; ")}. Funding pressure ${entry.tightness}, risk appetite ${entry.riskAppetite}.`,
      };
    });
};
