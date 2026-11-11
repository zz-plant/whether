import { DECISION_CONTRACT_LABELS } from "../reportCopy";
import { formatRegimeSignalValue, type RegimeSignalKey } from "../reportFormatting";
import { classifyScoreBand, scoreBandScaleLabel } from "../signalTranslations";
import { describeInputMovement } from "../inputMovement";
import {
  NOTHING_TO_RESUME,
  formatPointsToLine,
  resolveLineState,
  selectPauseCondition,
  toThresholdDistance,
  type ActionStripItem,
  type LineState,
  type RuleThresholdDistance,
} from "../operatingCalls";
import { operatingLeverToDecisionArea } from "../businessAreaMap";
import { decisionAreaLabel, decisionAreaOrder, isDecisionArea, ruleMetricLabel, type BoundedDecisionRule, type DecisionArea, type RuleCondition, type RuleConditionMetric } from "../boundedDecisionRules";
import type { RegimeSignalIndicator } from "../homeBriefModel";
import { findSignalDelta, type SignalDynamicsSource } from "../evidenceReaderModel";
import { comparisonBasis, type ComparisonBasis } from "../comparisonBasis";
import { describeScoreMovement } from "../scoreMovement";
import { describeScoreMoveBand } from "../marketMoveScale";
import { describePastHolds } from "../lastTimeCallChanged";
import type { TimeMachineRegimeEntry } from "../../timeMachine/timeMachineCache";
import { describeMovementCause, type AreaMovementKind, type DecisionMovement } from "../decisionMovement";

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

/*
 * "Email me Mondays" under the call (2026-11-04). The form starts on alerts only, on
 * purpose (`AlertSection`), and a link that promises Monday has to land on Monday: #1661
 * found the greeting's "Get it every Monday" signing readers up for no Monday email. This
 * anchor sits on the form, and the form starts on Monday delivery when the hash names it.
 * A hash and not a query, so the press does not reload the page or lose the week shown.
 */
export const HOME_MONDAY_EMAIL_HASH = "email-monday";

/** The decision a `?decision=` value names, or undefined for anything that is not an area. */
export const parseHomeDecision = (value: string | undefined): DecisionArea | undefined =>
  value !== undefined && isDecisionArea(value) ? value : undefined;

/*
 * The last decision the reader picked, so the next visit opens on it (2026-11-03).
 * A reader arrives with one decision in flight, and the picker asked them to find it
 * again every Monday. One cookie holding the area's slug, like the stage and runway
 * cookies; a `?decision=` link still wins, since its sender meant that answer.
 */
const HOME_DECISION_COOKIE = "whether-home-decision";
const HOME_DECISION_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const readHomeDecisionCookie = (cookieHeader: string | null | undefined): DecisionArea | null => {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    if (rawKey?.trim() !== HOME_DECISION_COOKIE) continue;
    return parseHomeDecision(rest.join("=").trim()) ?? null;
  }
  return null;
};

/** The remembered decision; `null` forgets it, for a reader who closes the area they had open. */
export const buildHomeDecisionCookie = (area: DecisionArea | null): string =>
  `${HOME_DECISION_COOKIE}=${area ?? ""}; path=/; max-age=${area ? HOME_DECISION_COOKIE_MAX_AGE_SECONDS : 0}; SameSite=Lax`;

/*
 * The homepage's sections, in the order they print (2026-10-22): the verdict, the
 * five areas, whose lines they are, what the conditions are made of, what changed,
 * what would change the guidance, how unusual this is, and
 * the alert. The order follows the four questions a reader arrives with — what is
 * happening, what do I do, what would change it, how far can I trust it — and keeps
 * the plan before the evidence. `areas` keeps the id the old "What that changes for
 * you" section had, so a link to it still lands on the areas. The diagnosis heading
 * carries the week's weather word, so it is passed by the route, not stored here.
 * Sharing is the action row under the card and the header's share panel; the page
 * has no share section or closing share line (2026-11-11).
 */
