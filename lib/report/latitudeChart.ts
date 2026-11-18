import type { RegimeKey } from "../types";
import { formatMonthYearShortFromValue } from "../formatters";
import { buildTimeMachineHref } from "../timeMachine/timeMachineSelection";
import { OPERATING_LATITUDE_LABEL } from "./reportCopy";
import { latitudeConditionLine } from "./trackRecordCopy";
import type { TrackRecordRow } from "./trackRecord";

/**
 * Room to move across every month-end, for /history's "Monthly readings" (2026-11-18).
 *
 * The section defined the score in a paragraph and then folded 178 rows of it behind a
 * disclosure, so its shape over fourteen years (a long Sunny plateau, the 2022 drop,
 * the climb back) was something a reader had to assemble row by row. The chart reads
 * the rows the table prints (`TrackRecord.allRows`), so a point and its row cannot
 * disagree, and the line it draws across the scale is the one the paragraph names
 * (`latitudeConditionLine`).
 */
type LatitudePoint = {
  recordDate: string;
  value: number;
  regime: RegimeKey;
  /** The brief as it read that month (the time machine). */
  href: string;
  /** "Mar 2025 · Room to move 52 · Cloudy", the readout under the pointer. */
  readout: string;
};

export type LatitudeChart = {
  /** Oldest first. */
  points: LatitudePoint[];
  /** The value the paragraph names: Sunny's quadrant never reads below it, Freezing's never above. */
  line: number;
  /** Consecutive months under one condition, for the strip beneath the line. */
  runs: { regime: RegimeKey; start: number; length: number }[];
  /** Where each year's first month-end sits, for the time axis. */
  years: { year: number; index: number }[];
  /** "Jan 2012 – Oct 2026". */
  rangeLabel: string;
};

export const buildLatitudeChart = (rows: readonly Pick<TrackRecordRow, "recordDate" | "regime" | "regimeLabel" | "boldness">[]): LatitudeChart | null => {
  const ordered = [...rows].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const first = ordered.at(0);
  const latest = ordered.at(-1);
  if (!first || !latest || ordered.length < 2) return null;

  const points = ordered.map((row) => {
    const monthLabel = formatMonthYearShortFromValue(row.recordDate);
    return {
      recordDate: row.recordDate,
      value: row.boldness,
      regime: row.regime,
      href: buildTimeMachineHref("/", { year: Number(row.recordDate.slice(0, 4)), month: Number(row.recordDate.slice(5, 7)) }),
      readout: `${monthLabel} · ${OPERATING_LATITUDE_LABEL} ${row.boldness} · ${row.regimeLabel}`,
    };
  });

  const runs: LatitudeChart["runs"] = [];
  const years: LatitudeChart["years"] = [];
  points.forEach((point, index) => {
    const run = runs.at(-1);
    if (run && run.regime === point.regime) run.length += 1;
    else runs.push({ regime: point.regime, start: index, length: 1 });
    const year = Number(point.recordDate.slice(0, 4));
    if (years.at(-1)?.year !== year) years.push({ year, index });
  });

  return {
    points,
    line: latitudeConditionLine(),
    runs,
    years,
    rangeLabel: `${formatMonthYearShortFromValue(first.recordDate)} – ${formatMonthYearShortFromValue(latest.recordDate)}`,
  };
};
