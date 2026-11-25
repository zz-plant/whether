import type { RegimeKey, RegimeThresholds } from "../regimeEngine";
import { formatMonthLabel, toMonthInput } from "../timeMachine/monthFormatting";
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
 * "Rising: the 1-month rate is 4.05%, up from 3.85% on Aug 31", the answer to "What are
 * interest rates doing?" with the reply first (2026-11-25; it opened on the rate's name, so the
 * direction a person would say first came third). This week's 1-month reading
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
  const trail = buildRatesTrail({ current, series });
  const latest = trail?.at(-1);
  if (!trail || !latest) return null;
  const now = `the 1-month rate is ${PERCENT(latest.value)}`;
  const earlier = trail.at(-2);
  const label = earlier ? buildComparedWith(earlier.recordDate, latest.recordDate)?.label : undefined;
  if (!earlier || !label) return `The 1-month rate is ${PERCENT(latest.value)}`;
  const before = PERCENT(earlier.value);
  const after = PERCENT(latest.value);
  if (before === after) return `Holding: ${now}, as on ${label}`;
  const rising = latest.value > earlier.value;
  return `${rising ? "Rising" : "Falling"}: ${now}, ${rising ? "up" : "down"} from ${before} on ${label}`;
};

/** How many month-ends the rates trail carries before this reading: a year. */
const RATES_TRAIL_MONTHS = 12;

/**
 * The 1-month rate the rates answer reads: the last twelve month-ends the rate
 * charts draw before this reading, then this reading. The answer quotes its
 * last two points and the sparkline over the question draws all of them, so
 * the line ends on the two numbers the sentence beside it names. Null without
 * a reading this week.
 */
export const buildRatesTrail = ({
  current,
  series,
}: {
  current: { recordDate: string; oneMonth: number | null | undefined };
  series: ReadonlyArray<{ recordDate: string; oneMonth: number | null }>;
}): Array<{ recordDate: string; value: number; isCurrent: boolean }> | null => {
  if (typeof current.oneMonth !== "number") return null;
  const earlier = series
    .flatMap((point) =>
      point.recordDate < current.recordDate && typeof point.oneMonth === "number"
        ? [{ recordDate: point.recordDate, value: point.oneMonth, isCurrent: false }]
        : [],
    )
    .slice(-RATES_TRAIL_MONTHS);
  return [...earlier, { recordDate: current.recordDate, value: current.oneMonth, isCurrent: true }];
};

type SpreadKey = "spread10Y2Y" | "spread2Y3M";

/**
 * The order the inversion answer names the two spreads in: the recession warning gauge
 * (10-year minus 2-year) first, because the question asks about it by name, then the short
 * end. The strips drawn beside the answer follow it, so the first strip is the first clause.
 * Until 2026-11-25 the spread below zero in more months led, and the question asked about "the
 * yield curve", which named neither.
 */
export const inversionSpreadOrder = (): [SpreadKey, SpreadKey] => [
  "spread10Y2Y",
  "spread2Y3M",
];

const INVERSION_MONTHS = 12;

const meanOf = (values: ReadonlyArray<number | null>) => {
  const numeric = values.filter((value): value is number => typeof value === "number");
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
};

/**
 * The months the inversion chart draws: the last twelve calendar months in the
 * series, each its readings' mean spreads and whether each sat below zero, and
 * the two counts its caption and the question's answer print. The chart, the
 * strips over the question and the month row in the panel all read this.
 */
export const summarizeInversionMonths = (
  series: ReadonlyArray<{ recordDate: string; spread10Y2Y: number | null; spread2Y3M: number | null }>,
) => {
  const grouped = new Map<string, { year: number; month: number; points: typeof series[number][] }>();
  for (const point of series) {
    const date = new Date(point.recordDate);
    if (Number.isNaN(date.valueOf())) continue;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = toMonthInput(year, month);
    const entry = grouped.get(key) ?? { year, month, points: [] };
    entry.points.push(point);
    grouped.set(key, entry);
  }
  const months = [...grouped.entries()]
    .map(([key, { year, month, points }]) => {
      const spread10Y2Y = meanOf(points.map((point) => point.spread10Y2Y));
      const spread2Y3M = meanOf(points.map((point) => point.spread2Y3M));
      return {
        key,
        year,
        month,
        label: formatMonthLabel(year, month),
        spread10Y2Y,
        spread2Y3M,
        inverted10Y2Y: typeof spread10Y2Y === "number" && spread10Y2Y < 0,
        inverted2Y3M: typeof spread2Y3M === "number" && spread2Y3M < 0,
      };
    })
    .slice(-INVERSION_MONTHS);
  const inverted10Y2Y = months.filter((month) => month.inverted10Y2Y).length;
  const inverted2Y3M = months.filter((month) => month.inverted2Y3M).length;
  return { months, inverted10Y2Y, inverted2Y3M, order: inversionSpreadOrder() };
};

/**
 * The year and month a month label names ("Oct 2026", as `formatMonthLabel`
 * prints it), for a series that carries its months only as labels. Null for a
 * label no month of that year prints.
 */
export const monthOfLabel = (label: string): { year: number; month: number } | null => {
  const year = Number(label.match(/(\d{4})$/)?.[1]);
  if (!Number.isInteger(year)) return null;
  const month = Array.from({ length: 12 }, (_, index) => index + 1).find((candidate) => formatMonthLabel(year, candidate) === label);
  return month ? { year, month } : null;
};

/** The question the inversion chart answers, in the gauge's own name. */
export const INVERSION_QUESTION = "Has the recession warning gauge gone below zero in the past year?";

/**
 * Whether the recession warning gauge (the 10-year rate minus the 2-year) went below zero
 * across the months the inversion chart draws, then the short end, from the counts its caption
 * prints. "No" or "Yes" first, as a person would answer.
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
  /* In words, not "2Y−3M" and "10Y−2Y" (2026-10-28): the summary is the question's first line. */
  const shortEnd =
    inverted2Y3M === 0
      ? "and the 2-year stayed above the 3-month"
      : `and the 2-year rate was below the 3-month rate in ${inverted2Y3M} of them`;
  if (inverted10Y2Y === 0) {
    return inverted2Y3M === 0
      ? `No: the 10-year rate stayed above the 2-year rate, and the 2-year above the 3-month, in all of the last ${months} months`
      : `No: the 10-year rate stayed above the 2-year rate in all of the last ${months} months, though the 2-year rate was below the 3-month rate in ${inverted2Y3M} of them`;
  }
  return `Yes, in ${inverted10Y2Y} of the last ${months} months: the 10-year rate was below the 2-year rate, ${shortEnd}`;
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

/** "Conditions changed 3 times in the last 24 months", in the timeline's words. */
export const describeConditionChanges = ({ changeCount, months }: { changeCount: number; months: number }) =>
  changeCount === 0
    ? `Conditions held through all of the last ${months} months`
    : `Conditions changed ${changeCount === 1 ? "once" : `${changeCount} times`} in the last ${months} months`;

const LIST = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/**
 * "Habits in six areas: infrastructure, support, data, pricing, org chart, and roadmap", the
 * answer to "Which zero-rate habits should we check for?": the areas the table walks through.
 */
export const describeFossilSummary = (rows: ReadonlyArray<{ domain: string }>) => {
  if (rows.length === 0) return null;
  const domains = rows.map((row) => row.domain.charAt(0).toLowerCase() + row.domain.slice(1));
  const count = COUNT_WORDS[rows.length] ?? String(rows.length);
  return `Habits in ${count} ${rows.length === 1 ? "area" : "areas"}: ${LIST.format(domains)}`;
};