export const HOME_SECTIONS = {
  call: { id: "weekly-call" },
  areas: { id: "what-it-changes", heading: "Your decisions this week" },
  calibration: { id: "company-calibration" },
  diagnosis: { id: "why-conditions" },
  changed: { id: "what-changed", heading: "What changed this week" },
  watch: { id: "what-would-change", heading: DECISION_CONTRACT_LABELS.watch.flipWatch },
  record: { id: "has-this-happened-before", heading: "Has this happened before?" },
  alert: { id: "subscribe", heading: "Get an alert the day conditions turn" },
} as const;

/** `/share` opens on the format its hash names; the slide is in the files section under it. */
export const ROLE_FORMAT_LINKS = [
  { href: "/share#investor-update", label: "Investor update" },
  { href: "/share#image-artifacts", label: "Board slide" },
  { href: "/share#portfolio-note", label: "Portfolio note" },
] as const;

/**
 * One move to test per area, for the link under its rule: a reader who has not worded a
 * plan still gets a verdict in one click. Each must be one the stress test grades;
 * `tests/homeDiscoverability.test.tsx` runs them through it. Fundraising has none: the
 * test has no rules for raising money and says "Not graded", so a link would open on a
 * refusal (#1740). Its area links to the answer that covers it.
 */
export const AREA_TEST_PLANS: Partial<Record<DecisionArea, string>> = {
  hiring: "Hire one engineer",
  "product-tempo": "Spend a sprint on tech debt",
  "burn-discipline": "Sign a 2-year cloud commitment",
  "expansion-bets": "Expand into a new region",
};

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

/* A saved copy has no previous week because it is not a new reading, and
   that is the fact to state (2026-11-02). */
const describeSavedCopyComparison = (savedReadingDate: string) =>
  `Nothing new to compare: this is the saved ${savedReadingDate} reading.`;

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
  savedReadingDate,
}: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
  comparisonUnavailable: boolean;
  basis?: ComparisonBasis;
  /** The reading's date when the page shows a saved copy. */
  savedReadingDate?: string;
}) =>
  comparisonUnavailable
    ? savedReadingDate ? describeSavedCopyComparison(savedReadingDate) : NO_COMPARISON_SENTENCE
    : INPUT_MOVEMENT_SENTENCE[describeInputMovement(tightnessDelta, riskAppetiteDelta)](
        basis.date ? basis.since : "this week",
      );

/** One side of an area's rule as a row prints it: the line, the distance in words, and the facts behind the words. */
export type HomeAreaLineSlot = {
  line: string;
  distance: string;
  points: number;
  met: boolean;
  metric: RuleConditionMetric;
  /** The line's number, and which side of it the condition holds on, for a sentence that names it. */
  value?: number;
  holdsAbove?: boolean;
};

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
        value: distance.value,
        holdsAbove: distance.operator === ">" || distance.operator === ">=",
        distance: formatPointsToLine(distance.pointsToLine, kind, distance.satisfied),
        points: distance.pointsToLine,
        met: distance.satisfied,
      }
    : undefined;

/**
 * A points count as the brief prints it: "1 pt", "11 pts", "10.5 pts". Shared by
 * the picker's area cards and the ladder under them, which print the same
 * distance for the same area.
 */
export const formatPoints = (points: number) =>
  `${points.toFixed(points % 1 === 0 ? 0 : 1)} ${points === 1 ? "pt" : "pts"}`;

/**
 * How far a slot's score is from its line, in words a reader can judge (2026-11-03):
 * "a rare move", from how often the month-end record moved that score that far in one
 * month (`describeScoreMoveBand`). "11 pts from pausing" was a distance in a unit no
 * reader has a feel for; the ladder under the picker keeps the points beside the band.
 * The points, where the record cannot say.
 */
const describeSlotDistance = (slot: Pick<HomeAreaLineSlot, "metric" | "points">): string =>
  describeScoreMoveBand(slot.metric, slot.points) ?? formatPoints(slot.points);

