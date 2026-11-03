import type { TimeMachineRegimeEntry } from "../../timeMachine/timeMachineCache";
import { formatMonthLabel } from "../../timeMachine/monthFormatting";
import { getRegimePublicLabel, isRegimeKey } from "../../regimePresentation";
import type { RegimeKey } from "../../regimeEngine";
import { classifyRegimeQuadrant } from "../../regimeStateMachine";
import { decisionAreaLabel, decisionAreaOrder, ruleMetricLabel, type DecisionArea, type RuleConditionMetric } from "../boundedDecisionRules";
import { resolveLineState } from "../operatingCalls";
import { projectRegimeFromPace } from "../regimeContext";
import { describeScoreAgainstRecord } from "../lastTimeCallChanged";
import type { HomeAreaLineSlot, HomeAreaRow } from "./homeSectionModel";

/*
 * The brief as a forecast (2026-11-03, a concept for `/mockups/forecast`). Weather
 * services reach readers with no meteorology by leading with impact and time — what it
 * means for you, what happens next, how sure they are, what it is like — and keeping the
 * physics for a separate discussion. This builds those four blocks from the same reading
 * the brief uses. Two honesty rules hold it to the brief's own: a projection runs only as
 * far as `projectRegimeFromPace` does (four weeks, the horizon its comment says a straight
 * line can carry), and anything further out is a frequency from the record, said as one
 * ("in past months like this"), never a probability.
 */

export type ImpactLevel = "warning" | "watch" | "clear";

type AreaImpact = {
  area: DecisionArea;
  label: string;
  level: ImpactLevel;
  /** The level in the reader's words: "Paused", "Close to pausing", "Clear". */
  status: string;
  /** This week's action for the area. */
  rule: string;
  /** The one condition that changes its state, in words. */
  condition: string | null;
};

/*
 * Areas that share a level and the condition that changes it, as one card: a warning
 * service groups alerts with one cause rather than listing each town. Four areas held by
 * funding pressure above 76 are one fact with four actions.
 */
export type ForecastImpact = {
  level: ImpactLevel;
  status: string;
  condition: string | null;
  areas: { area: DecisionArea; label: string; rule: string }[];
};

const LEVEL_ORDER: readonly ImpactLevel[] = ["warning", "watch", "clear"];

const groupImpacts = (impacts: readonly AreaImpact[]): ForecastImpact[] =>
  LEVEL_ORDER.flatMap((level) => {
    const groups = new Map<string, ForecastImpact>();
    for (const impact of impacts.filter((candidate) => candidate.level === level)) {
      const key = impact.condition ?? "";
      const group = groups.get(key) ?? { level, status: impact.status, condition: impact.condition, areas: [] };
      group.areas.push({ area: impact.area, label: impact.label, rule: impact.rule });
      groups.set(key, group);
    }
    return [...groups.values()];
  });

type ForecastPeriod = {
  label: string;
  regime: RegimeKey | null;
  conditions: string;
  /** How this period's conditions are known: the reading, a pace, or the record. */
  basis: string;
};

export type ForecastTile = {
  metric: RuleConditionMetric;
  label: string;
  value: number;
  /** The side of the change line in plain words: "Money is pricey". */
  side: string;
  /** Against the record: "higher than in most months since 2012". */
  normal: string | null;
  /** The last 24 month-ends, oldest first, for a sparkline. */
  history: number[];
};

type ForecastView = {
  impacts: ForecastImpact[];
  next: string;
  periods: ForecastPeriod[];
  likelihood: string | null;
  analog: string | null;
  tiles: ForecastTile[];
};

const LEVEL_STATUS: Record<ImpactLevel, string> = {
  warning: "Paused",
  watch: "Close to pausing",
  clear: "Clear",
};

const phrase = (slot: HomeAreaLineSlot | undefined): string | null =>
  !slot || slot.value === undefined || slot.holdsAbove === undefined
    ? null
    : `${ruleMetricLabel[slot.metric].toLowerCase()} ${slot.holdsAbove ? "rises above" : "falls below"} ${slot.value}`;

