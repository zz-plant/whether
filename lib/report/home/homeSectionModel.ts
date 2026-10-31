import { DECISION_CONTRACT_LABELS } from "../reportCopy";
import { formatRegimeSignalValue, type RegimeSignalKey } from "../reportFormatting";
import { classifyScoreBand, scoreBandScaleLabel } from "../signalTranslations";
import { describeInputMovement } from "../inputMovement";
import {
  formatPointsToLine,
  resolveLineState,
  toThresholdDistance,
  type ActionStripItem,
  type LineState,
  type RuleThresholdDistance,
} from "../operatingCalls";
import { operatingLeverToDecisionArea } from "../businessAreaMap";
import { decisionAreaLabel, isDecisionArea, type BoundedDecisionRule, type DecisionArea, type RuleCondition, type RuleConditionMetric } from "../boundedDecisionRules";
import type { RegimeSignalIndicator } from "../homeBriefModel";
import { findSignalDelta, type SignalDynamicsSource } from "../evidenceReaderModel";
import { comparisonBasis, type ComparisonBasis } from "../comparisonBasis";
import { describeScoreMovement } from "../scoreMovement";
import type { AreaMovementKind, DecisionMovement } from "../decisionMovement";

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
 * The homepage's sections, in the order they print (2026-10-22): the verdict, the
 * five areas, whose lines they are, what the conditions are made of, what changed,
 * what would change the guidance, who will ask about it, how unusual this is, and
 * the alert. The order follows the four questions a reader arrives with — what is
 * happening, what do I do, what would change it, how far can I trust it — and keeps
 * the plan before the evidence. `areas` keeps the id the old "What that changes for
 * you" section had, so a link to it still lands on the areas. The diagnosis heading
 * carries the week's weather word, so it is passed by the route, not stored here.
 * Sharing is the page's last line, not a section: a heading over one link
 * (`ShareLinks`).
 */
