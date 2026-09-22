/**
 * Flash conditions: a move in a raw input large enough, between two consecutive
 * reads, that it should reach an operator the day it lands rather than Monday.
 *
 * The daily cron already pushes on a regime flip and on a score crossing a
 * boundary. What neither catches is the shape of an emergency: the short rate
 * dropping a quarter point overnight (a cut between meetings, a bill-market
 * dislocation), or the 10Y−2Y curve moving 0.20 percentage points in a session (a
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

import { regimeSignalLabel } from "../report/signalTranslations";

/** A policy-sized move of the short rate between two consecutive reads, in percentage points. */
export const FLASH_BASE_RATE_MOVE = 0.25;
/** 0.20 percentage points on 10Y−2Y in one read: outside a normal session's range. */
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

/*
 * The page's names for the two inputs. An alert lands in an inbox with no page
 * beside it, so the curve carries its plain meaning on first use, and every size
 * is in percentage points: "the 10Y−2Y curve moved +0.30%" read as a 0.3% change
 * in a bond-desk quantity to anyone not on a bond desk.
 */
const METRIC_LABELS: Record<FlashMetric, string> = {
  baseRate: `The ${regimeSignalLabel.baseRate.toLowerCase()}`,
  curveSlope: `The ${regimeSignalLabel.curveSlope.toLowerCase()} (10-year minus 2-year rate)`,
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

/** "0.30 percentage points": a spread's move is a difference of rates, never a percent of one. */
export const formatPointsMove = (value: number) => `${Math.abs(value).toFixed(2)} percentage points`;

const describe = (metric: FlashMetric, from: number, to: number, current: FlashInputs, previous: FlashInputs): FlashMove => {
  const delta = to - from;
  const verb = delta < 0 ? "fell" : "rose";
  return {
    metric,
    from,
    to,
    delta,
    label: METRIC_LABELS[metric],
    headline: `${METRIC_LABELS[metric]} ${verb} ${formatPointsMove(delta)} between ${previous.recordDate} and ${current.recordDate} (${from.toFixed(2)}% to ${to.toFixed(2)}%).`,
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
