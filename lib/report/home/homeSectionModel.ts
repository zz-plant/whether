import { DECISION_CONTRACT_LABELS } from "../reportCopy";
import { formatRegimeSignalValue, type RegimeSignalKey } from "../reportFormatting";
import { classifyScoreBand, scoreBandScaleLabel } from "../signalTranslations";
import { describeInputMovement } from "../inputMovement";
import { formatPointsToLine, toThresholdDistance, type ActionStripItem, type RuleThresholdDistance } from "../operatingCalls";
import { operatingLeverToDecisionArea } from "../businessAreaMap";
import { isDecisionArea, type BoundedDecisionRule, type DecisionArea, type RuleCondition, type RuleConditionMetric } from "../boundedDecisionRules";
import type { RegimeSignalIndicator } from "../homeBriefModel";
import { findSignalDelta, type SignalDynamicsSource } from "../evidenceReaderModel";
import { comparisonBasis, type ComparisonBasis } from "../comparisonBasis";
import { describeScoreMovement } from "../scoreMovement";
import { buildQuietDayRead, type AreaMovementKind, type DecisionMovement } from "../decisionMovement";
import type { HomePageAssembly } from "./contracts";

/**
 * The homepage's sections in the reader's order (`HOME_SECTIONS` below). Each
 * section is a heading and an id here, and a component under
 * app/components/home that draws one of them; the route composes them and
 * nothing else on `/` restates a section's content inside another's.
 */
/**
 * The query parameter that carries the picker's choice (`/?decision=hiring`), so a
 * link to the brief can open on the answer its sender meant. Read on the server,
 * so the answer is in the first paint; written by the picker on every choice.
 */
export const HOME_DECISION_PARAM = "decision";

/** The decision a `?decision=` value names, or undefined for anything that is not an area. */
export const parseHomeDecision = (value: string | undefined): DecisionArea | undefined =>
  value !== undefined && isDecisionArea(value) ? value : undefined;

/*
 * The homepage's sections, in the order they print (2026-10-09): the verdict, the
 * stage and runway it is scaled to, the five areas, what would change the guidance,
 * the alert, what changed, the record, and sharing. The order follows what a reader
 * does with the week: act on it, check it fits their company, find their decision,
 * learn what would move it, ask to hear when it does, then the evidence and the
 * record. `areas` keeps the id the old "What that changes for you" section had, so
 * a link to it still lands on the areas.
 */
export const HOME_SECTIONS = {
  call: { id: "weekly-call" },
  calibration: { id: "company-calibration" },
  areas: { id: "what-it-changes", heading: "What are you deciding?" },
  watch: { id: "what-would-change", heading: DECISION_CONTRACT_LABELS.watch.flipWatch },
  alert: { id: "subscribe", heading: "Get an email the day a line is crossed" },
  changed: { id: "what-changed", heading: "What changed this week" },
  record: { id: "has-this-happened-before", heading: "Has this happened before?" },
  share: { id: "do-and-share", heading: "Share" },
} as const;

/** The three lines a score is drawn against, as the ladder primitive takes them. */
export type HomeLadderLine = { kind: "pause" | "resume" | "callChange"; value: number };

export type SignalChangeRow = {
  key: RegimeSignalKey;
  label: string;
  value: number | null;
  valueLabel: string;
  /** The earlier reading, or null when no comparison was made — never an invented flat one. */
  previous: number | null;
  previousLabel: string | null;
  delta: number | null;
  /** What the move is made of, in a sentence; absent for an input, and where the loader could not split the score. */
  movement?: string | null;
  /** Which way "up" counts: funding pressure and the base rate worsen as they rise. */
  increaseIsPositive: boolean;
  /** Where on its 0–100 scale a composite score sits, in the scale's words. */
  scaleLabel?: string;
  /** The lines a composite score is judged against; absent for the two market inputs. */
  lines?: HomeLadderLine[];
  /** The unclipped pressure behind a score pinned at the top of its scale. */
  saturatedPressure?: number;
};

const INCREASE_IS_POSITIVE: Record<RegimeSignalKey, boolean> = {
  tightness: false,
  baseRate: false,
  riskAppetite: true,
  curveSlope: true,
};

const SIGNAL_ORDER: readonly RegimeSignalKey[] = ["tightness", "riskAppetite", "baseRate", "curveSlope"];

type MetricLines = Partial<Record<"tightness" | "riskAppetite", { pause?: number; resume?: number; callChange: number }>>;

