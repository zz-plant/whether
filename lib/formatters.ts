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

const monthYearShort2DigitUtcFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "2-digit",
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
  if (unit === "bps") return " bps (basis points)";
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

export const formatTimestampUTC = (value: string) =>
  formatDateValue(value, timestampFormatter);

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

export const formatNumberValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
};

export const formatSignedDeltaValue = (value: number | null) => {
  const formatted = formatNumberValue(value);
  if (formatted === "—") {
    return formatted;
  }
  const sign = value !== null && value > 0 ? "+" : "";
  return `${sign}${formatted}`;
};

export const formatScoreValue = (value: number) => value.toFixed(0);

/**
 * Threshold and score points read in whole points. A decimal appears only when
 * the value carries one — "50.0 (56.0 today)" was precision the engine never had.
 */
export const formatThresholdNumber = (value: number) =>
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);

export const formatMonthYearShortUtc = (date: Date) => monthYearShortUtcFormatter.format(date);

export const formatMonthYearShortFromValue = (value: string) =>
  formatDateValue(value, monthYearShortUtcFormatter);

export const formatMonthYear2DigitFromValue = (value: string) =>
  formatDateValue(value, monthYearShort2DigitUtcFormatter);

export const formatMonthShortUtc = (month: number) =>
  monthShortUtcFormatter.format(new Date(Date.UTC(2020, month - 1, 1)));

export const formatMonthLongYearUtc = (year: number, month: number) =>
  monthLongYearUtcFormatter.format(new Date(Date.UTC(year, month - 1, 1)));

export const formatConceptPublishedLabel = (year: number, month: number) =>
  formatMonthYearShortUtc(new Date(Date.UTC(year, month - 1, 1)));

export const formatNumberWithUnit = (value: number | null, unit: string) => {
  const formatted = formatNumberValue(value);
  return formatted === "—" ? formatted : `${formatted}${formatUnitSuffix(unit)}`;
};

export const formatSignedDeltaWithUnit = (value: number | null, unit: string) => {
  const formatted = formatSignedDeltaValue(value);
  return formatted === "—" ? formatted : `${formatted}${formatUnitSuffix(unit)}`;
};

export const formatSignedDelta = (value: number, precision = 0): string => {
  const formatted = value.toFixed(precision);
  return value > 0 ? `+${formatted}` : formatted;
};
