import { z } from "zod";
import { getBaseRate } from "../../regimeEngine";
import type { TreasuryData } from "../../types";
import { formatRegimeSignalValue } from "../reportFormatting";
import type { SignalChangeRow } from "./homeSectionModel";

/**
 * The trailing daily readings behind the two market inputs on the brief's "What
 * changed" table (2026-11-18): the short-term borrowing rate (the one-month bill) and
 * the recession warning gauge (the 10-year less the 2-year yield). The row prints
 * "4.10 · Nov 9: 4.04"; this is the same reading with the weeks before it, the line it
 * is judged against, and the comparison reading as a tick.
 *
 * One source: the points are the window the read path already holds, the bill's
 * `treasury.oneMonthHistory` (what the tightening-speed term reads) and the two yields'
 * `recentHistory` from the materialized model. A trail whose last point is not the
 * number the row prints is not drawn: a sparkline that ends somewhere other than its
 * label is a second reading of the week.
 */
export type InputTrailKey = "baseRate" | "curveSlope";

type InputTrailPoint = { date: string; label: string; value: number; valueLabel: string };

export type InputTrail = {
  key: InputTrailKey;
  /** Oldest first, ending at the reading the row prints. */
  points: InputTrailPoint[];
  /** The drawn range: the readings, the comparison and, where it is within reach, the line. */
  domain: readonly [number, number];
  line: {
    value: number;
    /** Whether the reading is on the side of the line that counts against a company. */
    crossed: boolean;
    /** Null where the line is drawn; otherwise the edge it lies past. */
    offScale: "above" | "below" | null;
  };
  /** The earlier reading the row compares with, at the point on or before its date. */
  comparison: { index: number; value: number } | null;
  /** The domain, stated: "Daily, Oct 8 to Nov 16 · 4.04–4.14". */
  caption: string;
  /** The line, named as the table on /signals names it. */
  lineCaption: string;
  /** Everything above as one sentence, for the slider's name. */
  summary: string;
};

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dayLabel = (date: string) => {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) ? date : MONTH_DAY.format(parsed);
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/* Just what the trail reads from the materialized model, which reaches the page untyped. */
const RecentHistorySchema = z.object({
  recentHistory: z
    .record(z.string(), z.array(z.object({ date: z.string(), value: z.number().nullable() })))
    .optional(),
});

type DatedValue = { date: string; value: number };

/** One finite reading per day, the last written winning, oldest first. */
const byDay = (points: readonly { date: string; value: number | null }[] | undefined | null): Map<string, number> => {
  const days = new Map<string, number>();
  for (const point of points ?? []) {
    if (typeof point.value === "number" && Number.isFinite(point.value)) days.set(point.date.slice(0, 10), point.value);
  }
  return days;
};

const sortedUpTo = (days: Map<string, number>, readingDate: string): DatedValue[] =>
  [...days.entries()]
    .filter(([date]) => date <= readingDate)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ date, value }));

/** The line each input is judged against, as `/signals` names it (`buildSignalReferenceRows`). */
const LINE_WORDS: Record<InputTrailKey, { label: string; badAbove: boolean }> = {
  baseRate: { label: "Counts against you above", badAbove: true },
  curveSlope: { label: "Inverted below", badAbove: false },
};

const SIGNAL_NAMES: Record<InputTrailKey, string> = {
  baseRate: "Short-term borrowing rate",
  curveSlope: "Recession warning gauge",
};

/**
 * The trail, or null where it cannot be drawn honestly: fewer than three readings,
 * or a last reading that is not the row's.
 */