export const HOME_SECTIONS = {
  call: { id: "weekly-call" },
  areas: { id: "what-it-changes", heading: "Your decisions this week" },
  calibration: { id: "company-calibration" },
  diagnosis: { id: "why-conditions" },
  changed: { id: "what-changed", heading: "What changed this week" },
  watch: { id: "what-would-change", heading: DECISION_CONTRACT_LABELS.watch.flipWatch },
  hearing: { id: "what-you-may-hear", heading: "What you may be hearing" },
  record: { id: "has-this-happened-before", heading: "How unusual is this?" },
  alert: { id: "subscribe", heading: "Get notified when something changes" },
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
      /* What moved it, and not what the score leaves out (2026-10-27): the brief's
         "What the headline reading leaves out" band says that in full beside the
         readings, and the strip on the card links it, so this row made it three. */
      movement: isScore
        ? describeScoreMovement(key, dynamics.movement?.[key], comparisonBasis(dynamics.comparedWith))
        : null,
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

/** One side of an area's rule as a row prints it: the line, the distance in words, and the two facts behind the words. */
export type HomeAreaLineSlot = { line: string; distance: string; points: number; met: boolean; metric: RuleConditionMetric };

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
 * decision's name in the picker: the answer before the click. "Past its
 * pause line", or how far the reading is from it. Undefined for an area whose rule
 * states no pause line.
 */
export const describeAreaPauseStatus = (
  row: Pick<HomeAreaRow, "pause">,
): { text: string; crossed: boolean; state: LineState } | undefined => {
  if (!row.pause) return undefined;
  /* The badge's state, from the same distance the words below describe. */
  const state = resolveLineState(row.pause.points, "pause", row.pause.met) ?? "clear";
  if (row.pause.met) return { text: "On hold", crossed: true, state };
  if (row.pause.points === 0) return { text: "At its pause line", crossed: false, state };
  return { text: `${formatPoints(row.pause.points)} from pausing`, crossed: false, state };
};

/**
 * How many areas' pause lines this reading has crossed, said once over the
 * picker: the count a reader would otherwise assemble by opening five answers.
 */
export const describePauseLineCount = (rows: readonly Pick<HomeAreaRow, "pause">[]): string | null => {
  const ruled = rows.filter((row) => row.pause);
  if (ruled.length === 0) return null;
  const crossed = ruled.filter((row) => row.pause?.met).length;
  /* A standing state, said as one: "crossed ... this week" sat under "No score
     crossed a pause or restart line since Sep 30" and read as a contradiction. */
  if (crossed === 0) return "No area is on hold.";
  return crossed === 1
    ? `1 of ${ruled.length} areas is on hold.`
    : `${crossed} of ${ruled.length} areas are on hold.`;
};

/**
 * The one exception worth a band above the call (2026-10-31): where the binding
 * line sits, when an area is on hold or close to it.
 *
 * The crossed state was drawn in five places — the stamp, the ladder, the
 * picker's badges, the area table and the card's own "On hold:" line — and
 * loud in none, so a week with an area held looked like a week with none. The
 * band is the page's silhouette changing with the weather: it exists only when
 * there is an exception, and it says the one thing the card does not, how far
 * the binding line is. It names no state word of its own ("on hold" is the
 * card's line) and it repeats no distance the picker draws: it is the sentence
 * a reader would otherwise assemble from two places.
 *
 * Which area: the one closest to its binding line. On hold, that is the nearest
 * restart line, because lifting a hold is the action; close, the nearest pause
 * line. Ties go to the page's own order.
 */
export type LineStateBandModel = {
  state: Exclude<LineState, "clear">;
  area: DecisionArea;
  text: string;
  href: string;
  action: string;
};

export const describeLineStateBand = (
  rows: readonly Pick<HomeAreaRow, "area" | "pause" | "resume">[],
): LineStateBandModel | null => {
  const ruled = rows.filter((row) => row.pause);
  if (ruled.length === 0) return null;

  const band = (state: LineStateBandModel["state"], row: Pick<HomeAreaRow, "area" | "pause" | "resume">, text: string) => ({
    state,
    area: row.area,
    text,
    href: `#${HOME_SECTIONS.areas.id}`,
    action: "What to do",
  });

  /* Held: the area whose restart line is nearest, since that is the hold that
     lifts first. An area with no numeric restart line still belongs here — it
     is on hold — it just cannot say how far from lifting it is. */
  const held = ruled.filter((row) => row.pause?.met);
  if (held.length > 0) {
    const nearestRestart = (row: Pick<HomeAreaRow, "resume">) =>
      row.resume && !row.resume.met && Number.isFinite(row.resume.points) ? row.resume.points : Number.POSITIVE_INFINITY;
    const binding = held.reduce((best, row) => (nearestRestart(row) < nearestRestart(best) ? row : best));
    const restart = binding.resume;
    return band(
      "crossed",
      binding,
      restart && !restart.met && Number.isFinite(restart.points)
        ? `${decisionAreaLabel(binding.area)} — ${restart.distance} from its restart line.`
        : `${decisionAreaLabel(binding.area)} is on hold.`,
    );
  }

  /* Close: the shared cutoff, through the same resolver the badges use, so the
     band cannot call a reading close that the picker calls clear. */
  const close = ruled.filter((row) => resolveLineState(row.pause?.points, "pause", row.pause?.met) === "near");
  if (close.length === 0) return null;
  const binding = close.reduce((best, row) => ((row.pause?.points ?? 0) < (best.pause?.points ?? 0) ? row : best));
  return band(
    "near",
    binding,
    `${decisionAreaLabel(binding.area)} — ${binding.pause?.distance} from its pause line.`,
  );
};

/**
 * The card's bridge from the weather word to the five areas (2026-10-14).
 *
 * The condition comes from the change lines and the area answers from the
 * pause and restart lines, so a card could say "Cloudy: money is available"
 * over a picker where four areas were held, and nothing tied the two. This
 * names the held areas on the card without repeating its condition stamp:
 * "On hold: Hiring, Fundraising, Spending and New bets."
 */
export const describeHeldAreasForCard = (
  rows: readonly Pick<HomeAreaRow, "area" | "pause">[],
): string | null => {
  const ruled = rows.filter((row) => row.pause);
  if (ruled.length === 0) return null;
  const held = ruled.filter((row) => row.pause?.met).map((row) => decisionAreaLabel(row.area));
  if (held.length === 0) return "No area is on hold.";
  if (held.length === ruled.length) return "Every area is on hold.";
  const list = held.length === 1 ? held[0] : `${held.slice(0, -1).join(", ")} and ${held.at(-1)}`;
  return `On hold: ${list}.`;
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
  if (recordDates.length === 1) return `The trail shows the end of ${MONTH_YEAR.format(lastDate)}, then this week.`;
  const range =
    firstDate.getUTCFullYear() === lastDate.getUTCFullYear()
      ? `${MONTH_SHORT.format(firstDate)}–${MONTH_YEAR.format(lastDate)}`
      : `${MONTH_YEAR.format(firstDate)}–${MONTH_YEAR.format(lastDate)}`;
  return `The trail shows each month, ${range}, then this week.`;
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
 * restart line, was what kept hiring paused.
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
