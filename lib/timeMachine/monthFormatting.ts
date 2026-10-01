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

/* Spelled out, for prose and for the archived-view banner, where "Mar 2020" reads as
   a chart tick rather than a statement about what the reader is looking at. */
const monthLongFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
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

/** `now` moved by whole calendar months on the reader's calendar, with the day held where the month has it. */
const addCalendarMonths = (now: Date, count: number) => {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + count + 1, 0).getDate();
  return new Date(
    now.getFullYear(),
    now.getMonth() + count,
    Math.min(now.getDate(), lastDay),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
};

/**
 * The month a span of months from `now` lands in, on the reader's calendar: "Dec 2027".
 *
 * Whole months are calendar months: Oct 1 plus one is Nov 1, and Jan 30 plus one
 * is the last day of February. A fraction is that share of the month after it,
 * by days, so Oct 1 plus 1.5 lands mid-November. Until 2026-10-01 this added
 * 30.44-day months in UTC: Oct 1 plus one printed "Oct 2026", months 1–3 printed
 * Oct–Dec, Jan 30 plus one printed "Mar", and a Sep 30 evening in Chicago was
 * already October. Every caller renders in the browser after hydration, so the
 * local calendar is the reader's.
 */
export const formatMonthAfter = (now: Date, months: number) => {
  const whole = Math.floor(months);
  const from = addCalendarMonths(now, whole);
  const to = addCalendarMonths(now, whole + 1);
  const date = new Date(from.getTime() + (months - whole) * (to.getTime() - from.getTime()));
  return formatMonthLabel(date.getFullYear(), date.getMonth() + 1);
};

export const formatMonthLongLabel = (year: number, month: number) => {
  return monthLongFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
};