const buildTrail = ({
  key,
  series,
  reading,
  line,
  comparison,
}: {
  key: InputTrailKey;
  series: DatedValue[];
  reading: number;
  line: number;
  comparison: { recordDate: string; value: number } | null;
}): InputTrail | null => {
  const last = series.at(-1);
  if (series.length < 3 || !last || round2(last.value) !== round2(reading)) return null;
  const format = (value: number) => formatRegimeSignalValue(value, key);
  const points = series.map((point) => ({
    date: point.date,
    label: dayLabel(point.date),
    value: point.value,
    valueLabel: format(point.value),
  }));
  /* The point on or before the comparison's date; none where it predates the window. */
  const comparisonIndex = comparison
    ? points.reduce((found, point, index) => (point.date <= comparison.recordDate.slice(0, 10) ? index : found), -1)
    : -1;
  const comparisonMark =
    comparison && comparisonIndex >= 0 && comparisonIndex < points.length - 1
      ? { index: comparisonIndex, value: comparison.value }
      : null;

  const values = [...points.map((point) => point.value), ...(comparisonMark ? [comparisonMark.value] : [])];
  const low = Math.min(...values);
  const high = Math.max(...values);
  /* The line is drawn when it is within one and a half ranges of the readings; further
     off, taking it in would flatten the weeks into a stroke, so the key names the edge
     it lies past instead. */
  const reach = Math.max((high - low) * 1.5, 0.05);
  const onScale = line >= low - reach && line <= high + reach;
  const domainLow = onScale ? Math.min(low, line) : low;
  const domainHigh = onScale ? Math.max(high, line) : high;
  const domain: readonly [number, number] = domainLow === domainHigh ? [domainLow - 0.05, domainHigh + 0.05] : [domainLow, domainHigh];
  const words = LINE_WORDS[key];
  const offScale = onScale ? null : line < low ? "below" : "above";
  const lineCaption = `${words.label} ${format(line)}${offScale ? `, ${offScale === "below" ? "under" : "over"} this range` : ""}`;
  const first = points[0];
  /* The drawn range, which takes in the line where it is drawn. */
  const range = `${format(domain[0])}–${format(domain[1])}`;
  const caption = `Daily, ${first.label} to ${points.at(-1)?.label ?? first.label} · ${range}`;
  const comparisonPhrase = comparisonMark ? ` Earlier reading ${format(comparisonMark.value)} on ${points[comparisonMark.index].label}.` : "";
  return {
    key,
    points,
    domain,
    line: { value: line, crossed: words.badAbove ? reading > line : reading < line, offScale },
    comparison: comparisonMark,
    caption,
    lineCaption,
    summary: `${SIGNAL_NAMES[key]}, ${points.length} daily readings from ${first.label} to ${points.at(-1)?.label}, ranging ${range}. Latest ${format(reading)}.${comparisonPhrase} ${lineCaption}.`,
  };
};

/**
 * The two inputs' trails for the brief, from the report it already loaded and the rows
 * the table prints (their value is the trail's last point, their earlier value its
 * tick). Absent for a key whose window is too short, whose last point is not the row's
 * reading, or (the rate) where the base rate is not the one-month bill.
 */
export const buildInputTrails = ({
  treasury,
  materializedSignals,
  rows,
  baseRateLine,
  comparedWith,
}: {
  treasury: Pick<TreasuryData, "record_date" | "yields" | "oneMonthHistory">;
  /** `ReportData.materializedSignals`: the canonical read model, or null off that path. */
  materializedSignals: unknown;
  rows: readonly Pick<SignalChangeRow, "key" | "value" | "previous">[];
  /** `thresholds.baseRateTightness`: where the rate starts counting against funding. */
  baseRateLine: number;
  /** The earlier reading the rows compare with; null where none was made. */
  comparedWith: { recordDate: string } | null | undefined;
}): Partial<Record<InputTrailKey, InputTrail>> => {
  const readingDate = treasury.record_date.slice(0, 10);
  const trails: Partial<Record<InputTrailKey, InputTrail>> = {};
  const rowFor = (key: InputTrailKey) => rows.find((row) => row.key === key);
  const comparisonFor = (key: InputTrailKey) => {
    const previous = rowFor(key)?.previous;
    return comparedWith && typeof previous === "number" ? { recordDate: comparedWith.recordDate, value: previous } : null;
  };

  const rate = rowFor("baseRate")?.value;
  if (typeof rate === "number" && getBaseRate(treasury.yields).used === "1M") {
    const trail = buildTrail({
      key: "baseRate",
      series: sortedUpTo(byDay(treasury.oneMonthHistory), readingDate),
      reading: rate,
      line: baseRateLine,
      comparison: comparisonFor("baseRate"),
    });
    if (trail) trails.baseRate = trail;
  }

  const parsed = RecentHistorySchema.safeParse(materializedSignals);
  const history = parsed.success ? parsed.data.recentHistory : undefined;
  const slopeReading = rowFor("curveSlope")?.value;
  if (typeof slopeReading === "number" && history) {
    const tenYear = byDay(history.TREASURY_10Y);
    const twoYear = byDay(history.TREASURY_2Y);
    const slope = new Map<string, number>();
    for (const [date, ten] of tenYear) {
      const two = twoYear.get(date);
      if (two !== undefined) slope.set(date, round2(ten - two));
    }
    const trail = buildTrail({
      key: "curveSlope",
      series: sortedUpTo(slope, readingDate),
      reading: slopeReading,
      line: 0,
      comparison: comparisonFor("curveSlope"),
    });
    if (trail) trails.curveSlope = trail;
  }

  return trails;
};
