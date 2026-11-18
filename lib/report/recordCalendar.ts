import type { RegimeKey } from "../types";
import { REGIME_LABELS, REGIME_SEVERITY_RANK } from "../regimePresentation";
import { formatMonthYearShortFromValue } from "../formatters";
import { buildTimeMachineHref } from "../timeMachine/timeMachineSelection";
import { regimeSignalLabel } from "./signalTranslations";

/**
 * The record read by calendar: a row per year, a column per month, each cell the
 * month-end's conditions (2026-11-18).
 *
 * /history printed one word per year ("2025 Cloudy"), the condition the year's
 * archive page headlines. That word hid every change inside a year: 2025 went
 * Freezing to Cloudy in May and Cloudy to Sunny in December and read "Cloudy". The
 * record band above every page draws the same months by time, one stretch after
 * another; it cannot set one May beside another, or show where in a year a change
 * fell. This model is the month-end series laid out that way, and nothing else: the
 * readings the band draws, scored with today's formula (§XXX keeps the published
 * briefs apart, and they are not here).
 */
type CalendarEntry = {
  year: number;
  month: number;
  recordDate: string;
  regime: RegimeKey;
  tightness: number;
  riskAppetite: number;
};

type RecordCalendarCell = {
  recordDate: string;
  year: number;
  month: number;
  regime: RegimeKey;
  /** "Mar 2025". */
  monthLabel: string;
  /** "Mar 2025 · Freezing · funding pressure 90, risk appetite 51": the cell's name and its readout. */
  label: string;
  /** The brief as it read that month (the time machine). */
  href: string;
  /** The first month of a stretch within its row, where the condition's glyph goes. */
  runStart: boolean;
};

type RecordCalendarYear = {
  year: number;
  /** Twelve slots, January first; null where the record holds no reading for that month. */
  months: (RecordCalendarCell | null)[];
};

export type RecordCalendar = {
  /** Newest year first, as the page's other record lists run. */
  years: RecordCalendarYear[];
  /** "Jan 2012 – Oct 2026". */
  rangeLabel: string;
  /** Months under each condition, mildest first: the grid's key and its totals in one line. */
  totals: { regime: RegimeKey; months: number }[];
};

/** "Mar 2025 · Freezing · funding pressure 90, risk appetite 51", the record band's readout wording. */
export const describeMonthReading = (entry: Pick<CalendarEntry, "recordDate" | "regime" | "tightness" | "riskAppetite">) =>
  `${formatMonthYearShortFromValue(entry.recordDate)} · ${REGIME_LABELS[entry.regime]} · ` +
  `${regimeSignalLabel.tightness.toLowerCase()} ${Math.round(entry.tightness)}, ` +
  `${regimeSignalLabel.riskAppetite.toLowerCase()} ${Math.round(entry.riskAppetite)}`;

export const buildRecordCalendar = (series: readonly CalendarEntry[]): RecordCalendar | null => {
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const first = ordered.at(0);
  const latest = ordered.at(-1);
  if (!first || !latest) return null;

  const byMonth = new Map(ordered.map((entry) => [`${entry.year}-${entry.month}`, entry]));
  const years: RecordCalendarYear[] = [];
  for (let year = latest.year; year >= first.year; year -= 1) {
    let previous: RegimeKey | null = null;
    const months = Array.from({ length: 12 }, (_unused, index): RecordCalendarCell | null => {
      const entry = byMonth.get(`${year}-${index + 1}`);
      if (!entry) {
        previous = null;
        return null;
      }
      const runStart = entry.regime !== previous;
      previous = entry.regime;
      return {
        recordDate: entry.recordDate,
        year,
        month: entry.month,
        regime: entry.regime,
        monthLabel: formatMonthYearShortFromValue(entry.recordDate),
        label: describeMonthReading(entry),
        href: buildTimeMachineHref("/", { year, month: entry.month }),
        runStart,
      };
    });
    years.push({ year, months });
  }

  const counts = new Map<RegimeKey, number>();
  for (const entry of ordered) counts.set(entry.regime, (counts.get(entry.regime) ?? 0) + 1);
  const totals = [...counts.entries()]
    .map(([regime, months]) => ({ regime, months }))
    .sort((left, right) => REGIME_SEVERITY_RANK[left.regime] - REGIME_SEVERITY_RANK[right.regime]);

  return {
    years,
    rangeLabel: `${formatMonthYearShortFromValue(first.recordDate)} – ${formatMonthYearShortFromValue(latest.recordDate)}`,
    totals,
  };
};
