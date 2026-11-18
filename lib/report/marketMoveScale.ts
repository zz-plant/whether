import type { RegimeScores } from "../regimeEngineCore";
import type { TimeMachineYieldCurveEntry } from "../timeMachine/timeMachineCache";
import { calibrationMonthRows } from "./confidenceCalibration";
import { regimeSignalLabel } from "./signalTranslations";
import { formatMonthLabel } from "../timeMachine/monthFormatting";

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

let scoreRecord: (Record<ScoreKey, number[]> & { since: number | null; months: string[] }) | null = null;

/** Each score's month-end values, oldest first: the record /history and /calibration read. */
const readScoreRecord = () => {
  if (!scoreRecord) {
    const rows = calibrationMonthRows();
    const since = Number(rows[0]?.asOf.slice(0, 4));
    scoreRecord = {
      tightness: rows.map((row) => row.tightness),
      riskAppetite: rows.map((row) => row.riskAppetite),
      since: Number.isFinite(since) ? since : null,
      months: rows.map((row) => row.asOf),
    };
  }
  return scoreRecord;
};

const scoreValues = (score: ScoreKey): number[] => readScoreRecord()[score];

/**
 * The record behind one move's band (2026-11-18): every month-to-month move of the
 * score, as bars by whole points, with how many moved at least `points`. The area
 * groups draw it beside "It is 24 points away, a rare one-month move", so "rare" can
 * be seen: the bars past the mark are the months that moved that far. The band is read
 * off the same count (`describeScoreMoveBand` returns it), so the word and the bars
 * are one derivation. Month-end scores are whole numbers, so whole-point bars lose
 * nothing.
 */
export type ScoreMoveHistogram = {
  score: ScoreKey;
  /** The move asked about, in points. */
  points: number;
  /** The band without its noun, as the sentence prints it: "a rare". */
  band: ReturnType<typeof describeMoveBand>;
  /** Month-to-month changes on record, and how many moved at least `points`. */
  changes: number;
  atLeast: number;
  /** The record's first year. */
  since: number;
  /**
   * One bar per whole point, from 0 to the largest move on record or the move asked
   * about, each with what its bar says on hover, focus or a tap ("3 of 177 months moved
   * 4 points, the latest Mar 2020") and the month-end that latest move landed on, which
   * the bar opens in the time machine. Null for no move or none of that size.
   */
  bins: { size: number; count: number; label: string; latest: string | null }[];
  /** The drawing's domain, under it: "177 one-month moves since 2012". */
  caption: string;
};

const pointsWord = (size: number) => (size === 1 ? "point" : "points");

/** The bars and the band for a move of `points`; null when there is no distance or under a year of record. */
export const describeScoreMoveHistogram = (score: ScoreKey, points: number): ScoreMoveHistogram | null => {
  if (!(points > 0)) return null;
  const { since, months } = readScoreRecord();
  const values = scoreValues(score);
  const counted = countMonthlyMovesAtLeast(values, points);
  if (counted.changes < MIN_RECORD_CHANGES || since === null) return null;
  const moves = values.slice(1).map((value, index) => Math.round(Math.abs(value - (values[index] ?? value))));
  const counts = Array.from({ length: Math.max(...moves, Math.ceil(points)) + 1 }, () => 0);
  const latest: (string | null)[] = counts.map(() => null);
  moves.forEach((move, index) => {
    counts[move] = (counts[move] ?? 0) + 1;
    latest[move] = months[index + 1] ?? null;
  });
  const of = (count: number) => `${count} of ${counted.changes} ${counted.changes === 1 ? "month" : "months"}`;
  const monthOf = (asOf: string | null) => {
    const [year, month] = (asOf ?? "").split("-").map(Number);
    return year && month ? formatMonthLabel(year, month) : null;
  };
  const bins = counts.map((count, size) => {
    const last = size > 0 ? monthOf(latest[size] ?? null) : null;
    return {
      size,
      count,
      label: size === 0 ? `${of(count)} did not move` : `${of(count)} moved ${size} ${pointsWord(size)}${last ? `, the latest ${last}` : ""}`,
      latest: size > 0 ? (latest[size] ?? null) : null,
    };
  });
  return {
    score,
    points,
    band: describeMoveBand(counted),
    changes: counted.changes,
    atLeast: counted.atLeast,
    since,
    bins,
    caption: `${counted.changes} one-month moves since ${since}`,
  };
};

/**
 * How far `points` of a score is, as a band ("a rare move"), or null when there
 * is no distance to judge or the record is under a year long. `named` puts the
 * score in as the move's modifier, for a surface that does not name it nearby:
 * "a common risk-appetite move". `move` is the record already read for this
 * distance (`describeScoreMoveHistogram`), where the caller draws it too.
 */
export const describeScoreMoveBand = (
  score: ScoreKey,
  points: number,
  { named = false, move = describeScoreMoveHistogram(score, points) }: { named?: boolean; move?: ScoreMoveHistogram | null } = {},
): string | null => {
  if (!move) return null;
  const modifier = named ? ` ${regimeSignalLabel[score].toLowerCase().replaceAll(" ", "-")}` : "";
  return `${move.band}${modifier} move`;
};

export type ScoreMoveRanges = Record<ScoreKey, { common: number; unusual: number }>;

/**
 * The largest month-to-month move each band reaches, as a size in points: how far a
 * common and an unusual month has moved each score. The same counts as
 * `describeScoreMoveBand`, for a drawing of them: a cone made of what the record did, not
 * a chance of what the next month does. Null under a year of record.
 */
export const describeScoreMoveRanges = (): ScoreMoveRanges | null => {
  const range = (score: ScoreKey) => {
    const values = scoreValues(score);
    const moves = values.slice(1).map((value, index) => Math.abs(value - (values[index] ?? value))).sort((a, b) => b - a);
    const reached = (share: number) => moves[Math.max(Math.ceil(moves.length * share) - 1, 0)] ?? 0;
    return moves.length < MIN_RECORD_CHANGES ? null : { common: reached(1 / 3), unusual: reached(1 / 12) };
  };
  const tightness = range("tightness");
  const riskAppetite = range("riskAppetite");
  return tightness && riskAppetite ? { tightness, riskAppetite } : null;
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