const impactOf = (row: HomeAreaRow): AreaImpact => {
  const held = Boolean(row.pause?.met);
  const near = !held && resolveLineState(row.pause?.points, "pause", row.pause?.met) === "near";
  const level: ImpactLevel = held ? "warning" : near ? "watch" : "clear";
  const restart = held ? phrase(row.resume) : null;
  const pause = held ? null : phrase(row.pause);
  return {
    area: row.area,
    label: decisionAreaLabel(row.area),
    level,
    status: LEVEL_STATUS[level],
    rule: row.rule,
    condition: restart ? `Restarts when ${restart}.` : pause ? `Pauses if ${pause}.` : null,
  };
};

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

/** Weeks until a score at `pace` points a week reaches `target`, or null when it is not heading there. */
const weeksTo = (score: number, pace: number, target: number): number | null => {
  if (pace === 0 || Math.sign(target - score) !== Math.sign(pace)) return null;
  return Math.ceil(Math.abs(target - score) / Math.abs(pace));
};

const orderedRecord = (series: readonly TimeMachineRegimeEntry[]) =>
  [...series].sort((left, right) => left.recordDate.localeCompare(right.recordDate));

export const buildForecastView = ({
  rows,
  regime,
  tightness,
  riskAppetite,
  previous,
  weeksSincePrevious,
  thresholds,
  series,
  baseRate,
}: {
  rows: readonly HomeAreaRow[];
  regime: string;
  tightness: number;
  riskAppetite: number;
  /** The earlier reading the pace is measured from; null when nothing was compared. */
  previous: { tightness: number; riskAppetite: number } | null;
  weeksSincePrevious: number;
  thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
  series: readonly TimeMachineRegimeEntry[];
  /** How often conditions held at this distance from a change (the trust strip's figure). */
  baseRate: { held: number; months: number } | null;
}): ForecastView => {
  const ordered = [...rows].sort((left, right) => decisionAreaOrder.indexOf(left.area) - decisionAreaOrder.indexOf(right.area));
  const impacts = groupImpacts(ordered.filter((row) => row.pause).map(impactOf));
  const regimeKey = isRegimeKey(regime) ? regime : null;
  const conditions = getRegimePublicLabel(regime);
  const weeks = Math.max(1, weeksSincePrevious);
  const tightnessPerWeek = previous ? (tightness - previous.tightness) / weeks : 0;
  const riskAppetitePerWeek = previous ? (riskAppetite - previous.riskAppetite) / weeks : 0;

  /* The next change, if the pace of the last few weeks holds: the conditions within the
     projection's four weeks, otherwise the soonest area to restart or pause. */
  const projection = projectRegimeFromPace({
    tightness,
    riskAppetite,
    tightnessPerWeek,
    riskAppetitePerWeek,
    tightnessThreshold: thresholds.tightnessRegime,
    riskAppetiteThreshold: thresholds.riskAppetiteRegime,
  });
  const paceOf = (metric: RuleConditionMetric) => (metric === "tightness" ? tightnessPerWeek : riskAppetitePerWeek);
  const scoreOf = (metric: RuleConditionMetric) => (metric === "tightness" ? tightness : riskAppetite);
  const areaChanges = rows.flatMap((row) => {
    const slot = row.pause?.met ? row.resume : row.pause;
    if (!slot || slot.value === undefined) return [];
    const eta = weeksTo(scoreOf(slot.metric), paceOf(slot.metric), slot.value);
    return eta !== null && eta <= 13 ? [{ row, eta, restart: Boolean(row.pause?.met) }] : [];
  });
  const soonest = areaChanges.reduce<(typeof areaChanges)[number] | undefined>(
    (best, change) => (best === undefined || change.eta < best.eta ? change : best),
    undefined,
  );
  const window = previous ? `the pace of the last ${Math.round(weeks)} ${Math.round(weeks) === 1 ? "week" : "weeks"}` : "the pace";
  const next = !previous
    ? "No earlier reading to measure a pace from."
    : projection.weeksToFlip !== null && projection.projectedRegime
      ? `If ${window} holds, conditions could turn ${getRegimePublicLabel(projection.projectedRegime)} within ${projection.weeksToFlip} ${projection.weeksToFlip === 1 ? "week" : "weeks"}.`
      : soonest
        ? `If ${window} holds, ${decisionAreaLabel(soonest.row.area)} could ${soonest.restart ? "restart" : "pause"} in about ${soonest.eta} ${soonest.eta === 1 ? "week" : "weeks"}.`
        : `If ${window} holds, nothing changes this quarter.`;

  /* The strip: this week from the reading; four weeks from the pace, as far as the
     projection runs; the quarter from the record, as a frequency. */
  const record = orderedRecord(series);
  const sameStart = record.flatMap((entry, index) => {
    const later = record[index + 3];
    return entry.regime === regimeKey && later ? [later.regime === entry.regime] : [];
  });
  const heldQuarters = sameStart.filter(Boolean).length;
  const in4 = classifyRegimeQuadrant({
    tightness: clampScore(tightness + tightnessPerWeek * 4),
    riskAppetite: clampScore(riskAppetite + riskAppetitePerWeek * 4),
    thresholds,
  });
  const periods: ForecastPeriod[] = [
    { label: "This week", regime: regimeKey, conditions, basis: "This week's reading" },
    {
      label: "Next 4 weeks",
      regime: previous ? in4 : regimeKey,
      conditions: getRegimePublicLabel(previous ? in4 : regime),
      basis: previous ? "If the pace holds" : "No pace to project",
    },
    {
      label: "This quarter",
      regime: regimeKey,
      conditions,
      basis:
        sameStart.length >= 6
          ? `Held ${heldQuarters} of ${sameStart.length} times from ${conditions} before`
          : "Too few past quarters to count",
    },
  ];

  /* How sure: the trust strip's own count, said the way a forecast says a chance. */
  const likelihood = baseRate
    ? `In past months this close to a change, conditions held ${baseRate.held} of ${baseRate.months} times.`
    : null;

  /* What it is like: the month-end on the record nearest this reading on both scores,
     leaving out the last year, and what conditions were three months on. */
  const older = record.slice(0, Math.max(0, record.length - 12));
  const nearest = older.reduce<{ entry: TimeMachineRegimeEntry; index: number; distance: number } | undefined>((best, entry, index) => {
    const distance = Math.hypot(entry.tightness - tightness, entry.riskAppetite - riskAppetite);
    return best === undefined || distance < best.distance ? { entry, index, distance } : best;
  }, undefined);
  const afterAnalog = nearest ? record[nearest.index + 3] : undefined;
  const analog = nearest
    ? `Most like ${formatMonthLabel(nearest.entry.year, nearest.entry.month)} (funding pressure ${Math.round(nearest.entry.tightness)}, risk appetite ${Math.round(nearest.entry.riskAppetite)}).${
        afterAnalog ? ` Three months later it read ${getRegimePublicLabel(afterAnalog.regime)}.` : ""
      }`
    : null;

  const recent = record.slice(-24);
  const pricey = tightness > thresholds.tightnessRegime;
  const willing = riskAppetite > thresholds.riskAppetiteRegime;
  const tiles: ForecastTile[] = [
    {
      metric: "tightness",
      label: ruleMetricLabel.tightness,
      value: Math.round(tightness),
      side: pricey ? "Money is pricey" : "Money is cheap",
      normal: describeScoreAgainstRecord({ series, metric: "tightness", value: tightness }),
      history: recent.map((entry) => entry.tightness),
    },
    {
      metric: "riskAppetite",
      label: ruleMetricLabel.riskAppetite,
      value: Math.round(riskAppetite),
      side: willing ? "Investors are willing" : "Investors are wary",
      normal: describeScoreAgainstRecord({ series, metric: "riskAppetite", value: riskAppetite }),
      history: recent.map((entry) => entry.riskAppetite),
    },
  ];

  return { impacts, next, periods, likelihood, analog, tiles };
};
