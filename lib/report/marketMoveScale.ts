import type { RegimeScores } from "../regimeEngineCore";
import type { TimeMachineYieldCurveEntry } from "../timeMachine/timeMachineCache";
import { calibrationMonthRows } from "./confidenceCalibration";
import { regimeSignalLabel } from "./signalTranslations";

/**
 * How big a move is, for a reader who cannot tell whether 0.18 points, or 8
 * points of a score, is a lot.
 *
 * "If the 1-month Treasury bill rate falls 0.18 percentage points, conditions
 * turn Stormy" is exact and, to most readers, unreadable: the sentence gives a
 * size with nothing to hold it against. Two yardsticks are ones they meet in
 * the news, so that a headline and the line can be compared without help:
 *
 * - the quarter-point step the Federal Reserve moves its rate in, for the short
 *   rate only (the curve is not set in Fed steps). Since 2026-11-03 it leads the
 *   sentence ("Less than one quarter-point Fed cut turns conditions Stormy"), and
 *   the bill rate it stands for follows it;
 * - how often the record moved that far in a single month, out of the
 *   month-to-month changes since 2012.
 *
 * The frequency is a count from the month-end record, not a probability, and is
 * worded as one. A median monthly move was the first yardstick tried; the bill
 * sat at zero from 2012 to 2015 and moves in Fed steps since, so its median was
 * 0.03 and every distance read as "many typical months". A count says what the
 * median hid: most months the bill does not move at all, and some months it
 * moves a lot.
 *
 * The two scores get the same count (2026-11-03). "Hiring — 24 pts from
 * restarting", "11 pts from pausing" and "Risk appetite 3 pts from Freezing" were
 * distances in a unit no reader has a feel for, so each says how often the
 * month-end record moved that score that far in one month, as a band
 * (`describeScoreMoveBand`).
 */

const FED_STEP = 0.25;
/** Within this of a whole number of steps, the move is "about" that many. */
const STEP_TOLERANCE = 0.03;
/** Under a year of month-to-month changes, a count says nothing about how often. */
const MIN_RECORD_CHANGES = 12;

type ScaledInput = "baseRate" | "curveSlope";

type MonthlyValue = { year: number; value: number };

/** How many month-to-month changes moved at least a given size, out of how many. */
type MoveCount = { atLeast: number; changes: number };

const monthlyValues = (
  input: ScaledInput,
  baseRateUsed: RegimeScores["baseRateUsed"],
  series: readonly TimeMachineYieldCurveEntry[],
): MonthlyValue[] =>
  series.flatMap((entry) => {
    const value =
      input === "curveSlope" ? entry.spread10Y2Y : baseRateUsed === "3M" ? entry.threeMonth : entry.oneMonth;
    return typeof value === "number" && Number.isFinite(value) ? [{ year: entry.year, value }] : [];
  });

/** Month-to-month changes at least `size` points, in either direction, and how many there were. */
const countMonthlyMovesAtLeast = (values: readonly number[], size: number): MoveCount => {
  let atLeast = 0;
  let previous: number | null = null;
  for (const value of values) {
    // Rounded to the basis point the record is published in, so 0.18 counts a 0.18 move.
    if (previous !== null && Math.round(Math.abs(value - previous) * 100) >= Math.round(size * 100)) atLeast += 1;
    previous = value;
  }
  return { atLeast, changes: Math.max(values.length - 1, 0) };
};

/**
 * How often, as a reader says it: "about 1 month in 6" rather than "29 of the 176
 * months on record", which left the division to the reader. Past tense and dated,
 * because it is what the record did, not what the next month will do.
 */
const describeMonthlyFrequency = ({ atLeast, changes }: MoveCount, since: number): string => {
  if (atLeast === 0) return `has not moved that far in one month since ${since}`;
  if (atLeast === 1) return `moved that far in one month only once since ${since}`;
  if (atLeast * 2 > changes) return `moved that far in most months since ${since}`;
  return `moved that far in about 1 month in ${Math.round(changes / atLeast)} since ${since}`;
};

