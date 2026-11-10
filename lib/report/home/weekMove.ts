import { classifyRegime } from "../../regimeEngineCore";
import type { RegimeKey } from "../../types";
import type { DecisionArea } from "../boundedDecisionRules";
import type { LineState } from "../operatingCalls";
import type { AreaStripModel } from "./homeSectionModel";

/**
 * The week's move, replayed on the card (2026-11-09).
 *
 * On a week the conditions changed or an area changed standing, the card performs the
 * change once on arrival: the reading travels from the earlier reading's scores to this
 * week's, the weather stamp turns as the reading crosses the change line, and each area
 * that moved ticks from its old standing to its new one. A week nothing moved builds no
 * model, and the card stays still: most weeks nothing moves, and motion that plays every
 * Monday would say otherwise.
 *
 * The model is data only. The motion is CSS (`app/styles/week-move.css`), so it starts
 * with the first paint and the page never shows this week's state and then rewinds it.
 */
export type WeekMove = {
  /** The earlier reading's date as the comparison prints it: "Oct 26". */
  since: string;
  /** The earlier reading's scores, where the travel starts. */
  from: { tightness: number; riskAppetite: number };
  /**
   * The earlier conditions, and how far through the travel's duration (0–1) the reading
   * crosses into this week's. Null on a week the conditions held.
   */
  conditions: { from: RegimeKey; at: number } | null;
  /** The earlier standing of each area whose standing changed. */
  areas: Partial<Record<DecisionArea, { state: LineState; label: string }>>;
};

type Scores = WeekMove["from"];

/* The travel's easing, as `week-move.css` sets it: cubic-bezier(0.65, 0, 0.35, 1). */
const EASE_X1 = 0.65;
const EASE_X2 = 0.35;

/**
 * How far through its duration (0–1) an eased travel has covered `progress` (0–1) of its
 * distance: the moment the reading reaches a line, so what the line changes can change
 * with it. The curve's control points sit at y = 0 and y = 1, so distance is
 * 3s² − 2s³ in the curve's own parameter; solve that for `progress`, then read the time.
 */
export const travelTimeAt = (progress: number): number => {
  const target = Math.min(1, Math.max(0, progress));
  let low = 0;
  let high = 1;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    if (3 * mid * mid - 2 * mid * mid * mid < target) low = mid;
    else high = mid;
  }
  const s = (low + high) / 2;
  const time = 3 * (1 - s) * (1 - s) * s * EASE_X1 + 3 * (1 - s) * s * s * EASE_X2 + s * s * s;
  return Number(time.toFixed(3));
};

const TRAVEL_SAMPLES = 200;

/* Where along the straight path from the earlier scores to this week's the reading
   enters this week's conditions for good, as a share of the distance. */
const conditionsCrossing = (
  from: Scores,
  to: Scores,
  regime: RegimeKey,
  thresholds: { tightness: number; riskAppetite: number },
): number => {
  for (let index = TRAVEL_SAMPLES - 1; index >= 0; index -= 1) {
    const share = index / TRAVEL_SAMPLES;
    const at = classifyRegime(
      from.tightness + (to.tightness - from.tightness) * share,
      from.riskAppetite + (to.riskAppetite - from.riskAppetite) * share,
      { tightnessRegime: thresholds.tightness, riskAppetiteRegime: thresholds.riskAppetite },
    );
    if (at !== regime) return (index + 1) / TRAVEL_SAMPLES;
  }
  /* The scores alone never left this week's conditions (a governed reading): turn midway. */
  return 0.5;
};

export const buildWeekMove = ({
  since,
  previous,
  current,
  previousRegime,
  regime,
  thresholds,
  strip,
  previousStrip,
}: {
  since: string;
  previous: Scores | null | undefined;
  current: Scores;
  previousRegime: RegimeKey | null | undefined;
  regime: RegimeKey;
  thresholds: { tightness: number; riskAppetite: number };
  strip: AreaStripModel | null;
  /** The strip as the earlier reading's scores would have drawn it. */
  previousStrip: AreaStripModel | null;
}): WeekMove | null => {
  if (!previous) return null;
  const areas: WeekMove["areas"] = {};
  for (const cell of strip?.cells ?? []) {
    const earlier = previousStrip?.cells.find((candidate) => candidate.area === cell.area);
    if (earlier && earlier.state !== cell.state) areas[cell.area] = { state: earlier.state, label: earlier.label };
  }
  const conditionsChanged = Boolean(previousRegime) && previousRegime !== regime;
  if (!conditionsChanged && Object.keys(areas).length === 0) return null;
  return {
    since,
    from: previous,
    conditions:
      conditionsChanged && previousRegime
        ? { from: previousRegime, at: travelTimeAt(conditionsCrossing(previous, current, regime, thresholds)) }
        : null,
    areas,
  };
};
