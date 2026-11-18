/**
 * The quarter-point step the Federal Reserve moves its rate in, as a size for a
 * short-rate move: the one yardstick for a rate move a reader meets in the news.
 *
 * Its own module, with no imports, because a client island words a move too: the
 * rate control on `/trust` says "about two quarter-point Fed cuts below this week"
 * at every stop of its range, and `marketMoveScale.ts`, which re-exports
 * `describeRateMoveInFedSteps` from here, reads the bundled month-end record.
 */

export const FED_STEP = 0.25;
/** Within this of a whole number of steps, the move is "about" that many. */
const STEP_TOLERANCE = 0.03;

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"] as const;

/** A count in words up to nine, as prose prints small numbers: "two quarter-point Fed cuts". */
const countWord = (count: number) => COUNT_WORDS[count] ?? String(count);

const upperFirst = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/**
 * A move in Fed steps, lower case, for inside a sentence: "about one quarter-point
 * Fed cut", "less than one quarter-point Fed hike", "more than two quarter-point Fed
 * cuts". A rise is a hike and a fall a cut, the words the news uses for the same
 * step. `plural` says which verb form the phrase takes as a subject.
 */
export const describeFedSteps = (move: number): { phrase: string; plural: boolean } => {
  const size = Math.abs(move);
  const step = move > 0 ? "hike" : "cut";
  const steps = size / FED_STEP;
  const nearest = Math.round(steps);
  const whole = Math.floor(steps);
  if (nearest >= 1 && Math.abs(size - nearest * FED_STEP) <= STEP_TOLERANCE) {
    return { phrase: `about ${countWord(nearest)} quarter-point Fed ${step}${nearest > 1 ? "s" : ""}`, plural: nearest > 1 };
  }
  if (steps < 1) return { phrase: `less than one quarter-point Fed ${step}`, plural: false };
  return { phrase: `more than ${countWord(whole)} quarter-point Fed ${step}${whole > 1 ? "s" : ""}`, plural: whole > 1 };
};

/**
 * A whole number of steps, as a choice names it: "one quarter-point Fed cut",
 * "three quarter-point Fed cuts". `steps` is signed: below zero a cut, above a hike.
 */
export const describeWholeFedSteps = (steps: number): string => {
  const count = Math.abs(steps);
  return `${countWord(count)} quarter-point Fed ${steps > 0 ? "hike" : "cut"}${count > 1 ? "s" : ""}`;
};

/**
 * A short-rate move in the Fed's own steps, leading the sentence it ends:
 * "Less than one quarter-point Fed cut turns conditions Stormy."
 */
export const describeRateMoveInFedSteps = (move: number, conditionsLabel: string): string => {
  const { phrase, plural } = describeFedSteps(move);
  return `${upperFirst(phrase)} ${plural ? "turn" : "turns"} conditions ${conditionsLabel}.`;
};

/** A short rate as the page prints it: "3.85%". */
export const formatShortRate = (rate: number) => `${rate.toFixed(2)}%`;

/** Where `/trust` keeps the rate its control is set to (UI standards §V): `/trust?rate=3.85`. */
export const RATE_PARAM = "rate";

/** The rate a `?rate=` names, to the hundredth; undefined for anything that is not one. */
export const parseRateParam = (value: string | undefined): number | undefined =>
  value !== undefined && /^\d{1,2}(\.\d{1,2})?$/.test(value) ? Number(value) : undefined;

/** Within this of this week's rate, a stop on the rate control is this week. */
const SAME_RATE = 0.005;

/**
 * The answer under the rate control on `/trust`, what would move first (`lead`, from
 * `buildRateDial`), then where the rate sits in Fed steps and what funding pressure would
 * be: "Hiring would restart. At 3.85%, about one quarter-point Fed cut below this week,
 * funding pressure would be 63, with everything else as this week." At this week's own
 * rate it says so: "That's this week: the 1-month rate is 4.10% and funding pressure is 90."
 */
export const describeRateDialAnswer = ({
  rate,
  thisWeek,
  rateName,
  tightness,
  lead,
}: {
  rate: number;
  thisWeek: number;
  /** "the 1-month rate". */
  rateName: string;
  tightness: number;
  /** "Hiring would restart." */
  lead: string;
}): string => {
  if (Math.abs(rate - thisWeek) < SAME_RATE) {
    return `That's this week: ${rateName} is ${formatShortRate(rate)} and funding pressure is ${tightness}.`;
  }
  const { phrase } = describeFedSteps(rate - thisWeek);
  return `${lead} At ${formatShortRate(rate)}, ${phrase} ${rate < thisWeek ? "below" : "above"} this week, funding pressure would be ${tightness}, with everything else as this week.`;
};
