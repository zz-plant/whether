import { DEFAULT_THRESHOLDS, type RegimeThresholds } from "../regimeEngineCore";
import { getRegimePublicLabel } from "../regimePresentation";
import { formatMonthYearShortFromValue } from "../formatters";
import { buildTimeMachineHref } from "../timeMachine/timeMachineSelection";
import {
  buildRegimeTrackRecord,
  regimeSide,
  type FlippedAxis,
  type RegimeTransitionRecord,
} from "../summary/regimeTrackRecord";
import { regimeSignalLabel } from "./signalTranslations";

/**
 * Advance warning, per change in conditions, from one place (2026-11-18).
 *
 * /history states it three ways: the count beside the track record ("4 of 7 changes
 * had advance warning"), a mark for each change beside that count, and a row per
 * change in "How the record held up" with a small drawing of how the score that
 * crossed approached its line. The words of each row and the label of each mark
 * come from `describeAdvanceWarning`, and the drawing from `buildChangeApproach`,
 * which reads the same transition the words are graded from (§XV: a graphic and its
 * caption from one source).
 */

type Observation = {
  recordDate: string;
  regime: string;
  tightness: number;
  riskAppetite: number;
  shock?: boolean;
};

/**
 * The table's "Advance warning" cell, and the tail of each mark's label: "within 5
 * pts of its line 2 mo before", "none: it crossed from 5+ pts away in one month"
 * (a shock crossing, which the replay walk flags), or "none".
 */
export const describeAdvanceWarning = (
  transition: Pick<RegimeTransitionRecord, "signaled" | "leadMonths">,
  nearBandPts: number,
  shock: boolean,
) =>
  transition.signaled
    ? `within ${nearBandPts} pts of its line ${transition.leadMonths} mo before`
    : shock
      ? `none: it crossed from ${nearBandPts}+ pts away in one month`
      : "none";

type AdvanceWarningMark = {
  atDate: string;
  from: string;
  to: string;
  signaled: boolean;
  /** "Sep 2022". */
  monthLabel: string;
  /** "Sep 2022 · Stormy → Freezing · within 5 pts of its line 2 mo before". */
  label: string;
  /** The month of the change in the time machine. There is no compare view to send it to (`/history/compare` redirects here). */
  href: string;
};

/**
 * Every change on the record, oldest first, graded once. The count the summary
 * prints is `warned` of `total` from this object, and the marks beside it are its
 * `marks`, so the sentence and the drawing cannot disagree.
 */
export const buildAdvanceWarningMarks = (series: readonly Observation[]) => {
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const record = buildRegimeTrackRecord(ordered);
  const shockByDate = new Map(ordered.map((entry) => [entry.recordDate, entry.shock === true]));
  const marks: AdvanceWarningMark[] = record.transitions.map((transition) => {
    const monthLabel = formatMonthYearShortFromValue(transition.atDate);
    const warning = describeAdvanceWarning(transition, record.nearBandPts, shockByDate.get(transition.atDate) === true);
    return {
      atDate: transition.atDate,
      from: transition.from,
      to: transition.to,
      signaled: transition.signaled,
      monthLabel,
      label: `${monthLabel} · ${getRegimePublicLabel(transition.from)} → ${getRegimePublicLabel(transition.to)} · ${warning}`,
      href: buildTimeMachineHref("/", { year: Number(transition.atDate.slice(0, 4)), month: Number(transition.atDate.slice(5, 7)) }),
    };
  });
  return {
    total: record.transitions.length,
    warned: record.signaledCount,
    nearBandPts: record.nearBandPts,
    marks,
  };
};

/** Month-ends drawn before the change, beside the change month itself. */
export const CHANGE_APPROACH_MONTHS_BEFORE = 6;

/**
 * Every approach drawing runs this many points either side of the line, so a change
 * that hugged its line and one that jumped from far off look different on one scale.
 * A reading further out leaves the drawing; the table's footnote says so.
 */
export const CHANGE_APPROACH_SCALE_PTS = 25;

export type ChangeApproach = {
  axis: FlippedAxis;
  /** The axis's change line, on its 0–100 scale. */
  line: number;
  nearBandPts: number;
  /**
   * Oldest first; the last is the change month. `distance` is points from the line,
   * positive on the side the score left and negative past it, so every change reads
   * the same way up: it starts above and ends below.
   */
  points: { recordDate: string; value: number; distance: number }[];
};

/**
 * How the score that crossed approached its line: the six month-ends before a change
 * and the change month, as distance from the line. A change that had warning sits
 * inside the band for the months the row's words count; one that had none runs
 * outside it and drops through in one step.
 *
 * Where a change crossed both lines (none on the record has), the axis drawn is the
 * one nearer its line the month before, which is the one that could have warned.
 * Null when the change is not on `history` or has no month before it.
 */
export const buildChangeApproach = (
  history: readonly Observation[],
  change: Pick<RegimeTransitionRecord, "atDate" | "from" | "flippedAxes">,
  {
    monthsBefore = CHANGE_APPROACH_MONTHS_BEFORE,
    thresholds = DEFAULT_THRESHOLDS,
    nearBandPts,
  }: {
    monthsBefore?: number;
    thresholds?: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime">;
    nearBandPts: number;
  },
): ChangeApproach | null => {
  const ordered = [...history].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const index = ordered.findIndex((entry) => entry.recordDate === change.atDate);
  const before = ordered[index - 1];
  if (index < 1 || !before || change.flippedAxes.length === 0) return null;
  const lineOf = (axis: FlippedAxis) => (axis === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime);
  const [axis] = [...change.flippedAxes].sort(
    (left, right) => Math.abs(before[left] - lineOf(left)) - Math.abs(before[right] - lineOf(right)),
  );
  if (!axis) return null;
  const line = lineOf(axis);
  const leftAbove = regimeSide(change.from, axis);
  return {
    axis,
    line,
    nearBandPts,
    points: ordered.slice(Math.max(0, index - monthsBefore), index + 1).map((entry) => ({
      recordDate: entry.recordDate,
      value: entry[axis],
      distance: leftAbove ? entry[axis] - line : line - entry[axis],
    })),
  };
};

const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0");

/**
 * The drawing's accessible name: "Funding pressure, in points from its line at 70 on
 * the side it left, Mar 2022 to Aug 2022: +70, +70, +44, +10, −1, −5; at the change,
 * Sep 2022: −9."
 */
export const describeChangeApproach = (approach: ChangeApproach) => {
  const before = approach.points.slice(0, -1);
  const change = approach.points.at(-1);
  const firstBefore = before.at(0);
  const lastBefore = before.at(-1);
  if (!change || !firstBefore || !lastBefore) return "";
  return (
    `${regimeSignalLabel[approach.axis]}, in points from its line at ${approach.line} on the side it left, ` +
    `${formatMonthYearShortFromValue(firstBefore.recordDate)} to ${formatMonthYearShortFromValue(lastBefore.recordDate)}: ` +
    `${before.map((point) => signed(point.distance)).join(", ")}; at the change, ` +
    `${formatMonthYearShortFromValue(change.recordDate)}: ${signed(change.distance)}.`
  );
};
