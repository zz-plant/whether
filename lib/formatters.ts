const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatDateUTC = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

export const formatTimestampUTC = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : timestampFormatter.format(date);
};

export const formatAgeHours = (value: string | null, now: Date) => {
  if (!value) {
    return "—";
  }
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) {
    return "—";
  }
  const hours = Math.max(0, Math.round((now.getTime() - timestamp.getTime()) / 36e5));
  return `${hours}h.`;
};

export const formatNumberValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
};

export const formatScoreValue = (value: number) => value.toFixed(0);
