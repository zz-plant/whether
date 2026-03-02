export type IndicatorType = "leading" | "lagging";

export const indicatorTypeByScoreLabel = {
  Tightness: "lagging",
  "Risk appetite": "leading",
  "Curve slope": "leading",
} as const satisfies Record<string, IndicatorType>;

export const indicatorTypeLabel = {
  leading: "Leading (predictive)",
  lagging: "Lagging (confirming)",
} as const;
