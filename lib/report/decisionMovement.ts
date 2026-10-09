import { previousScoresFromDynamics } from "../export/scoreReference";
import { formatThresholdNumber } from "../formatters";
import type { RegimeKey } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import {
  decisionAreaLabel,
  decisionAreaOrder,
  isRuleConditionMet,
  ruleMetricLabel,
  type BoundedDecisionRule,
  type DecisionArea,
  type RuleCondition,
  type RuleConditionMetric,
} from "./boundedDecisionRules";
import { operatingLeverToDecisionArea } from "./businessAreaMap";
import { comparisonBasis } from "./comparisonBasis";
import type { ActionStripItem } from "./operatingCalls";
import { classifyRegimeQuadrant } from "../regimeStateMachine";
import type { ComparedWith, ReportDynamics } from "./reportDataTypes";
import { buildCallChangeLine } from "./reportEvidence";

/**
 * What the week's move did to the decisions, not to the market.
 *
 * A score can move a long way and change nothing anyone should do: funding pressure
 * going from 84 to 90 while it is already past its pause line is a bigger number and the
 * same guidance. The other way round, a two-point move across a line changes what an area
 * should do this week. The sentence this replaces said "Pressure increased by +3.0 this
 * week. Slow new commitments until conditions stabilize", in the archive, twice, beside
 * "freeze new commitments" — an invented unit and an instruction that disagreed with the
 * guidance it sat under.
 *
 * Each area is a small state against its own lines: paused when any pause line holds,
 * resumable when every numeric resume line holds, holding otherwise. This compares that
 * state at the earlier reading with the state now, and names the lines that decided it.
 * Nothing here scores or classifies: it reads the same conditions the rules table prints,
 * through the same `isRuleConditionMet`, so it cannot say a line was crossed that the row
 * beside it does not draw.
 */

type Scores = Record<RuleConditionMetric, number>;

/** One area's numeric lines. A rule with no line for a side leaves that side empty. */
type AreaLines = {
  area: DecisionArea;
  pause: readonly RuleCondition[];
  resume: readonly RuleCondition[];
};

export const areaLinesFromRules = (
  rules: readonly Pick<BoundedDecisionRule, "area" | "pause" | "resume">[],
): AreaLines[] =>
  rules.map((rule) => ({ area: rule.area, pause: rule.pause.conditions, resume: rule.resume.conditions }));

export const areaLinesFromActionStrip = (
  items: readonly Pick<ActionStripItem, "lever" | "pauseConditions" | "resumeConditions">[],
): AreaLines[] =>
  items.map((item) => ({
    area: operatingLeverToDecisionArea[item.lever],
    pause: item.pauseConditions ?? [],
    resume: item.resumeConditions ?? [],
  }));

type AreaState = "pause" | "hold" | "resume";

/**
 * How an area moved between the two readings. `resumable` is where the resume lines now
 * hold, from a pause or from holding: a state that excludes the pause, so a pause that
 * lifted on the way is not a separate movement. `lifted` is a pause that no longer applies
 * with the resume lines not yet met.
 */
export type AreaMovementKind = "paused" | "lifted" | "resumable" | "resumeLost" | "held";

type CrossedLine = {
  metric: RuleConditionMetric;
  /** "Funding pressure" */
  label: string;
  /** The score at which the line sits. */
  value: number;
  /** Which way the score went through it. */
  direction: "rose" | "fell";
};

type AreaMovement = {
  area: DecisionArea;
  kind: AreaMovementKind;
  /** Where the area stands now: what its lines say, not what the guidance text says. */
  state: AreaState;
  /** The lines that decided the movement, in the order the area states them. Empty when it held. */
  crossed: CrossedLine[];
  /** A table cell's worth: "Pause now applies: funding pressure rose through 76." */
  text: string;
};

/** The areas that moved the same way, with the lines that decided it for any of them, once each. */
type MovementGroup = {
  kind: Exclude<AreaMovementKind, "held">;
  areas: DecisionArea[];
  crossed: CrossedLine[];
};