/**
 * The exception band's sentence for an area close to its pause line: the size of
 * the move, the score that would make it, and what it does ("A common risk-appetite
 * move would pause Roadmap."). It read "Roadmap — a common move from pausing.", a
 * fragment that named neither the score nor who moves (2026-11-09). The points,
 * where the record cannot size the move.
 */
const describeNearPause = (area: string, pause: Pick<HomeAreaLineSlot, "metric" | "points">): string => {
  const move = describeScoreMoveBand(pause.metric, pause.points, { named: true });
  return move ? `${capitalize(move)} would pause ${area}.` : `${area} is ${formatPoints(pause.points)} from pausing.`;
};

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/**
 * Where an area stands against its pause line, short enough to sit under the
 * decision's name in the picker: the answer before the click. "On hold", or how
 * big a move would pause it ("An unusual move from pausing"). Undefined for an
 * area whose rule states no pause line.
 */
export const describeAreaPauseStatus = (
  row: Pick<HomeAreaRow, "pause">,
): { text: string; crossed: boolean; state: LineState } | undefined => {
  if (!row.pause) return undefined;
  /* The badge's state, from the same distance the words below describe. */
  const state = resolveLineState(row.pause.points, "pause", row.pause.met) ?? "clear";
  if (row.pause.met) return { text: "On hold", crossed: true, state };
  /* The verb, not the line (2026-11-03): "At its pause line" explained the mechanism. */
  if (row.pause.points === 0) return { text: "On the edge of pausing", crossed: false, state };
  return { text: `${capitalize(describeSlotDistance(row.pause))} from pausing`, crossed: false, state };
};

/**
 * How many areas' pause lines this reading has crossed, said once over the
 * picker: the count a reader would otherwise assemble by opening five answers.
 *
 * On a saved copy (`savedReadingDate`) the count is the old reading's, said in
 * the past tense with its date. "No area is on hold." printed under a banner
 * saying to hold new hires and spend until live data returns, so a reader could
 * not tell whether hiring was held (2026-11-02).
 */
export const describePauseLineCount = (
  rows: readonly Pick<HomeAreaRow, "pause">[],
  savedReadingDate?: string,
): string | null => {
  const ruled = rows.filter((row) => row.pause);
  if (ruled.length === 0) return null;
  const crossed = ruled.filter((row) => row.pause?.met).length;
  if (savedReadingDate) {
    const on = `on the ${savedReadingDate} reading`;
    if (crossed === 0) return `No area was on hold ${on}.`;
    return crossed === 1
      ? `1 of ${ruled.length} areas was on hold ${on}.`
      : `${crossed} of ${ruled.length} areas were on hold ${on}.`;
  }
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
};

export const describeLineStateBand = (
  rows: readonly Pick<HomeAreaRow, "area" | "pause" | "changedKind">[],
  basis: ComparisonBasis = comparisonBasis(),
  movement?: Pick<DecisionMovement, "groups" | "comparedWith"> | null,
): LineStateBandModel | null => {
  const ruled = rows.filter((row) => row.pause);
  if (ruled.length === 0) return null;

  const band = (state: LineStateBandModel["state"], row: Pick<HomeAreaRow, "area">, text: string) => ({
    state,
    area: row.area,
    text,
  });

  /* Only a hold that started since the earlier reading (2026-11-05). A hold can stand for
     years, and the last one at these lines took 39 months to lift; red every week of that
     is a band nobody reads. The card's area strip states a standing hold. Dated by the
     comparison, because the earlier reading can be a month-end weeks back: "this week"
     or "just" would repeat for as long as that reading stayed the comparison. */
  const paused = ruled.filter((row) => row.pause?.met && row.changedKind === "paused");
  const [firstPaused] = paused;
  if (firstPaused) {
    const names = paused.map((row) => decisionAreaLabel(row.area));
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
    const pauseGroups = movement?.groups.filter((group) => group.kind === "paused" && group.crossed.length > 0);
    if (pauseGroups?.length) {
      const cause = describeMovementCause({ groups: pauseGroups, comparedWith: basis.date });
      return band("crossed", firstPaused, `Since ${basis.reference}, ${list} paused after ${cause.charAt(0).toLowerCase()}${cause.slice(1)}`);
    }
    return band("crossed", firstPaused, `${list} paused ${basis.since}.`);
  }

  /* Close: the shared cutoff, through the same resolver the badges use, so the
     band cannot call a reading close that the picker calls clear. */
  const close = ruled.filter((row) => resolveLineState(row.pause?.points, "pause", row.pause?.met) === "near");
  if (close.length === 0) return null;
  const binding = close.reduce((best, row) => ((row.pause?.points ?? 0) < (best.pause?.points ?? 0) ? row : best));
  const pause = binding.pause;
  return band(
    "near",
    binding,
    pause && pause.points > 0
      ? describeNearPause(decisionAreaLabel(binding.area), pause)
      : `${decisionAreaLabel(binding.area)} is on the edge of pausing.`,
  );
};

