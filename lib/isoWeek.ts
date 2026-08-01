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

export const parseIsoWeekSlug = (slug: string): IsoWeek | null => {
  const match = isoWeekSlugPattern.exec(slug);
  if (!match) return null;

  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  return { year: Number(match[1]), week };
};
