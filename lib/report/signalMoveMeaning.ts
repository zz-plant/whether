import { REGIME_CONFIDENCE_NEAR_THRESHOLD } from "../regimeEngineCore";
import type { ComparisonBasis } from "./comparisonBasis";
import { describeInputMovement } from "./inputMovement";
import type { RegimeSignalKey } from "./reportFormatting";

/**
 * What a move in one of the four numbers means, in everyday words, for the row
 * that leads the homepage's "What changed" table (2026-11-03).
 *
 * The table printed each move as a from-chip ("from 40 ↘") beside a ladder, and a
 * reader without macro background could not tell what 40 to 32 on "Funding
 * pressure" did for them, or whether 0.04 on a borrowing rate was a lot. Each row
 * now opens on a sentence ("Money got easier to raise.", "Borrowing got slightly
 * cheaper.", "No real change."), and the numbers stay on the ladder and in the
 * value cell, second.
 *
 * The sentence says what the number's own scale says and nothing more: funding
 * pressure is how hard money is to raise (its scale reads "0 = easier funding"),
 * risk appetite is how cautious investors are ("0 = risk-averse investors"), the
 * short-term rate is what borrowing costs, and the recession warning gauge warns
 * below zero (`signalPlainEnglish`). It names no cause; the row's "What moved it"
 * line says what the move is made of.
 *
 * The size words, by unit:
 *
 * Scores, in whole points of the 0–100 scale:
 *   0            "No change."
 *   under 3      "No real change." The cut under which the section's lead says
 *                "Neither score moved much" (`describeInputMovement`), asked of
 *                this score alone, so a row and the lead cannot disagree.
 *   3 to 5       "slightly". At most the distance the brief calls close to a
 *                line (`REGIME_CONFIDENCE_NEAR_THRESHOLD`, the area badges'
 *                "close" and the room before a change's "Little").
 *   6 to 11      no size word.
 *   12 or more   "much". Where the operating latitude's move turns "sharply"
 *                (`getNetDeltaLabel`), the other 0–100 move the brief sizes.
 *
 * Market inputs, in basis points (hundredths of a percentage point), as the
 * record publishes them:
 *   0            "No change."
 *   3 or fewer   "No real change." The tolerance within which a rate move counts
 *                as "about" a whole number of Fed moves (`marketMoveScale.ts`),
 *                here none.
 *   under the notable size        "slightly"
 *   up to twice the notable size  no size word
 *   twice it or more              "much"
 * The notable size is the move between two readings the alert calls unusual
 * (`lib/alert/flashMoves.ts`): 25 for the short-term rate, the quarter-point step
 * the Fed moves its rate in (also `marketMoveScale.ts`'s yardstick), and 20 for the
 * gauge.
 *
 * Funding pressure held at the top of its scale is not "No change": it cannot show
 * a rise (`saturated`), and the row says what that leaves the reader with. A
 * number the earlier reading did not record says so, rather than drawing a dash.
 */

type MoveSize = "none" | "slight" | "plain" | "large";

export type SignalMoveMeaning = {
  text: string;
  /** Which way the number went, where it moved enough to say so; "flat" under the noise floor. */
  direction: "up" | "down" | "flat";
  /** A score held at the top of its scale, which cannot show a rise. */
  capped?: boolean;
};

const SCORE_SLIGHT_MAX_POINTS = REGIME_CONFIDENCE_NEAR_THRESHOLD;
const SCORE_LARGE_MIN_POINTS = 12;

const INPUT_STEADY_MAX_BASIS_POINTS = 3;
const INPUT_NOTABLE_BASIS_POINTS: Record<"baseRate" | "curveSlope", number> = { baseRate: 25, curveSlope: 20 };

const scoreMoveSize = (delta: number): MoveSize => {
  const points = Math.abs(delta);
  if (describeInputMovement(delta, 0) === "steady inputs") return "none";
  if (points <= SCORE_SLIGHT_MAX_POINTS) return "slight";
  return points < SCORE_LARGE_MIN_POINTS ? "plain" : "large";
};

const inputMoveSize = (key: "baseRate" | "curveSlope", delta: number): MoveSize => {
  /* Rounded to the basis point the record is published in, so 4.05 − 4.11 is 6 and not 5.99…. */
  const basisPoints = Math.round(Math.abs(delta) * 100);
  const notable = INPUT_NOTABLE_BASIS_POINTS[key];
  if (basisPoints <= INPUT_STEADY_MAX_BASIS_POINTS) return "none";
  if (basisPoints < notable) return "slight";
  return basisPoints < notable * 2 ? "plain" : "large";
};

const SIZE_WORD: Record<Exclude<MoveSize, "none">, string> = { slight: "slightly ", plain: "", large: "much " };

const NO_CHANGE: SignalMoveMeaning = { text: "No change.", direction: "flat" };
const NO_REAL_CHANGE: SignalMoveMeaning = { text: "No real change.", direction: "flat" };

/* The gauge warns below zero, so its sentence depends on which side of zero each reading sits. */
const describeGaugeMove = (value: number, delta: number, size: MoveSize): string | null => {
  const previous = value - delta;
  if (previous >= 0 && value < 0) return "The recession warning switched on.";
  if (previous < 0 && value >= 0) return "The recession warning switched off.";
  if (size === "none") return null;
  const word = SIZE_WORD[size];
  if (value < 0) return `The recession warning got ${word}${delta < 0 ? "stronger" : "weaker"}.`;
  return delta < 0 ? `Moved ${word}closer to a recession warning.` : `Moved ${word}further from a recession warning.`;
};

const MOVED_SENTENCE: Record<Exclude<RegimeSignalKey, "curveSlope">, (word: string, up: boolean) => string> = {
  tightness: (word, up) => `Money got ${word}${up ? "harder" : "easier"} to raise.`,
  riskAppetite: (word, up) => `Investors got ${word}${up ? "bolder" : "more cautious"}.`,
  baseRate: (word, up) => `Borrowing got ${word}${up ? "more expensive" : "cheaper"}.`,
};

export const describeSignalMoveMeaning = ({
  key,
  value,
  delta,
  saturated = false,
  basis,
}: {
  key: RegimeSignalKey;
  value: number | null;
  /** The recorded move; null where the earlier reading did not record this number. */
  delta: number | null;
  /** Funding pressure at the top of its scale, where a higher rate would not raise it. */
  saturated?: boolean;
  /** The earlier reading, to name it when it did not record this number. */
  basis: ComparisonBasis;
}): SignalMoveMeaning => {
  if (value === null) return { text: "Not available this week.", direction: "flat" };
  if (delta === null) return { text: `Not recorded ${basis.when}, so nothing to compare.`, direction: "flat" };
  if (delta === 0) {
    return saturated && key === "tightness"
      ? { text: "Money is as hard to raise as this score can show.", direction: "flat", capped: true }
      : NO_CHANGE;
  }

  const direction = delta > 0 ? "up" : "down";
  if (key === "curveSlope") {
    const text = describeGaugeMove(value, delta, inputMoveSize(key, delta));
    return text ? { text, direction } : NO_REAL_CHANGE;
  }
  const size = key === "baseRate" ? inputMoveSize(key, delta) : scoreMoveSize(delta);
  if (size === "none") return NO_REAL_CHANGE;
  return { text: MOVED_SENTENCE[key](SIZE_WORD[size], delta > 0), direction };
};