export type DecisionMovement = {
  /** "Aug 31", or null where the source did not date the earlier reading. */
  comparedWith: string | null;
  /** Set when the market state itself changed between the two readings, as reader names. */
  conditions: { from: string; to: string } | null;
  /** Every area, in the page's row order. */
  areas: AreaMovement[];
  /** The areas whose state moved, in the same order. */
  moved: AreaMovement[];
  /** `moved`, grouped by how it moved: the clauses of the sentence, for a surface that wants them as data. */
  groups: MovementGroup[];
  /** The one sentence: what changed for decisions, and which lines did it. */
  sentence: string;
  /** `sentence` without the lines that did it, for a surface with room for the consequence and not the evidence (a link preview, a card). */
  headline: string;
  /** `headline`, then whole sentences that say less, in the order to try them: for a box of fixed size, through `fitMovementHeadline`. */
  headlines: string[];
};

const stateAt = (lines: AreaLines, scores: Scores): AreaState => {
  if (lines.pause.some((line) => isRuleConditionMet(line, scores[line.metric]))) return "pause";
  if (lines.resume.length > 0 && lines.resume.every((line) => isRuleConditionMet(line, scores[line.metric]))) return "resume";
  return "hold";
};

const kindOf = (from: AreaState, to: AreaState): AreaMovementKind => {
  if (from === to) return "held";
  if (to === "pause") return "paused";
  if (to === "resume") return "resumable";
  return from === "pause" ? "lifted" : "resumeLost";
};

type Flip = CrossedLine & { holds: boolean };

/** The lines whose verdict differs between the two readings, with the verdict now. */
const flippedLines = (conditions: readonly RuleCondition[], previous: Scores, current: Scores): Flip[] =>
  conditions.flatMap((line) => {
    const holds = isRuleConditionMet(line, current[line.metric]);
    if (isRuleConditionMet(line, previous[line.metric]) === holds) return [];
    return [
      {
        metric: line.metric,
        label: ruleMetricLabel[line.metric],
        value: line.value,
        direction: current[line.metric] > previous[line.metric] ? "rose" : "fell",
        holds,
      },
    ];
  });

