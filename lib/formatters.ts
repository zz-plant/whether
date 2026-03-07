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

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const formatUnitSuffix = (unit: string) => {
  if (unit === "bps") return " bps";
  if (unit === "index") return "";
  return unit;
};

const parseDateValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

const formatDateValue = (value: string, formatter: Intl.DateTimeFormat) => {
  const date = parseDateValue(value);
  return date ? formatter.format(date) : value;
};

export const formatDateUTC = (value: string) => formatDateValue(value, dateFormatter);

export const formatTimestampUTC = (value: string) =>
  formatDateValue(value, timestampFormatter);

export const formatAgeHours = (value: string | null, now: Date) => {
  if (!value) {
    return "—";
  }
  const timestamp = parseDateValue(value);
  if (!timestamp) {
    return "—";
  }
  const ageMs = Math.max(0, now.getTime() - timestamp.getTime());
  if (ageMs < MS_PER_MINUTE) {
    const seconds = Math.round(ageMs / MS_PER_SECOND);
    return `${seconds}s.`;
  }
  if (ageMs < MS_PER_HOUR) {
    const minutes = Math.round(ageMs / MS_PER_MINUTE);
    return `${minutes}m.`;
  }
  const hours = Math.round(ageMs / MS_PER_HOUR);
  return `${hours}h.`;
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

export const formatPublishedLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

export const formatNumberWithUnit = (value: number | null, unit: string) => {
  const formatted = formatNumberValue(value);
  return formatted === "—" ? formatted : `${formatted}${formatUnitSuffix(unit)}`;
};

export const formatSignedDeltaWithUnit = (value: number | null, unit: string) => {
  const formatted = formatSignedDeltaValue(value);
  return formatted === "—" ? formatted : `${formatted}${formatUnitSuffix(unit)}`;
};
