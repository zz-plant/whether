import { formatDateUTC } from "../formatters";

export const formatDelta = (thenValue: number, nowValue: number, unit = "") => {
  const delta = nowValue - thenValue;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}${unit}`;
};

export const formatOptionalDelta = (
  thenValue: number | null,
  nowValue: number | null,
  unit = ""
) => (thenValue === null || nowValue === null ? "—" : formatDelta(thenValue, nowValue, unit));

export const formatDateLabel = (value: string) => formatDateUTC(value);