export const buildSignalChangeRows = ({
  indicators,
  lines,
  dynamics,
  tightnessPressure,
  tightnessSaturated,
}: {
  indicators: readonly RegimeSignalIndicator[];
  /** The week's comparison. Last week comes from here, not from the indicator's label. */
  dynamics: SignalDynamicsSource;
  lines: MetricLines;
  tightnessPressure?: number;
  tightnessSaturated?: boolean;
}): SignalChangeRow[] => {
  const byKey = new Map(indicators.map((indicator) => [indicator.key, indicator]));
  return SIGNAL_ORDER.flatMap((key) => {
    const indicator = byKey.get(key);
    if (!indicator) return [];
    const value = indicator.rawValue;
    /* Through the same `findSignalDelta` /signals and the exports read, so a
       signal that did not move reads as unmoved (not as "no comparison"), and
       a move past the weekly sanity limit is still drawn. The indicator's own
       label drops both: it only knows `changedSignals`. */
    const delta = typeof value === "number" ? findSignalDelta(dynamics, key) : null;
    const previous = typeof value === "number" && delta !== null ? Number((value - delta).toFixed(2)) : null;
    const isScore = key === "tightness" || key === "riskAppetite";
    const metricLines = isScore ? lines[key] : undefined;
    return [{
      key,
      label: indicator.label,
      value,
      valueLabel: indicator.valueLabel,
      previous,
      previousLabel: previous === null ? null : formatRegimeSignalValue(previous, key),
      delta,
      movement: isScore ? describeScoreMovement(key, dynamics.movement?.[key], comparisonBasis(dynamics.comparedWith)) : null,
      increaseIsPositive: INCREASE_IS_POSITIVE[key],
      scaleLabel: isScore && typeof value === "number" ? scoreBandScaleLabel(classifyScoreBand(value)) : undefined,
      lines: metricLines
        ? [
            ...(typeof metricLines.pause === "number" ? [{ kind: "pause" as const, value: metricLines.pause }] : []),
            ...(typeof metricLines.resume === "number" ? [{ kind: "resume" as const, value: metricLines.resume }] : []),
            { kind: "callChange" as const, value: metricLines.callChange },
          ]
        : undefined,
      saturatedPressure:
        key === "tightness" && tightnessSaturated && typeof tightnessPressure === "number" ? tightnessPressure : undefined,
    }];
  });
};

/**
 * The sentence over the table: how the two scores moved, from the same deltas
 * the rows print. A degraded read hands the page zero deltas, and saying
 * "neither score moved" on one would be the manufactured-stable claim
 * tests/noComparisonHonesty.test.ts exists to keep off the page.
 *
 * The move is measured against the earlier reading the week's dynamics name
 * (`comparisonBasis`), so it says "since Sep 29" where it used to say "this
 * week": the reading behind these deltas is last week's published brief, or
 * the last month-end where there is none. A caller with no date keeps "this
 * week".
 */
const NO_COMPARISON_SENTENCE = "No previous week to compare the scores against.";

const INPUT_MOVEMENT_SENTENCE: Record<ReturnType<typeof describeInputMovement>, (window: string) => string> = {
  "steady inputs": (window) => `Neither score moved much ${window}.`,
  "tightening inputs": (window) => `The scores moved toward tighter money ${window}.`,
  "easing inputs": (window) => `The scores moved toward easier money ${window}.`,
  "mixed inputs": (window) => `The two scores moved in opposite directions ${window}.`,
};

export const describeWeeklyMovement = ({
  tightnessDelta,
  riskAppetiteDelta,
  comparisonUnavailable,
  basis = comparisonBasis(),
}: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
  comparisonUnavailable: boolean;
  basis?: ComparisonBasis;
}) =>
  comparisonUnavailable
    ? NO_COMPARISON_SENTENCE
    : INPUT_MOVEMENT_SENTENCE[describeInputMovement(tightnessDelta, riskAppetiteDelta)](
        basis.date ? basis.since : "this week",
      );

/**
 * The homepage's quiet-day line for this assembly (`buildQuietDayRead`): what would change
 * the guidance, on a live week whose guidance held against the earlier reading. Nothing on
 * an archived week, which the banner dates, or on one whose conditions or call-change line
 * moved (`regimeAlert`), which leads with that. The page and the claim-parity test both read
 * it here, so the line under test is the one the page prints.
 */