const lowerFirst = (value: string) => `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
const upperFirst = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const joinAnd = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const describeCrossing = (line: CrossedLine) =>
  `${lowerFirst(line.label)} ${line.direction} through ${formatThresholdNumber(line.value)}`;

const AREA_TEXT: Record<Exclude<AreaMovementKind, "held">, string> = {
  paused: "Pause now applies",
  lifted: "Pause lifted",
  resumable: "Resume line met",
  resumeLost: "Resume line no longer met",
};

/*
 * A held area says which side of its lines it held on. "No line crossed since Sep 30" printed
 * alone beside "Pause if Funding pressure > 76 · crossed" read as the row contradicting itself:
 * the first is about the week, the second about where the score stands. Naming the state the
 * area held in joins them. Between its lines there is nothing to add.
 */
const HELD_STATE_TEXT: Record<AreaState, string | null> = {
  pause: "Pause still applies",
  resume: "Resume line still met",
  hold: null,
};

const describeHeld = (state: AreaState, window: string) => {
  const prefix = HELD_STATE_TEXT[state];
  return prefix ? `${prefix}: no line crossed ${window}.` : `No line crossed ${window}.`;
};

const GROUP_CLAUSE: Record<Exclude<AreaMovementKind, "held">, (areas: string) => string> = {
  paused: (areas) => `the pause now applies to ${areas}`,
  lifted: (areas) => `the pause no longer applies to ${areas}`,
  resumable: (areas) => `the resume line is now met for ${areas}`,
  resumeLost: (areas) => `the resume line is no longer met for ${areas}`,
};

const GROUP_ORDER: readonly Exclude<AreaMovementKind, "held">[] = ["paused", "lifted", "resumable", "resumeLost"];

const moveOf = (
  lines: AreaLines,
  previous: Scores,
  current: Scores,
  window: string,
): AreaMovement => {
  const from = stateAt(lines, previous);
  const to = stateAt(lines, current);
  const kind = kindOf(from, to);
  const pauseFlips = flippedLines(lines.pause, previous, current);
  const resumeFlips = flippedLines(lines.resume, previous, current);
  const liftedPause = pauseFlips.filter((flip) => !flip.holds);
  const resumeNowHolds = resumeFlips.filter((flip) => flip.holds);
  /* Coming out of a pause into resumable, the resume line is the further one a score has
     passed, so it is the line named; the pause line it also passed is implied by it. */
  const decisive: Record<AreaMovementKind, Flip[]> = {
    held: [],
    paused: pauseFlips.filter((flip) => flip.holds),
    lifted: liftedPause,
    resumable: resumeNowHolds.length > 0 ? resumeNowHolds : liftedPause,
    resumeLost: resumeFlips.filter((flip) => !flip.holds),
  };
  const crossed = decisive[kind].map(({ metric, label, value, direction }) => ({ metric, label, value, direction }));
  const text =
    kind === "held"
      ? describeHeld(to, window)
      : `${from === "pause" && kind === "resumable" ? "Pause lifted, resume line met" : AREA_TEXT[kind]}: ${joinAnd(crossed.map(describeCrossing))}.`;
  return { area: lines.area, kind, state: to, crossed, text };
};

const listAreas = (areas: readonly DecisionArea[], total: number) =>
  total > 1 && areas.length === total ? "every area" : joinAnd(areas.map(decisionAreaLabel));

const AREA_COUNT_WORDS = ["no", "one", "two", "three", "four", "five"] as const;

const countAreas = (count: number, total: number) =>
  total > 1 && count === total
    ? "every area"
    : `${AREA_COUNT_WORDS[count] ?? String(count)} ${count === 1 ? "area" : "areas"}`;

const uniqueLines = (lines: readonly CrossedLine[]) =>
  lines.filter(
    (line, index) =>
      lines.findIndex((other) => other.metric === line.metric && other.value === line.value && other.direction === line.direction) === index,
  );

/**
 * The week's decision movement, or null when nothing was compared (or no area states a
 * line): the caller keeps its "no previous reading" sentence rather than getting a claim
 * that nothing crossed from a comparison nobody made.
 *
 * "Since Sep 29" names the reading the move is against — last week's published brief, or
 * the previous month-end snapshot where there is none (`lib/report/comparisonBasis.ts`) —
 * and reads "this week" where the source did not date it.
 */
export const buildDecisionMovement = ({
  scores,
  previous,
  thresholds,
  regime,
  areas,
}: {
  scores: Scores;
  previous: (Scores & { comparedWith?: Pick<ComparedWith, "label"> | null }) | null | undefined;
  thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
  /** The market state now, as assessed. The earlier one is what the earlier scores classify into. */
  regime: RegimeKey;
  areas: readonly AreaLines[];
}): DecisionMovement | null => {
  if (!previous || areas.length === 0) return null;

  const basis = comparisonBasis(previous.comparedWith);
  const window = basis.date ? basis.since : "this week";
  const earlier: Scores = { tightness: previous.tightness, riskAppetite: previous.riskAppetite };
  const ordered = [...areas].sort((left, right) => decisionAreaOrder.indexOf(left.area) - decisionAreaOrder.indexOf(right.area));
  const movements = ordered.map((lines) => moveOf(lines, earlier, scores, window));
  const moved = movements.filter((entry) => entry.kind !== "held");

  /* The earlier state is what the earlier scores classify into, which is how the loader
     scored that reading. The state now is the assessed one, and it can be a step behind its
     own scores while a change waits on confirmation. Then the two sources disagree about
     "now", and a change from one to the other would be a claim about the wrong pair, so the
     sentence says nothing about the state rather than guess (the hero and the confirmation
     notice already carry it). */
  const previousRegime = classifyRegimeQuadrant({ ...earlier, thresholds });
  const scoresAgreeWithState = classifyRegimeQuadrant({ ...scores, thresholds }) === regime;
  const conditions =
    scoresAgreeWithState && previousRegime !== regime
      ? { from: getRegimePublicLabel(previousRegime), to: getRegimePublicLabel(regime) }
      : null;

  const groups: MovementGroup[] = GROUP_ORDER.flatMap((kind) => {
    const inGroup = moved.filter((entry) => entry.kind === kind);
    return inGroup.length > 0
      ? [{ kind, areas: inGroup.map((entry) => entry.area), crossed: uniqueLines(inGroup.flatMap((entry) => entry.crossed)) }]
      : [];
  });

  const { sentence, headline, headlines } = ((): { sentence: string; headline: string; headlines: string[] } => {
    if (moved.length === 0) {
      const nothing = conditions
        ? `Conditions changed from ${conditions.from} to ${conditions.to} ${window}, but no pause or resume line was crossed.`
        : `Conditions held steady ${window}; no pause or resume line was crossed. Last week's guidance stands.`;
      return { sentence: nothing, headline: nothing, headlines: [nothing] };
    }
    const clauses = groups.map((group) => GROUP_CLAUSE[group.kind](listAreas(group.areas, movements.length)));
    const lead = conditions
      ? `${upperFirst(window)}, conditions changed from ${conditions.from} to ${conditions.to} and `
      : `${upperFirst(window)}, `;
    const full = `${lead}${clauses.join("; ")}.`;
    /* The share card's "What changed" box holds 140 characters, and a week that changed
       conditions and moved areas two ways ran to 174, so the card printed "…New bets; the…".
       Each shorter form is a whole sentence that says less, never one cut through. The
       conditions clause goes first, because the card prints the conditions now in its own
       label; then the areas go to a count. */
    const withoutConditions = `${upperFirst(window)}, ${clauses.join("; ")}.`;
    const counted = `${lead}${countAreas(moved.length, movements.length)} crossed a pause or resume line.`;
    /* Short sentences, each group with its own cause. It was one sentence with a
       semicolon between the groups and a colon before every cause at once — 45
       words on a week that changed conditions and moved areas two ways — so a
       reader had to hold the areas in mind until the causes arrived. */
    const grouped = groups.map(
      (group) =>
        `${GROUP_CLAUSE[group.kind](listAreas(group.areas, movements.length))}, because ${joinAnd(group.crossed.map(describeCrossing))}`,
    );
    const sentence = conditions
      ? [`${upperFirst(window)}, conditions changed from ${conditions.from} to ${conditions.to}.`, ...grouped.map((clause) => `${upperFirst(clause)}.`)].join(" ")
      : [`${upperFirst(window)}, ${grouped[0]}.`, ...grouped.slice(1).map((clause) => `${upperFirst(clause)}.`)].join(" ");
    return {
      sentence,
      headline: full,
      headlines: [...new Set([full, withoutConditions, counted])],
    };
  })();

  return { comparedWith: basis.date, conditions, areas: movements, moved, groups, sentence, headline, headlines };
};