/**
 * A score's distance in words: how often the month-end record moved that score at
 * least that far in one month. The cutoffs are the two cadences an operator
 * already plans on, a quarter and a year:
 *
 * - "a common move": at least 1 month in 3, so a quarter's plan should expect one;
 * - "an unusual move": at least 1 month in 12, about once a year or more;
 * - "a rare move": less than once a year on the record;
 * - "a record move": the record never moved that far in one month.
 *
 * On the record to Sep 2026 that puts risk appetite's common moves at up to 5
 * points and its rare ones from 14, and funding pressure, which held still in 157
 * of 176 months, at unusual from 1 point and rare from 4. A band says how big the
 * move is against the record, in either direction; it is not the chance the next
 * month makes it.
 */
const describeMoveBand = ({ atLeast, changes }: MoveCount): "a common" | "an unusual" | "a rare" | "a record" => {
  if (atLeast === 0) return "a record";
  if (atLeast * 3 >= changes) return "a common";
  if (atLeast * 12 >= changes) return "an unusual";
  return "a rare";
};

type ScoreKey = "tightness" | "riskAppetite";

let scoreRecord: Record<ScoreKey, number[]> | null = null;

/** Each score's month-end values, oldest first: the record /history and /calibration read. */
const scoreValues = (score: ScoreKey): number[] => {
  if (!scoreRecord) {
    const rows = calibrationMonthRows();
    scoreRecord = { tightness: rows.map((row) => row.tightness), riskAppetite: rows.map((row) => row.riskAppetite) };
  }
  return scoreRecord[score];
};

/**
 * How far `points` of a score is, as a band ("a rare move"), or null when there
 * is no distance to judge or the record is under a year long. `named` puts the
 * score in as the move's modifier, for a surface that does not name it nearby:
 * "a common risk-appetite move".
 */
export const describeScoreMoveBand = (
  score: ScoreKey,
  points: number,
  { named = false }: { named?: boolean } = {},
): string | null => {
  if (!(points > 0)) return null;
  const counted = countMonthlyMovesAtLeast(scoreValues(score), points);
  if (counted.changes < MIN_RECORD_CHANGES) return null;
  const modifier = named ? ` ${regimeSignalLabel[score].toLowerCase().replaceAll(" ", "-")}` : "";
  return `${describeMoveBand(counted)}${modifier} move`;
};

/**
 * A short-rate move in the Fed's own steps, leading the sentence it ends:
 * "Less than one quarter-point Fed cut turns conditions Stormy." A rise is a
 * hike and a fall a cut, the words the news uses for the same step.
 */
export const describeRateMoveInFedSteps = (move: number, conditionsLabel: string): string => {
  const size = Math.abs(move);
  const step = move > 0 ? "hike" : "cut";
  const steps = size / FED_STEP;
  const nearest = Math.round(steps);
  const whole = Math.floor(steps);
  const [phrase, plural] =
    nearest >= 1 && Math.abs(size - nearest * FED_STEP) <= STEP_TOLERANCE
      ? [nearest === 1 ? `About one quarter-point Fed ${step}` : `About ${nearest} quarter-point Fed ${step}s`, nearest > 1]
      : steps < 1
        ? [`Less than one quarter-point Fed ${step}`, false]
        : [whole === 1 ? `More than one quarter-point Fed ${step}` : `More than ${whole} quarter-point Fed ${step}s`, whole > 1];
  return `${phrase} ${plural ? "turn" : "turns"} conditions ${conditionsLabel}.`;
};

/**
 * How often the record moved as far as one market move, or null when the record
 * is too short to count against. The federal funds rate has no month-end series
 * in the record, so its line carries the Fed step alone.
 */
export const describeMarketMoveScale = ({
  input,
  move,
  baseRateUsed,
  series,
}: {
  input: ScaledInput;
  move: number;
  baseRateUsed: RegimeScores["baseRateUsed"];
  series: readonly TimeMachineYieldCurveEntry[];
}): string | null => {
  const size = Math.abs(move);
  if (!(size > 0) || (input === "baseRate" && baseRateUsed === "FED")) return null;
  const values = monthlyValues(input, baseRateUsed, series);
  const counted = countMonthlyMovesAtLeast(values.map((entry) => entry.value), size);
  const since = values[0]?.year;
  if (counted.changes < MIN_RECORD_CHANGES || since === undefined) return null;
  /* The curve's line names its instrument here, once: the sentence above it says
     the move in plain words ("long rates fall … closer to short rates"). */
  const subject = input === "curveSlope" ? `The ${regimeSignalLabel.curveSlope.toLowerCase()}` : "The rate";
  return `${subject} ${describeMonthlyFrequency(counted, since)}.`;
};
