import type { RegimeKey, RegimeThresholds } from "../regimeEngine";
import { buildComparedWith } from "./comparisonBasis";

/**
 * The answer each "Deeper evidence" question gives, for its closed summary.
 *
 * Seven questions sat closed on `/signals` and one carried its answer ("Which
 * past cycle looks most like this one? Q3 2007 · …"); the other six said only
 * what was behind them, so a reader paid a click to learn whether the rates
 * moved or the curve inverted. A summary that shows the current value pays
 * the reader back without one (ui-ux-standards §XII).
 *
 * Each line is built from the values its panel draws, and where the panel
 * computes something (the runs of conditions, a sparkline's window) the panel
 * and the summary call the same function here, so the line over a disclosure
 * cannot disagree with what opens under it (§XV).
 */

const PERCENT = (value: number) => `${value.toFixed(2)}%`;

/**
 * "1-month rate 4.05%, up from 3.85% on Aug 31". This week's 1-month reading
 * against the last month-end the rate charts draw before it: the charts are
 * the month-end archive and end there, so that is the point the reader finds
 * when the panel opens. Null without a reading.
 */
export const describeRatesSummary = ({
  current,
  series,
}: {
  current: { recordDate: string; oneMonth: number | null | undefined };
  series: ReadonlyArray<{ recordDate: string; oneMonth: number | null }>;
}): string | null => {
  if (typeof current.oneMonth !== "number") return null;
  const now = `1-month rate ${PERCENT(current.oneMonth)}`;
  const earlier = [...series]
    .reverse()
    .find((point) => point.recordDate < current.recordDate && typeof point.oneMonth === "number");
  const label = earlier ? buildComparedWith(earlier.recordDate, current.recordDate)?.label : undefined;
  if (!earlier || typeof earlier.oneMonth !== "number" || !label) return now;
  const before = PERCENT(earlier.oneMonth);
  const after = PERCENT(current.oneMonth);
  if (before === after) return `${now}, unchanged from ${label}`;
  return `${now}, ${current.oneMonth > earlier.oneMonth ? "up" : "down"} from ${before} on ${label}`;
};

/**
 * Whether either spread went below zero across the months the inversion chart
 * draws, from the counts its caption prints.
 */
export const describeInversionSummary = ({
  months,
  inverted10Y2Y,
  inverted2Y3M,
}: {
  months: number;
  inverted10Y2Y: number;
  inverted2Y3M: number;
}): string => {
  if (inverted10Y2Y === 0 && inverted2Y3M === 0) {
    return `No: neither spread below zero in the last ${months} months`;
  }
  const count = (inverted: number) => (inverted === 0 ? "none" : `${inverted} of ${months} months`);
  const [first, second] =
    inverted2Y3M >= inverted10Y2Y
      ? [`2Y−3M below zero in ${count(inverted2Y3M)}`, `10Y−2Y in ${count(inverted10Y2Y)}`]
      : [`10Y−2Y below zero in ${count(inverted10Y2Y)}`, `2Y−3M in ${count(inverted2Y3M)}`];
  return `Yes: ${first}, ${second}`;
};

/**
 * One sparkline's window: its first and last points, the move between them,
 * and how many months that move spans. The strip's cells print these and the
 * summary over the strip reads them, so the two quote the same numbers.
 *
 * `months` is the gaps between consecutive month-ends, one fewer than the
 * points. The strip used to label its window with the point count, so twelve
 * month-ends (Sep 2025 to Aug 2026) printed "-6 over 12 mo" for a move that
 * spans eleven; the twelve months to Aug 2026 start at Aug 2025, where risk
 * appetite was 66, and the move is -10.
 */
export const summarizeScoreWindow = (points: ReadonlyArray<{ label: string; value: number }>) => {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 2) return null;
  return {
    first: first.value,
    last: last.value,
    delta: last.value - first.value,
    periodLabel: last.label,
    months: points.length - 1,
  };
};

/**
 * "Funding pressure down 27 to 63, risk appetite down 10 to 56 (12 months to
 * Aug 2026)". Rounded as the cells round. Null when no series can be drawn.
 */
export const describeScoreTrendSummary = (
  series: ReadonlyArray<{ label: string; points: ReadonlyArray<{ label: string; value: number }> }>,
): string | null => {
  const windows = series.flatMap((item) => {
    const window = summarizeScoreWindow(item.points);
    return window ? [{ label: item.label, ...window }] : [];
  });
  const lead = windows[0];
  if (!lead) return null;
  const clauses = windows.map((window, index) => {
    const name = index === 0 ? window.label : window.label.charAt(0).toLowerCase() + window.label.slice(1);
    const last = Math.round(window.last);
    const moved = Number(window.delta.toFixed(0));
    if (moved === 0) return `${name} unchanged at ${last}`;
    return `${name} ${moved > 0 ? "up" : "down"} ${Math.abs(moved)} to ${last}`;
  });
  return `${clauses.join(", ")} (${lead.months} ${lead.months === 1 ? "month" : "months"} to ${lead.periodLabel})`;
};

/** The lines a reading is judged against, named: "rate 3.5% · funding pressure 70 · risk appetite 50". */
export const formatChangeLines = (
  thresholds: Pick<RegimeThresholds, "baseRateTightness" | "tightnessRegime" | "riskAppetiteRegime">,
) =>
  `rate ${thresholds.baseRateTightness}% · funding pressure ${thresholds.tightnessRegime} · risk appetite ${thresholds.riskAppetiteRegime}`;

type ConditionsEntry = { year: number; month: number; regime: RegimeKey };

/**
 * Consecutive months under one set of conditions, oldest first, with the
 * number of changes between them and the longest run. The month-by-month
 * timeline draws the runs and prints the two facts; the summary over it
 * quotes the count.
 */
export const summarizeConditionRuns = <Entry extends ConditionsEntry>(series: readonly Entry[]) => {
  const runs = series.reduce<{ regime: RegimeKey; count: number; start: Entry; end: Entry }[]>((acc, entry) => {
    const lastRun = acc.at(-1);
    if (!lastRun || lastRun.regime !== entry.regime) {
      acc.push({ regime: entry.regime, count: 1, start: entry, end: entry });
      return acc;
    }
    lastRun.count += 1;
    lastRun.end = entry;
    return acc;
  }, []);
  const longestRun = runs.reduce<(typeof runs)[number] | null>(
    (longest, run) => (!longest || run.count > longest.count ? run : longest),
    null,
  );
  return { runs, changeCount: Math.max(runs.length - 1, 0), longestRun, months: series.length };
};

/** "3 changes across the last 24 months", in the timeline's words. */
export const describeConditionChanges = ({ changeCount, months }: { changeCount: number; months: number }) =>
  changeCount === 0
    ? `No change across the last ${months} months`
    : `${changeCount} ${changeCount === 1 ? "change" : "changes"} across the last ${months} months`;

const LIST = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/** "Infrastructure, support, data, pricing, org chart, and roadmap": the areas the table walks through. */
export const describeFossilSummary = (rows: ReadonlyArray<{ domain: string }>) => {
  if (rows.length === 0) return null;
  const domains = rows.map((row, index) => (index === 0 ? row.domain : row.domain.charAt(0).toLowerCase() + row.domain.slice(1)));
  return LIST.format(domains);
};