export type AreaStripModel = {
  cells: { area: DecisionArea; state: LineState; label: string; href: string }[];
  /** What the holds wait on, where every held area names the same restart line. */
  restart: string | null;
};

/* Where every held area waits on one line: the fact a reader of a held week asks next,
   and the size of the move it takes. "No restart until", because a rule can ask for a
   second score as well, and this names the one line it shows. */
const describeSharedRestart = (rows: readonly Pick<HomeAreaRow, "pause" | "resume">[]): string | null => {
  const slots = rows.filter((row) => row.pause?.met).map((row) => row.resume);
  const [first] = slots;
  if (!first || first.met) return null;
  const phrase = slotPhrase(first);
  if (!phrase || slots.some((slot) => !slot || slotPhrase(slot) !== phrase)) return null;
  const band = describeScoreMoveBand(first.metric, first.points);
  return `No restart until ${phrase}${band ? `, ${band}` : ""}.`;
};

const AREA_STRIP_STATE_LABEL: Record<LineState, string> = {
  crossed: "On hold",
  near: "Close to pausing",
  clear: "Clear",
};

/**
 * The card's five-area row: where each area stands against its pause line, in the words
 * the page's groups use. Null when no area states a line. The distance is the line under
 * the columns: areas held by one score would print one distance in every column.
 */
export const buildAreaStrip = (rows: readonly Pick<HomeAreaRow, "area" | "pause" | "resume">[]): AreaStripModel | null => {
  const cells = rows.flatMap((row) => {
    const status = describeAreaPauseStatus(row);
    return status
      ? [{ area: row.area, state: status.state, label: AREA_STRIP_STATE_LABEL[status.state], href: `#area-${row.area}` }]
      : [];
  });
  if (cells.length === 0) return null;
  return { cells, restart: describeSharedRestart(rows) };
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
  if (recordDates.length === 1) return `Trail: the end of ${MONTH_YEAR.format(lastDate)}, then this week.`;
  const range =
    firstDate.getUTCFullYear() === lastDate.getUTCFullYear()
      ? `${MONTH_SHORT.format(firstDate)}–${MONTH_YEAR.format(lastDate)}`
      : `${MONTH_YEAR.format(firstDate)}–${MONTH_YEAR.format(lastDate)}`;
  return `Trail: month-ends, ${range}.`;
};

/*
 * The one line a row prints for each side, chosen by what explains the state.
 * A pause holds on any of its lines, so the line to show is one already crossed,
 * else the nearest — `selectPauseCondition`, shared with the ladder under these
 * cards so the two cannot describe one area differently. A resume needs all of
 * its lines, so the line to show is the furthest still unmet — the one actually
 * holding it back — else any.
 *
 * Both used to take the nearest. On the week of Sep 29, 2026 that printed
 * fundraising's pause as "Risk appetite < 44 · at the line" beside "Pause now
 * applies: funding pressure rose through 76", and hiring's resume as "Risk
 * appetite > 54 · 10 pts away" while funding pressure, 24 points from its own
 * restart line, was what kept hiring paused.
 */
