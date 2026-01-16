/**
 * Time Machine helpers for building historical Treasury queries and labeling context.
 * Keeps historical mode explicit to avoid confusing operators with stale data.
 */
export const buildHistoricalQuery = (isoDate: string) => {
  return `record_date:lte:${isoDate}`;
};

export const resolveHistoricalDate = (year: number, month: number) => {
  const lastDay = new Date(Date.UTC(year, month, 0));
  return lastDay.toISOString().slice(0, 10);
};

export const formatHistoricalBanner = (year: number, month: number) => {
  const paddedMonth = String(month).padStart(2, "0");
  return `Historical View: ${year}-${paddedMonth}`;
};
