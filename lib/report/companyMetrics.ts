export type CompanyMetrics = {
  burnRate: number;
  runwayMonths: number;
  headcount: number;
};

type MetricsGuidance = {
  recommendedBurn: number;
  extendedRunway: number;
  cashRemaining: number;
  adjustmentPercent: number;
  direction: "reduce" | "maintain" | "expand";
};

export function computeMetricsGuidance(
  metrics: CompanyMetrics,
  tightness: number,
): MetricsGuidance {
  const cashRemaining = metrics.burnRate * metrics.runwayMonths;

  const adjustmentPercent = tightness > 75
    ? 0.25
    : tightness > 65
      ? 0.15
      : tightness > 50
        ? 0.05
        : tightness > 35
          ? 0
          : -0.10;

  const recommendedBurn = Math.round(metrics.burnRate * (1 - adjustmentPercent));
  const extendedRunway = Math.round((cashRemaining / recommendedBurn) * 10) / 10;

  return {
    recommendedBurn,
    extendedRunway,
    cashRemaining,
    adjustmentPercent: Math.round(adjustmentPercent * 100),
    direction: adjustmentPercent > 0.05 ? "reduce" : adjustmentPercent < -0.05 ? "expand" : "maintain",
  };
}