/**
 * What the week did to the guidance: `"conditions"` when the conditions changed (the
 * week's `regimeChanged`, or a change the movement names), `"lines"` when an area's pause
 * or resume line was crossed under the same conditions, `"held"` when neither — the week
 * the movement sentence calls "Last week's guidance stands" — and null when nothing was
 * compared.
 *
 * Not the operating latitude. That number is a blend of the two scores, so it can stay
 * flat while one score crosses a pause line and the other moves the opposite way; every
 * "nothing changed" claim read it until 2026-10-07, and "This week's guidance is
 * unchanged." printed over weeks that paused four areas.
 */
export type GuidanceChange = "conditions" | "lines" | "held";

export const describeGuidanceChange = ({
  movement,
  regimeChanged,
}: {
  movement: Pick<DecisionMovement, "moved" | "conditions"> | null;
  regimeChanged: boolean | undefined;
}): GuidanceChange | null => {
  if (regimeChanged === true || movement?.conditions) return "conditions";
  if (!movement) return null;
  return movement.moved.length > 0 ? "lines" : "held";
};

/**
 * The first form of the headline that fits `maxLength`, so the most it can say whole. When
 * none does (an earlier reading with an unusually long label), the shortest, for the
 * caller's own clamp to finish: it cuts less of a sentence than it would of the full one.
 */
