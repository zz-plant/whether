/**
 * Flash conditions: a move in a raw input large enough, between two consecutive
 * reads, that it should reach an operator the day it lands rather than Monday.
 *
 * The daily cron already pushes on a regime flip and on a score crossing a
 * boundary. What neither catches is the shape of an emergency: the short rate
 * dropping a quarter point overnight (a cut between meetings, a bill-market
 * dislocation), or the 10Y−2Y curve moving twenty basis points in a session (a
 * spread blowout, a flight to quality). Either can leave every score inside its
 * quadrant for a day or two and still be the fact an operator most needs before
 * the next board conversation.
 *
 * Judged on consecutive reads, never on the last alert: the alert state is
 * written only when something fires, so measuring against it would turn three
 * quiet weeks of drift into a "flash". And bounded to a week between reads,
 * because the size threshold assumes a short window — a quarter point over a
 * month is a trend, and the brief already reports trends.
 */

/** A policy-sized move of the short rate between two consecutive reads, in percentage points. */
export const FLASH_BASE_RATE_MOVE = 0.25;
/** Twenty basis points on 10Y−2Y in one read: outside a normal session's range. */
export const FLASH_CURVE_MOVE = 0.2;
/** Two reads more than this far apart are not consecutive in the sense the thresholds assume. */
const FLASH_MAX_GAP_DAYS = 7;

type FlashMetric = "baseRate" | "curveSlope";

export type FlashInputs = {
  recordDate: string;
  baseRate: number | null;
  curveSlope: number | null;
};

export type FlashMove = {
  metric: FlashMetric;
  from: number;
  to: number;
  /** Signed, percentage points. */
  delta: number;
  /** Reader-facing name of the input. */
  label: string;
  /** One line: what moved, by how much, between which reads. */
  headline: string;
};

const METRIC_LABELS: Record<FlashMetric, string> = {
  baseRate: "The short rate",
  curveSlope: "The 10Y−2Y curve",
};

const THRESHOLDS: Record<FlashMetric, number> = {
  baseRate: FLASH_BASE_RATE_MOVE,
  curveSlope: FLASH_CURVE_MOVE,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (from: string, to: string): number | null => {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return null;
  return Math.abs(toMs - fromMs) / DAY_MS;
};

const formatSigned = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const describe = (metric: FlashMetric, from: number, to: number, current: FlashInputs, previous: FlashInputs): FlashMove => {
  const delta = to - from;
  const verb = metric === "baseRate" ? (delta < 0 ? "fell" : "rose") : delta < 0 ? "flattened" : "steepened";
  return {
    metric,
    from,
    to,
    delta,
    label: METRIC_LABELS[metric],
    headline: `${METRIC_LABELS[metric]} ${verb} ${formatSigned(delta)} between ${previous.recordDate} and ${current.recordDate} (${from.toFixed(2)}% to ${to.toFixed(2)}%).`,
  };
};

/**
 * The inputs that moved past their flash threshold since the previous read.
 * Empty with no previous read, with reads too far apart, with a repeated
 * record date (the same day re-ingested), or with a value missing on either side.
 */
export const evaluateFlashMoves = (current: FlashInputs, previous: FlashInputs | null): FlashMove[] => {
  if (!previous || previous.recordDate === current.recordDate) return [];
  const gap = daysBetween(previous.recordDate, current.recordDate);
  if (gap === null || gap > FLASH_MAX_GAP_DAYS) return [];

  const moves: FlashMove[] = [];
  for (const metric of ["baseRate", "curveSlope"] as const) {
    const from = previous[metric];
    const to = current[metric];
    if (typeof from !== "number" || typeof to !== "number") continue;
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
    // A hair under the threshold from float noise is not a flash; round first.
    if (Math.round(Math.abs(to - from) * 100) / 100 < THRESHOLDS[metric]) continue;
    moves.push(describe(metric, from, to, current, previous));
  }
  return moves;
};

/** The flash-relevant inputs of an operating snapshot, or of anything shaped like its assessment. */
export const flashInputsFrom = (snapshot: {
  recordDate: string;
  assessment: { scores: { baseRate: number; baseRateUsed: string; curveSlope: number | null } };
}): FlashInputs => ({
  recordDate: snapshot.recordDate,
  // An imputed base rate is the threshold constant, not a market print.
  baseRate: snapshot.assessment.scores.baseRateUsed === "MISSING" ? null : snapshot.assessment.scores.baseRate,
  curveSlope: snapshot.assessment.scores.curveSlope,
});
