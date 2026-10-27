/**
 * ISO-8601 week helpers.
 *
 * Shared by the weekly summary generator and the published-brief freeze pipeline
 * so both derive the same week label for the same date.
 */
export type IsoWeek = { year: number; week: number };

export const getIsoWeekInfo = (date: Date): IsoWeek => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: target.getUTCFullYear(), week };
};

export const formatIsoWeekSlug = ({ year, week }: IsoWeek) => `${year}-w${String(week).padStart(2, "0")}`;

const isoWeekSlugPattern = /^(\d{4})-w(\d{2})$/;

/**
 * The number of ISO-8601 weeks in a year: 52, unless the year's Jan 1 falls on
 * a Thursday, or the year is leap and Jan 1 falls on a Wednesday — the two
 * shapes that give a year a 53rd week. Week arithmetic that assumes 52 per
 * year drifts by a week across one of these years, so the count is read from
 * the calendar rather than assumed.
 */
export const isoWeeksInYear = (year: number): number => {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const weekday = jan1.getUTCDay() || 7; // Monday = 1 … Sunday = 7
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return weekday === 4 || (isLeap && weekday === 3) ? 53 : 52;
};

/**
 * The Monday starting a given ISO week, as a date. Week 1 is the week holding
 * the year's first Thursday, so its Monday is the one on or before Jan 4; the
 * returned date anchors the week absolutely, which lets two slugs from
 * different years be compared as a plain day difference divided by seven.
 */
export const isoWeekMonday = ({ year, week }: IsoWeek): Date => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const weekday = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (weekday - 1) + (week - 1) * 7);
  return monday;
};

export const parseIsoWeekSlug = (slug: string): IsoWeek | null => {
  const match = isoWeekSlugPattern.exec(slug);
  if (!match) return null;

  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  return { year: Number(match[1]), week };
};
