/**
 * One month at a time, across every drawing on a page (2026-11-18): the arithmetic
 * behind `app/components/monthCursor.tsx`, kept apart from the DOM so it is testable
 * and so a client piece that reads it ships nothing else.
 *
 * The contract every drawing keeps:
 * - An element that stands for one month carries `data-month="YYYY-MM"`; a stretch
 *   carries `data-month-from` and `data-month-to` (either alone stands for one month).
 * - The page's month is announced on `document` as a `whether:month` CustomEvent whose
 *   `detail` is `{ month: "YYYY-MM" | null }`. Any drawing may announce one; every
 *   drawing follows it. `<html data-active-month>` holds the current one, and each
 *   element that stands for it carries `data-month-active`.
 *
 * A month key is the record date's first seven characters, so keys sort as strings.
 */

export const MONTH_EVENT = "whether:month";

export type MonthKey = string;

export type MonthEventDetail = { month: MonthKey | null };

const MONTH_KEY = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export const isMonthKey = (value: unknown): value is MonthKey => typeof value === "string" && MONTH_KEY.test(value);

export const toMonthKey = (year: number, month: number): MonthKey => `${year}-${String(month).padStart(2, "0")}`;

/** The month a record date ("2024-03-31") or a month key names; null for anything else. */
export const monthKeyOf = (value: string | null | undefined): MonthKey | null => {
  const key = (value ?? "").slice(0, 7);
  return isMonthKey(key) ? key : null;
};

/** A month key moved by whole months: `shiftMonthKey("2024-12", 1)` is "2025-01". */
export const shiftMonthKey = (key: MonthKey, delta: number): MonthKey => {
  const total = Number(key.slice(0, 4)) * 12 + (Number(key.slice(5, 7)) - 1) + delta;
  return toMonthKey(Math.floor(total / 12), (((total % 12) + 12) % 12) + 1);
};

/** Whether a stretch from `from` to `to` (either may be missing; then it is the other) holds `month`. */
export const rangeHoldsMonth = (month: MonthKey, from: string | null | undefined, to: string | null | undefined) => {
  const start = monthKeyOf(from) ?? monthKeyOf(to);
  const end = monthKeyOf(to) ?? start;
  return Boolean(start && end && start <= month && month <= end);
};

/**
 * The month a mark stands for: its own `data-month`, or the first month of the
 * stretch it draws (its link opens that month too).
 */
export const markMonth = (attributes: { month?: string | null; monthFrom?: string | null; monthTo?: string | null }) =>
  monthKeyOf(attributes.month) ?? monthKeyOf(attributes.monthFrom) ?? monthKeyOf(attributes.monthTo);

/**
 * The next month along `months` from `active`, a step back (-1) or forward (1). With
 * nothing active the step starts at the latest month. A month that is not among
 * `months` (one the record band named) steps to its nearest neighbour that way; at
 * either end the month stays. Null when there are no months at all.
 */
export const stepMonthKey = (months: readonly string[], active: MonthKey | null, direction: -1 | 1): MonthKey | null => {
  const ordered = [...new Set(months.filter(isMonthKey))].sort();
  const latest = ordered.at(-1);
  if (!latest) return null;
  if (!active) return latest;
  if (direction < 0) return ordered.filter((month) => month < active).at(-1) ?? active;
  return ordered.find((month) => month > active) ?? active;
};

/** How many months `key` falls after the month of `firstDate`: a month's slot on the record band. */
export const monthsAfter = (firstDate: string, key: MonthKey) =>
  Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - (Number(firstDate.slice(0, 4)) * 12 + Number(firstDate.slice(5, 7)));

/** Every month the record band holds, oldest first, from its first date and its month count. */
export const recordMonthKeys = (firstDate: string, count: number): MonthKey[] => {
  const first = monthKeyOf(firstDate);
  if (!first || count <= 0) return [];
  return Array.from({ length: count }, (_unused, index) => shiftMonthKey(first, index));
};

/** The month an announcement names, or null for a clear (or anything malformed). */
export const monthOfDetail = (detail: unknown): MonthKey | null => {
  const month = detail && typeof detail === "object" ? (detail as { month?: unknown }).month : null;
  return isMonthKey(month) ? month : null;
};
