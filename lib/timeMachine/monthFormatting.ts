type ParsedMonthInput = {
  year: number;
  month: number;
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthShortFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

export const formatMonthInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return undefined;
  }

  return toMonthInput(date.getUTCFullYear(), date.getUTCMonth() + 1);
};

export const parseMonthInput = (value: string): ParsedMonthInput | null => {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (
    !yearPart ||
    !monthPart ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
};

export const toMonthInput = (year: number, month: number) => {
  return `${year}-${String(month).padStart(2, "0")}`;
};

export const formatMonthLabel = (year: number, month: number) => {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
};

export const formatMonthShortLabel = (year: number, month: number) => {
  return monthShortFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
};

