import type { RegimeSignalKey } from "./report/reportFormatting";

type IndicatorType = "leading" | "lagging";

/**
 * Whether a signal tends to move before the call or confirm it after. Keyed by
 * the signal's engine key rather than its display label, so the evidence
 * page's changed-signals table can look a row up without matching prose. The
 * base rate carries no classification: it is an input, not a driver.
 */
export const indicatorTypeBySignal = {
  tightness: "lagging",
  riskAppetite: "leading",
  curveSlope: "leading",
  baseRate: null,
} as const satisfies Record<RegimeSignalKey, IndicatorType | null>;

const indicatorTypeLabel = {
  leading: "Moves first",
  lagging: "Confirms later",
} as const;

export const indicatorKindLabel = (key: RegimeSignalKey): string | null => {
  const kind = indicatorTypeBySignal[key];
  return kind ? indicatorTypeLabel[kind] : null;
};