export const buildHomeQuietDayRead = (
  homepage: Pick<HomePageAssembly, "reportResult" | "weeklyCall" | "weeklyDecisionCardModel">,
  { historical }: { historical: boolean },
): string | null => {
  const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
  if (historical || reportData.regimeAlert) return null;
  return buildQuietDayRead({
    guidanceChange: homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.guidanceChange,
    weeklyCall: homepage.weeklyCall,
    assessment: reportData.assessment,
  });
};

/** One side of an area's rule as a row prints it: the line, the distance in words, and the two facts behind the words. */
type HomeAreaLineSlot = { line: string; distance: string; points: number; met: boolean; metric: RuleConditionMetric };

export type HomeAreaRow = {
  area: DecisionArea;
  rule: string;
  pause?: HomeAreaLineSlot;
  resume?: HomeAreaLineSlot;
  /**
   * What the week's move did to this area's own lines ("Pause now applies:
   * funding pressure rose through 76."). Absent when nothing was compared, and
   * on a week no area's lines were crossed: that is said once over the table,
   * not once per row.
   */
  changed?: string;
  /** Which movement `changed` describes; "held" is the area that did not move while another did. */
  changedKind?: AreaMovementKind;
  /** Non-numeric conditions the rule states beside its lines. */
  pauseQualifier?: string;
  resumeQualifier?: string;
};

const lineSlot = (distance: RuleThresholdDistance | undefined, kind: "pause" | "resume"): HomeAreaLineSlot | undefined =>
  distance
    ? {
        line: distance.label,
        metric: distance.metric,
        distance: formatPointsToLine(distance.pointsToLine, kind, distance.satisfied),
        points: distance.pointsToLine,
        met: distance.satisfied,
      }
    : undefined;

const formatPoints = (points: number) =>
  `${points.toFixed(points % 1 === 0 ? 0 : 1)} ${points === 1 ? "pt" : "pts"}`;

/**
 * Where an area stands against its pause line, short enough to sit under the
 * decision's name in the picker: the answer before the click. "Pause line
 * crossed", or how far the reading is from it. Undefined for an area whose rule
 * states no pause line.
 */
export const describeAreaPauseStatus = (row: Pick<HomeAreaRow, "pause">): { text: string; crossed: boolean } | undefined => {
  if (!row.pause) return undefined;
  if (row.pause.met) return { text: "Pause line crossed", crossed: true };
  if (row.pause.points === 0) return { text: "At its pause line", crossed: false };
  return { text: `${formatPoints(row.pause.points)} from its pause line`, crossed: false };
};

/**
 * How many areas' pause lines this reading has crossed, said once over the
 * picker: the count a reader would otherwise assemble by opening five answers.
 */
export const describePauseLineCount = (rows: readonly Pick<HomeAreaRow, "pause">[]): string | null => {
  const ruled = rows.filter((row) => row.pause);
  if (ruled.length === 0) return null;
  const crossed = ruled.filter((row) => row.pause?.met).length;
  if (crossed === 0) return "No area's pause line is crossed this week.";
  return `Pause ${crossed === 1 ? "line" : "lines"} crossed in ${crossed} of ${ruled.length} areas this week.`;
};

/**
 * What conditions were at the earlier reading, for the card's stamp line on a
 * reading whose conditions differ from it: "Was Freezing on Sep 29". Dated by
 * the comparison's own basis, because the earlier reading is last week's brief
 * or, where there is none, a month-end snapshot, and "this week" would claim a
 * change the reading cannot date.
 */
export const describeEarlierConditions = ({
  previousLabel,
  basis = comparisonBasis(),
}: {
  previousLabel: string;
  basis?: ComparisonBasis;
}) => `Was ${previousLabel} ${basis.when}`;

const MONTH_SHORT = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/**
 * The domain of the conditions map's path, stated beside it (UI standards
 * §XV): which month-end readings the dots are, so the path is read as months,
 * not weeks. Null when there is no path to describe.
 */
