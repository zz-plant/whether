/**
 * Time Machine helpers for building historical Treasury queries and labeling context.
 * Keeps historical mode explicit to avoid confusing operators with stale data.
 */
export const buildHistoricalQuery = (isoDate: string) => {
  return `record_date:lte:${isoDate}`;
};

export const formatHistoricalBanner = (year: number, month: number) => {
  const paddedMonth = String(month).padStart(2, "0");
  return `Historical View: ${year}-${paddedMonth}`;
};
