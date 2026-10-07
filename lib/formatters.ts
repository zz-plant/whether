const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

const monthYearShortUtcFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthShortUtcFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const monthLongYearUtcFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
/** Mean Gregorian month, so a month bucket does not drift against calendar length. */
const MS_PER_MONTH = 30.4375 * MS_PER_DAY;

const formatUnitSuffix = (unit: string) => {
  if (unit === "bps") return " basis points";
  if (unit === "index") return "";
  return unit;
};

const parseDateValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

const addUtcDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const getNextFridayUTC = (date: Date) => {
  const day = date.getUTCDay();
  const daysToFriday = (5 - day + 7) % 7;
  return addUtcDays(date, daysToFriday);
};

const formatDateValue = (value: string, formatter: Intl.DateTimeFormat) => {
  const date = parseDateValue(value);
  return date ? formatter.format(date) : value;
};

export const formatDateUTC = (value: string) => formatDateValue(value, dateFormatter);

export const resolveWeekEndingIsoDateUTC = (value: string) => {
  const date = parseDateValue(value);
  if (!date) {
    return value;
  }
  return getNextFridayUTC(date).toISOString().slice(0, 10);
};

export const formatWeekEndingUTC = (value: string) =>
  formatDateUTC(resolveWeekEndingIsoDateUTC(value));

/*
 * Assembled from parts, not `timestampFormatter.format()`: the glue between the date and the
 * time is ICU locale data, not an option. Node and workerd write "Mar 10, 2026, 8:00 PM UTC";
 * Bun on macOS reads the system ICU (74) and writes "Mar 10, 2026 at 8:00 PM UTC". So one
 * reading printed two ways depending on the machine — the frozen briefs in
 * data/published_briefs.json carry both — and a test of the label passed in the build container
 * and failed on a workstation (2026-10-07).
 */
export const formatTimestampUTC = (value: string) => {
  const date = parseDateValue(value);
  if (!date) {
    return value;
  }
  const parts = timestampFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("month")} ${part("day")}, ${part("year")}, ${part("hour")}:${part("minute")} ${part("dayPeriod")} ${part("timeZoneName")}`;
};

/**
 * Coarse age, no trailing punctuation: "45s", "12m", "6h", "18d", "7mo".
 *
 * Buckets past hours because a genuinely stale source otherwise renders as a raw hour count
 * — a curated snapshot last written in February reads as "4824h.", which is accurate and
 * tells an operator nothing. Returns null when there is no parseable timestamp, so callers
 * choose their own placeholder.
 */
export const formatAgeSpan = (value: string | null, now: Date): string | null => {
  if (!value) {
    return null;
  }
  const timestamp = parseDateValue(value);
  if (!timestamp) {
    return null;
  }
  const ageMs = Math.max(0, now.getTime() - timestamp.getTime());
  if (ageMs < MS_PER_MINUTE) {
    return `${Math.round(ageMs / MS_PER_SECOND)}s`;
  }
  if (ageMs < MS_PER_HOUR) {
    return `${Math.round(ageMs / MS_PER_MINUTE)}m`;
  }
  if (ageMs < MS_PER_DAY) {
    return `${Math.round(ageMs / MS_PER_HOUR)}h`;
  }
  if (ageMs < 60 * MS_PER_DAY) {
    return `${Math.round(ageMs / MS_PER_DAY)}d`;
  }
  return `${Math.round(ageMs / MS_PER_MONTH)}mo`;
};

export const formatAgeHours = (value: string | null, now: Date) => {
  const span = formatAgeSpan(value, now);
  return span ? `${span}.` : "—";
};

/** Each unit `formatAgeSpan` writes, in milliseconds. */
const AGE_SPAN_UNIT_MS = new Map<string, number>([
  ["s", MS_PER_SECOND],
  ["m", MS_PER_MINUTE],
  ["h", MS_PER_HOUR],
  ["d", MS_PER_DAY],
  ["mo", MS_PER_MONTH],
]);

/**
 * Hours in a label `formatAgeSpan` or `formatAgeHours` wrote ("6m.", "14h",
 * "3mo."), or null for anything else ("—"). Prefer the timestamp when one is in
 * reach; this is for a caller that holds only the label.
 *
 * `/api/summary-delta` read the digits alone, so "6m." (six minutes) published
 * `weeklyAgeHours: 6` and a three-month-old snapshot ("3mo.") published 3.
 */
export const parseAgeSpanHours = (label: string): number | null => {
  const match = /^(\d+)(mo|s|m|h|d)\.?$/.exec(label.trim());
  const unitMs = match ? AGE_SPAN_UNIT_MS.get(match[2]) : undefined;
  if (!match || unitMs === undefined) {
    return null;
  }
  return (Number.parseInt(match[1], 10) * unitMs) / MS_PER_HOUR;
};

const formatNumberValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
};

export const formatScoreValue = (value: number) => value.toFixed(0);

/**
 * Threshold and score points read in whole points. A decimal appears only when
 * the value carries one — "50.0 (56.0 today)" was precision the engine never had.
 */
export const formatThresholdNumber = (value: number) =>
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);

/**
 * "0.30 percentage points": a move in a rate, or in the gap between two, is a
 * difference of rates, never a percent of one. The flash alert and the homepage's
 * interest-rate translation of the change line both print it; the translation
 * said "0.22%" until 2026-10-07, a 0.22% change of a 3.68% rate read literally.
 */
export const formatPointsMove = (value: number) => `${Math.abs(value).toFixed(2)} percentage points`;

export const formatMonthYearShortFromValue = (value: string) =>
  formatDateValue(value, monthYearShortUtcFormatter);

export const formatMonthShortUtc = (month: number) =>
  monthShortUtcFormatter.format(new Date(Date.UTC(2020, month - 1, 1)));

export const formatMonthLongYearUtc = (year: number, month: number) =>
  monthLongYearUtcFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
/* An index is a count on its own scale ("Tech layoff trend: 66"), so it keeps
   only the places it has; the forced two printed "66.00" beside "3.12%". */
const indexFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const formatNumberWithUnit = (value: number | null, unit: string) => {
  if (unit === "index" && value !== null && !Number.isNaN(value)) return indexFormatter.format(value);
  const formatted = formatNumberValue(value);
  return formatted === "—" ? formatted : `${formatted}${formatUnitSuffix(unit)}`;
};

/** "+2.0" / "-3.0", or null for no delta — the shape a "vs last week" cell wants. Was retyped three times. */
export const formatSignedDeltaOrNull = (delta: number | null | undefined, precision = 1): string | null =>
  typeof delta === "number" && Number.isFinite(delta) && delta !== 0
    ? `${delta > 0 ? "+" : ""}${delta.toFixed(precision)}`
    : null;

export const formatSignedDelta = (value: number, precision = 0): string => {
  const formatted = value.toFixed(precision);
  return value > 0 ? `+${formatted}` : formatted;
};
