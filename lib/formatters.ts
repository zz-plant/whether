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

const MS_PER_HOUR = 60 * 60 * 1000;

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
  const hours = Math.max(0, Math.round((now.getTime() - timestamp.getTime()) / MS_PER_HOUR));
  return `${hours}h.`;
};

export const formatNumberValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
};

export const formatScoreValue = (value: number) => value.toFixed(0);
