import type { RegimeScores } from "../regimeEngineCore";
import type { TimeMachineYieldCurveEntry } from "../timeMachine/timeMachineCache";

/**
 * How big a market move is, for a reader who cannot tell whether 0.18 points is
 * a lot.
 *
 * "If the 1-month Treasury bill rate falls 0.18 percentage points, conditions
 * turn Stormy" is exact and, to most readers, unreadable: the sentence gives a
 * size with nothing to hold it against. Two yardsticks are ones they meet in
 * the news, so that a headline and the line can be compared without help:
 *
 * - the quarter-point step the Federal Reserve moves its rate in, for the short
 *   rate only (the curve is not set in Fed steps);
 * - how often the record moved that far in a single month: k of the n
 *   month-to-month changes since 2012.
 *
 * The frequency is a count from the month-end record, not a probability, and is
 * worded as one. A median monthly move was the first yardstick tried; the bill
 * sat at zero from 2012 to 2015 and moves in Fed steps since, so its median was
 * 0.03 and every distance read as "many typical months". A count says what the
 * median hid: most months the bill does not move at all, and some months it
 * moves a lot.
 */

const FED_STEP = 0.25;
/** Within this of a whole number of steps, the move is "about" that many. */
const STEP_TOLERANCE = 0.03;

type ScaledInput = "baseRate" | "curveSlope";

const monthlyValues = (
  input: ScaledInput,
  baseRateUsed: RegimeScores["baseRateUsed"],
  series: readonly TimeMachineYieldCurveEntry[],
): number[] =>
  series.flatMap((entry) => {
    const value =
      input === "curveSlope" ? entry.spread10Y2Y : baseRateUsed === "3M" ? entry.threeMonth : entry.oneMonth;
    return typeof value === "number" && Number.isFinite(value) ? [value] : [];
  });

/** Month-to-month changes at least `size` points, in either direction, and how many there were. */
const countMonthlyMovesAtLeast = (values: readonly number[], size: number): { atLeast: number; changes: number } => {
  let atLeast = 0;
  let previous: number | null = null;
  for (const value of values) {
    // Rounded to the basis point the record is published in, so 0.18 counts a 0.18 move.
    if (previous !== null && Math.round(Math.abs(value - previous) * 100) >= Math.round(size * 100)) atLeast += 1;
    previous = value;
  }
  return { atLeast, changes: Math.max(values.length - 1, 0) };
};

const describeFedSteps = (size: number): string => {
  const steps = size / FED_STEP;
  const nearest = Math.round(steps);
  if (nearest >= 1 && Math.abs(size - nearest * FED_STEP) <= STEP_TOLERANCE) {
    return nearest === 1 ? "About one quarter-point Fed move." : `About ${nearest} quarter-point Fed moves.`;
  }
  if (steps < 1) return "Less than one quarter-point Fed move.";
  return `More than ${Math.floor(steps) === 1 ? "one quarter-point Fed move" : `${Math.floor(steps)} quarter-point Fed moves`}.`;
};

/**
 * The yardstick sentence for one market move, or null when the record is too
 * short to count against. The federal funds rate has no month-end series in the
 * record, so it gets the Fed step alone.
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
  if (!(size > 0)) return null;
  const parts: string[] = [];
  if (input === "baseRate") parts.push(describeFedSteps(size));
  if (input === "curveSlope" || baseRateUsed !== "FED") {
    const { atLeast, changes } = countMonthlyMovesAtLeast(monthlyValues(input, baseRateUsed, series), size);
    if (changes >= 12) {
      const subject = input === "curveSlope" ? "The gauge" : "The rate";
      parts.push(
        atLeast === 0
          ? `${subject} has not moved that far in one month since the record began.`
          : `${subject} moved that far in one month in ${atLeast} of the ${changes} months on record.`,
      );
    }
  }
  return parts.length > 0 ? parts.join(" ") : null;
};
