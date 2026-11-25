import { z } from "zod";
import { getBaseRate } from "../../regimeEngine";
import type { TreasuryData } from "../../types";
import { formatRegimeSignalValue } from "../reportFormatting";
import { formatMonthLabel } from "../../timeMachine/monthFormatting";
import type { TimeMachineYieldCurveEntry } from "../../timeMachine/timeMachineCache";
import type { SignalChangeRow } from "./homeSectionModel";

/**
 * The trailing readings behind the two market inputs on the brief's "What changed"
 * table (2026-11-18): the short-term borrowing rate (the one-month bill) and the
 * recession warning gauge (the 10-year less the 2-year yield). The row prints
 * "4.10 · Nov 9: 4.04"; this is the same reading with the weeks before it, the line it
 * is judged against, and the comparison reading as a tick.
 *
 * One source: the daily points are the window the read path already holds, the bill's
 * `treasury.oneMonthHistory` (what the tightening-speed term reads) and the two yields'
 * `recentHistory` from the materialized model; the month-end points are the bundled
 * record's (`getTimeMachineYieldCurveSeries`, the walk the time machine opens). A trail
 * whose last point is not the number the row prints is not drawn: a sparkline that ends
 * somewhere other than its label is a second reading of the week.
 */
export type InputTrailKey = "baseRate" | "curveSlope";

/**
 * How far back the two trails reach (2026-11-18): the daily window the read path holds,
 * or every month-end on the record since 2012 with this week's reading last. The longer
 * one answers "is this high for these inputs?", which three months cannot. The URL's
 * (`/?trail=since-2012`), as every view of `/` is; absent, the daily window.
 */
export const INPUT_TRAIL_PARAM = "trail";
export type InputTrailSpan = "daily" | "since-2012";

/** A `?trail=` value as a span; anything else is the default, the daily window. */
export const parseInputTrailSpan = (value: string | undefined): InputTrailSpan =>
  value === "since-2012" ? "since-2012" : "daily";

type InputTrailPoint = {
  date: string;
  /** "Nov 16" for a day, "Oct 2026" for a month-end. */
  label: string;
  /** The `<time>` value for `label`: "2026-11-16", or "2026-10" for a month-end. */
  dateTime: string;
  value: number;
  valueLabel: string;
};

/** One reach of a trail, as drawn. */
export type InputTrailView = {
  /** Which reach this draws. */
  span: InputTrailSpan;
  /** What the points are, for the readout's name: "daily readings", "month-end readings". */
  pointsLabel: string;
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
  /** The drawn range, stated: "Range 4.04–4.14". The span's label above the drawing states its days. */
  caption: string;
  /** The line, named as the table on /signals names it. */
  lineCaption: string;
  /** Everything above as one sentence, for the slider's name. */
  summary: string;
};

/**
 * An input's trail: the reach the page asked for (`?trail=`), and the other where it can
 * be drawn too, so the reader switches between them in place.
 */