const resumeLineToShow = (distances: RuleThresholdDistance[]) => {
  const unmet = distances.filter((distance) => !distance.satisfied);
  return unmet.length > 0
    ? [...unmet].sort((left, right) => right.pointsToLine - left.pointsToLine)[0]
    : distances[0];
};

const distancesFor = (conditions: readonly RuleCondition[] | undefined, scores: { tightness: number; riskAppetite: number }) =>
  (conditions ?? []).map((condition) => toThresholdDistance(condition, scores));

/*
 * A restart line lifts a hold, so it has a distance only on an area that is on
 * hold. Between the two lines an area that is not paused printed "Risk appetite
 * > 54 · 2 pts away", which reads as something to wait for when there is
 * nothing to wait for (2026-11-02). The row keeps the line and says so; `met`
 * and `points` stay the reading's facts.
 */
const withIdleRestart = (row: HomeAreaRow): HomeAreaRow =>
  row.pause && !row.pause.met && row.resume
    ? { ...row, resume: { ...row.resume, distance: NOTHING_TO_RESUME } }
    : row;

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
          item.pauseConditions?.length ? selectPauseCondition(item.pauseConditions, scores) : item.nearestPause,
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
    }).map(withIdleRestart);
  }

  return decisionRules.map((rule) => ({
    area: rule.area,
    rule: rule.doNow[0] ?? rule.recommendation,
    pause: lineSlot(selectPauseCondition(rule.pause.conditions, scores), "pause"),
    resume: lineSlot(resumeLineToShow(distancesFor(rule.resume.conditions, scores)), "resume"),
    ...changedFor(rule.area),
    pauseQualifier: rule.pause.qualifier,
    resumeQualifier: rule.resume.qualifier,
  })).map(withIdleRestart);
};

/* A line as the condition it names: "funding pressure falls below 66". Null for a line that states no number. */
const slotPhrase = (slot: HomeAreaLineSlot): string | null =>
  slot.value === undefined || slot.holdsAbove === undefined
    ? null
    : `${ruleMetricLabel[slot.metric].toLowerCase()} ${slot.holdsAbove ? "rises above" : "falls below"} ${slot.value}`;

/*
 * The areas grouped by the condition that changes them (2026-11-03), the one idea the
 * forecast concept's critique kept: a warning service groups alerts with one cause
 * rather than listing each town, and four areas held by funding pressure above 76 are
 * one fact with four actions. Each group carries its condition, today's score and how
 * big a move that is, so the reader never has to hold a line in mind while finding the
 * number it is measured against. Held groups first; then the areas close to pausing;
 * then the rest.
 *
 * Then which way the score went since the comparison reading, against the condition
 * ("4 points closer since Oct 19"): a size with no direction says nothing about
 * whether to get ready. And a held group says when its hold began and how long the
 * earlier ones at the same lines took to lift (`describePastHolds`), because "restarts
 * when" names what lifts a hold and not when.
 */
export type AreaGroup = {
  state: LineState;
  /** "On hold", "Close to pausing" or "Clear". */
  status: string;
  /** "No restart until funding pressure falls below 66." */
  condition: string | null;
  /** Today's score, how big a move the condition is, and which way it went: "It is 90 today, a rare move away, unchanged since Oct 19." */
  distance: string | null;
  /** A held group's record: "It rose above 76 in Sep 2026. The last time, in Sep 2022, it took 39 months to fall below 66." */
  history: string | null;
  areas: { area: DecisionArea; label: string; rule: string; changed?: string }[];
};

/* Closer or farther from the condition, in the points the page prints. */
const describeTrend = (slot: HomeAreaLineSlot, today: number, earlier: number, since: string): string | null => {
  const { value, holdsAbove } = slot;
  if (value === undefined || holdsAbove === undefined) return null;
  const gap = (score: number) => (holdsAbove ? value - Math.round(score) : Math.round(score) - value);
  const closer = gap(earlier) - gap(today);
  if (closer === 0) return null;
  const points = Math.abs(closer) === 1 ? "1 point" : `${Math.abs(closer)} points`;
  return `${points} ${closer > 0 ? "closer" : "farther"} ${since}`;
};