export const describeConditionsTrail = (recordDates: readonly string[]): string | null => {
  const first = recordDates[0];
  const last = recordDates[recordDates.length - 1];
  if (!first || !last) return null;
  const firstDate = new Date(`${first.slice(0, 10)}T00:00:00Z`);
  const lastDate = new Date(`${last.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(firstDate.getTime()) || Number.isNaN(lastDate.getTime())) return null;
  if (recordDates.length === 1) return `Trail: the ${MONTH_YEAR.format(lastDate)} month-end, then this week.`;
  const range =
    firstDate.getUTCFullYear() === lastDate.getUTCFullYear()
      ? `${MONTH_SHORT.format(firstDate)}–${MONTH_YEAR.format(lastDate)}`
      : `${MONTH_YEAR.format(firstDate)}–${MONTH_YEAR.format(lastDate)}`;
  return `Trail: month-ends ${range}, then this week.`;
};

const nearest = (distances: RuleThresholdDistance[]) =>
  [...distances].sort((left, right) => left.pointsToLine - right.pointsToLine)[0];

/*
 * The one line a row prints for each side, chosen by what explains the state.
 * A pause holds on any of its lines, so the line to show is one already crossed,
 * else the nearest. A resume needs all of its lines, so the line to show is the
 * furthest still unmet — the one actually holding it back — else any.
 *
 * Both used to take the nearest. On the week of Sep 29, 2026 that printed
 * fundraising's pause as "Risk appetite < 44 · at the line" beside "Pause now
 * applies: funding pressure rose through 76", and hiring's resume as "Risk
 * appetite > 54 · 10 pts away" while funding pressure, 24 points from its own
 * resume line, was what kept hiring paused.
 */
const pauseLineToShow = (distances: RuleThresholdDistance[]) =>
  distances.find((distance) => distance.satisfied) ?? nearest(distances);

const resumeLineToShow = (distances: RuleThresholdDistance[]) => {
  const unmet = distances.filter((distance) => !distance.satisfied);
  return unmet.length > 0
    ? [...unmet].sort((left, right) => right.pointsToLine - left.pointsToLine)[0]
    : distances[0];
};

const distancesFor = (conditions: readonly RuleCondition[] | undefined, scores: { tightness: number; riskAppetite: number }) =>
  (conditions ?? []).map((condition) => toThresholdDistance(condition, scores));

/**
 * One row per area, whichever source the week carries. The action strip is
 * the stage-scoped rule set the brief prints; the canonical rules are what it
 * is built from, and stand in when the strip is absent. Both name the same
 * five areas, and the table sorts them into `decisionAreaOrder` itself.
 */
export const buildHomeAreaRows = ({
  actionStripItems,
  decisionRules,
  movement,
  scores,
}: {
  actionStripItems?: readonly ActionStripItem[];
  decisionRules: readonly BoundedDecisionRule[];
  /** What the week did to each area's lines; null when nothing was compared. */
  movement: Pick<DecisionMovement, "areas" | "moved"> | null;
  scores: { tightness: number; riskAppetite: number };
}): HomeAreaRow[] => {
  /* The column says what the week's move did to the area's own lines. It used to
     carry a fixed re-check sentence per area for whichever three the largest signal
     moves pointed at, whether or not the area's rule had anything to re-check; and on
     a week no line was crossed it says nothing, because the section's lead already
     says so once. */
  const changedFor = (area: DecisionArea): Pick<HomeAreaRow, "changed" | "changedKind"> => {
    if (!movement || movement.moved.length === 0) return {};
    const entry = movement.areas.find((candidate) => candidate.area === area);
    return entry ? { changed: entry.text, changedKind: entry.kind } : {};
  };

  if (actionStripItems && actionStripItems.length > 0) {
    return actionStripItems.map((item) => {
      const area = operatingLeverToDecisionArea[item.lever];
      return {
        area,
        rule: item.areaActionNow,
        pause: lineSlot(
          item.pauseConditions?.length ? pauseLineToShow(distancesFor(item.pauseConditions, scores)) : item.nearestPause,
          "pause",
        ),
        resume: lineSlot(
          item.resumeConditions?.length ? resumeLineToShow(distancesFor(item.resumeConditions, scores)) : item.bindingResume,
          "resume",
        ),
        ...changedFor(area),
        pauseQualifier: item.pauseQualifier,
        resumeQualifier: item.resumeQualifier,
      };
    });
  }

  return decisionRules.map((rule) => ({
    area: rule.area,
    rule: rule.doNow[0] ?? rule.recommendation,
    pause: lineSlot(pauseLineToShow(distancesFor(rule.pause.conditions, scores)), "pause"),
    resume: lineSlot(resumeLineToShow(distancesFor(rule.resume.conditions, scores)), "resume"),
    ...changedFor(rule.area),
    pauseQualifier: rule.pause.qualifier,
    resumeQualifier: rule.resume.qualifier,
  }));
};