export type InputTrail = InputTrailView & {
  key: InputTrailKey;
  /**
   * The reaches a reader can switch between, each named by the time it covers ("Last 3
   * months", "Since 2012"): both where both can be drawn, else the one drawn, as its
   * domain's label rather than a choice.
   */
  spans: { span: InputTrailSpan; label: string }[];
  /** The other reach, where both draw. */
  other: InputTrailView | null;
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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The daily window, named by the time it covers: "Last 3 months" for the read path's
 * 92 days, and weeks or days for a window that has not filled yet. Counted from the
 * dates drawn, so the label cannot claim more than the line shows.
 */
const describeDailySpan = (first: string, last: string): string => {
  const days = Math.round((Date.parse(`${last.slice(0, 10)}T00:00:00.000Z`) - Date.parse(`${first.slice(0, 10)}T00:00:00.000Z`)) / DAY_MS);
  if (!Number.isFinite(days)) return "Daily";
  if (days >= 75) return "Last 3 months";
  return days >= 14 ? `Last ${Math.round(days / 7)} weeks` : `Last ${days + 1} days`;
};

/** One reach, with the name its choice prints ("Last 3 months", "Since 2012"). */
type TrailDraft = InputTrailView & { spanLabel: string };

/**
 * One reach of a trail, or null where it cannot be drawn honestly: fewer than three
 * readings, or a last reading that is not the row's.
 */
const buildTrail = ({
  key,
  series,
  reading,
  line,
  comparison,
  monthEnds = false,
}: {
  key: InputTrailKey;
  /** Oldest first; a point's `label` and `dateTime` name it in the readout, its day by default. */
  series: (DatedValue & { label?: string; dateTime?: string })[];
  reading: number;
  line: number;
  comparison: { recordDate: string; value: number } | null;
  /** Month-ends since the record began, with this week's reading last. */
  monthEnds?: boolean;
}): TrailDraft | null => {
  const last = series.at(-1);
  if (series.length < 3 || !last || round2(last.value) !== round2(reading)) return null;
  const format = (value: number) => formatRegimeSignalValue(value, key);
  const points = series.map((point) => ({
    date: point.date,
    label: point.label ?? dayLabel(point.date),
    dateTime: point.dateTime ?? point.date.slice(0, 10),
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
  const lineCaption = `${words.label} ${format(line)}${offScale ? `, ${offScale === "below" ? "below" : "above"} the range shown` : ""}`;
  const first = points[0];
  const final = points.at(-1);
  const comparisonPoint = comparisonMark ? points[comparisonMark.index] : undefined;
  /* Unreachable past the three-reading guard above; it keeps the reads checked. */
  if (!first || !final) return null;
  /* The drawn range, which takes in the line where it is drawn. The days it covers are
     the span's label, over the drawing. */
  const range = `${format(domain[0])}–${format(domain[1])}`;
  const comparisonPhrase = comparisonMark && comparisonPoint ? ` Earlier reading ${format(comparisonMark.value)} on ${comparisonPoint.label}.` : "";
  const penultimate = points.at(-2) ?? first;
  const readings = monthEnds
    ? `${points.length - 1} month-end readings from ${first.label} to ${penultimate.label}, then ${final.label}`
    : `${points.length} daily readings from ${first.label} to ${final.label}`;
  return {
    span: monthEnds ? "since-2012" : "daily",
    pointsLabel: monthEnds ? "month-end readings" : "daily readings",
    points,
    domain,
    line: { value: line, crossed: words.badAbove ? reading > line : reading < line, offScale },
    comparison: comparisonMark,
    caption: `Range ${range}`,
    lineCaption,
    spanLabel: monthEnds ? `Since ${first.date.slice(0, 4)}` : describeDailySpan(first.date, final.date),
    summary: `${SIGNAL_NAMES[key]}, ${readings}, ranging ${range}. Latest ${format(reading)}.${comparisonPhrase} ${lineCaption}.`,
  };
};

/**
 * The month-ends on the record before this week's reading, then the reading itself: the
 * record's last month-end is weeks old, and a trail ends at the figure its row prints.
 */
const monthEndSeries = (
  monthEnds: readonly TimeMachineYieldCurveEntry[],
  pick: (entry: TimeMachineYieldCurveEntry) => number | null,
  readingDate: string,
  reading: number,
): (DatedValue & { label: string; dateTime: string })[] => [
  ...monthEnds.flatMap((entry) => {
    const value = pick(entry);
    return typeof value === "number" && Number.isFinite(value) && entry.recordDate.slice(0, 10) < readingDate
      ? [{ date: entry.recordDate.slice(0, 10), label: formatMonthLabel(entry.year, entry.month), dateTime: entry.recordDate.slice(0, 7), value }]
      : [];
  }),
  { date: readingDate, label: dayLabel(readingDate), dateTime: readingDate, value: reading },
];

const viewOf = ({ spanLabel: _spanLabel, ...view }: TrailDraft): InputTrailView => view;

/**
 * One input's trail in the reach asked for, carrying the other where it draws too. The
 * daily reach decides whether there is a trail at all, as before the longer one existed:
 * the month-end reach is the second view of a trail the row already draws, never a stand-in
 * that puts a drawing where the page had none.
 */
const chooseSpan = (key: InputTrailKey, span: InputTrailSpan, daily: TrailDraft | null, monthly: TrailDraft | null): InputTrail | null => {
  if (!daily) return null;
  const drawn = span === "since-2012" && monthly ? monthly : daily;
  const other = drawn === daily ? monthly : daily;
  return {
    ...viewOf(drawn),
    key,
    spans: [daily, monthly].flatMap((draft) => (draft ? [{ span: draft.span, label: draft.spanLabel }] : [])),
    other: other ? viewOf(other) : null,
  };
};

/**
 * The two inputs' trails for the brief, from the report it already loaded and the rows
 * the table prints (their value is the trail's last point, their earlier value its
 * tick), in the reach `span` asks for. Absent for a key with neither reach to draw: a
 * window too short, a last point that is not the row's reading, or (the rate) a base
 * rate that is not the one-month bill, whose month-ends the record holds.
 */
export const buildInputTrails = ({
  treasury,
  materializedSignals,
  rows,
  baseRateLine,
  comparedWith,
  span = "daily",
  monthEnds = [],
}: {
  treasury: Pick<TreasuryData, "record_date" | "yields" | "oneMonthHistory">;
  /** `ReportData.materializedSignals`: the canonical read model, or null off that path. */
  materializedSignals: unknown;
  rows: readonly Pick<SignalChangeRow, "key" | "value" | "previous">[];
  /** `thresholds.baseRateTightness`: where the rate starts counting against funding. */
  baseRateLine: number;
  /** The earlier reading the rows compare with; null where none was made. */
  comparedWith: { recordDate: string } | null | undefined;
  /** Which reach to draw (`?trail=`); the other is offered where it draws too. */
  span?: InputTrailSpan;
  /** The record's month-ends (`getTimeMachineYieldCurveSeries`), for the longer reach. */
  monthEnds?: readonly TimeMachineYieldCurveEntry[];
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
    const common = { key: "baseRate" as const, reading: rate, line: baseRateLine, comparison: comparisonFor("baseRate") };
    const trail = chooseSpan(
      "baseRate",
      span,
      buildTrail({ ...common, series: sortedUpTo(byDay(treasury.oneMonthHistory), readingDate) }),
      buildTrail({ ...common, series: monthEndSeries(monthEnds, (entry) => entry.oneMonth, readingDate, rate), monthEnds: true }),
    );
    if (trail) trails.baseRate = trail;
  }

  const parsed = RecentHistorySchema.safeParse(materializedSignals);
  const history = parsed.success ? parsed.data.recentHistory : undefined;
  const slopeReading = rowFor("curveSlope")?.value;
  if (typeof slopeReading === "number") {
    const tenYear = byDay(history?.TREASURY_10Y);
    const twoYear = byDay(history?.TREASURY_2Y);
    const slope = new Map<string, number>();
    for (const [date, ten] of tenYear) {
      const two = twoYear.get(date);
      if (two !== undefined) slope.set(date, round2(ten - two));
    }
    const common = { key: "curveSlope" as const, reading: slopeReading, line: 0, comparison: comparisonFor("curveSlope") };
    const trail = chooseSpan(
      "curveSlope",
      span,
      buildTrail({ ...common, series: sortedUpTo(slope, readingDate) }),
      buildTrail({
        ...common,
        series: monthEndSeries(monthEnds, (entry) => (entry.spread10Y2Y === null ? null : round2(entry.spread10Y2Y)), readingDate, slopeReading),
        monthEnds: true,
      }),
    );
    if (trail) trails.curveSlope = trail;
  }

  return trails;
};