/* A move this week stays with the area it moved. A restart condition that came or went
   on an area not on hold lifts nothing, so it is not news there ("Restart condition no
   longer holds" sat under "Not on hold: Roadmap"); the trend says how the score moved. */
const showsChange = (row: HomeAreaRow) =>
  Boolean(row.changed) &&
  (row.changedKind === "paused" || row.changedKind === "lifted" ||
    ((row.changedKind === "resumable" || row.changedKind === "resumeLost") && Boolean(row.pause?.met)));

const STATE_ORDER: readonly LineState[] = ["crossed", "near", "clear"];

const GROUP_STATUS: Record<LineState, string> = {
  crossed: "On hold",
  near: "Close to pausing",
  clear: "Clear",
};

export const buildAreaGroups = (
  rows: readonly HomeAreaRow[],
  scores: { tightness: number; riskAppetite: number },
  {
    comparison,
    record,
  }: {
    /** The earlier reading and how to name it ("since Oct 19"); none when nothing was compared. */
    comparison?: { scores: { tightness: number; riskAppetite: number }; since: string } | null;
    /** The month-end record, for a held group's history; none on an archived month. */
    record?: readonly TimeMachineRegimeEntry[];
  } = {},
): AreaGroup[] => {
  const groups = new Map<string, AreaGroup>();
  const ordered = [...rows].sort((left, right) => decisionAreaOrder.indexOf(left.area) - decisionAreaOrder.indexOf(right.area));
  for (const row of ordered) {
    if (!row.pause) continue;
    const held = row.pause.met;
    const slot = held ? row.resume : row.pause;
    const state: LineState = held ? "crossed" : resolveLineState(row.pause.points, "pause", false) === "near" ? "near" : "clear";
    const phrase = slot ? slotPhrase(slot) : null;
    const condition = phrase ? `${held ? "No restart until" : "Pauses if"} ${phrase}.` : null;
    /* The score the condition just named, so "it": the name twice in two sentences was
       the page's most repeated term. At the line there is no move to size. */
    const band = slot ? describeScoreMoveBand(slot.metric, slot.points) : null;
    const trend = slot && comparison ? describeTrend(slot, scores[slot.metric], comparison.scores[slot.metric], comparison.since) : null;
    const distance = slot && phrase
      ? band
        ? `${[`${band.charAt(0).toUpperCase()}${band.slice(1)} away`, trend].filter(Boolean).join(", ")}.`
        : `It is ${Math.round(scores[slot.metric])} today${trend ? `, ${trend}` : ""}.`
      : null;
    /* The record reads the lines the group shows, so both must be on one score. */
    const history =
      held && record && row.resume && row.pause.metric === row.resume.metric &&
      row.pause.value !== undefined && row.pause.holdsAbove !== undefined &&
      row.resume.value !== undefined && row.resume.holdsAbove !== undefined
        ? describePastHolds({
            series: record,
            metric: row.pause.metric,
            pause: { value: row.pause.value, holdsAbove: row.pause.holdsAbove },
            restart: { value: row.resume.value, holdsAbove: row.resume.holdsAbove },
          })
        : null;
    /* A held group's history reads its pause line too, so areas held by different pause
       lines are different groups even when one restart lifts them. */
    const key = `${state}|${condition ?? ""}|${history ?? ""}`;
    const group = groups.get(key) ?? { state, status: GROUP_STATUS[state], condition, distance, history, areas: [] };
    group.areas.push({
      area: row.area,
      label: decisionAreaLabel(row.area),
      rule: row.rule,
      ...(showsChange(row) && row.changed ? { changed: row.changed } : {}),
    });
    groups.set(key, group);
  }
  return STATE_ORDER.flatMap((state) => [...groups.values()].filter((group) => group.state === state));
};