/**
 * The week's cause in one line, for the verdict on the homepage: the lines the scores
 * crossed since the earlier reading ("Risk appetite fell through 54."), or that none
 * was crossed. The decision consequences are "What changed this week"'s sentence; this
 * is only the why, short enough to sit under the headline action.
 */
export const describeMovementCause = (movement: Pick<DecisionMovement, "groups" | "comparedWith">): string => {
  const crossings = uniqueLines(movement.groups.flatMap((group) => group.crossed)).map(describeCrossing);
  if (crossings.length > 0) return `${upperFirst(joinAnd(crossings))}.`;
  return movement.comparedWith
    ? `No score crossed a pause or resume line since ${movement.comparedWith}.`
    : "No score crossed a pause or resume line.";
};

export const fitMovementHeadline = (movement: Pick<DecisionMovement, "headline" | "headlines">, maxLength: number): string =>
  movement.headlines.find((line) => line.length <= maxLength)
  ?? movement.headlines.reduce((shortest, line) => (line.length < shortest.length ? line : shortest), movement.headline);

/**
 * The same movement for a loaded report, for the surfaces that hold the whole thing (the
 * agent state, the CLI): the earlier scores come from the week's dynamics through the
 * derivation every paste and page shares, and the areas' lines from the action strip the
 * rules table prints.
 */
export const buildDecisionMovementForReport = ({
  assessment,
  reportDynamics,
  actionStripItems,
}: {
  assessment: { regime: RegimeKey; scores: Scores; thresholds: { tightnessRegime: number; riskAppetiteRegime: number } };
  reportDynamics: Pick<ReportDynamics, "directionLabel" | "changedSignals" | "anomalySignals" | "comparedWith">;
  actionStripItems?: readonly ActionStripItem[];
}): DecisionMovement | null => {
  const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };
  return buildDecisionMovement({
    scores,
    previous: previousScoresFromDynamics(reportDynamics, scores),
    thresholds: assessment.thresholds,
    regime: assessment.regime,
    areas: areaLinesFromActionStrip(actionStripItems ?? []),
  });
};

type CallChangeSource = Parameters<typeof buildCallChangeLine>[0];

/**
 * The standup line: one line for a team's daily or sprint standup, saying whether the
 * guidance moved this week and what would change it (`buildCallChangeLine`), from what the
 * week did to the guidance (`describeGuidanceChange`). A held week says the guidance is on
 * hold whatever the scores did, since the hold is the guidance.
 *
 * Until 2026-10-07 the second half was the nearest market move from `buildFlipProximity`,
 * in its own unit: "Conditions changed to Stormy, 0.22% from flip; review pace." on a week
 * every other surface said the nearer line was risk appetite's, 9 points away, and
 * "Guidance unchanged, 0.15% from flip; no pace change." on a held week whose guidance
 * changes when the two scores agree, not when a rate moves. Before that it read the
 * operating latitude's move, so "Call unchanged" printed over a crossed pause line.
 */
export const buildStandupLine = ({
  regime,
  change,
  ...source
}: CallChangeSource & {
  regime: RegimeKey;
  /** What the week did to the guidance; null when nothing was compared. */
  change: GuidanceChange | null;
}): string => {
  const callChange = buildCallChangeLine(source);
  if (source.weeklyCall.policyOverrideActive) return `Guidance on hold this week; no pace change. ${callChange}`;
  if (change === null) return `No earlier reading to compare with. ${callChange}`;
  if (change === "held") return `Guidance unchanged; no pace change. ${callChange}`;
  if (change === "conditions") return `Conditions changed to ${getRegimePublicLabel(regime)}; review pace. ${callChange}`;
  return `Guidance changed at a pause or resume line; review pace. ${callChange}`;
};
