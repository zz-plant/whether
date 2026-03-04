import type { evaluateRegime } from "../../regimeEngine";

export type LastYearComparison = {
  current: {
    recordDate: string;
    regime: string;
    tightness: number;
    riskAppetite: number;
    curveSlope: number | null;
    baseRate: number;
  };
  prior: {
    recordDate: string;
    regime: string;
    tightness: number;
    riskAppetite: number;
    curveSlope: number | null;
    baseRate: number;
  };
};

export type ReportDynamics = {
  changedSignals: Array<{
    key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
    label: string;
    delta: number;
  }>;
  totalSignalChanges: number;
  regimeChanged: boolean;
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable";
};

export const signalDeltaImprovesWhen: Record<
  ReportDynamics["changedSignals"][number]["key"],
  "positive" | "negative"
> = {
  tightness: "negative",
  riskAppetite: "positive",
  baseRate: "negative",
  curveSlope: "positive",
};

export const isImprovingSignalDelta = (
  key: ReportDynamics["changedSignals"][number]["key"],
  delta: number,
): boolean => (signalDeltaImprovesWhen[key] === "positive" ? delta > 0 : delta < 0);

export const buildLastYearComparison = ({
  current,
  currentRecordDate,
  prior,
  priorRecordDate,
}: {
  current: ReturnType<typeof evaluateRegime>;
  currentRecordDate: string;
  prior: ReturnType<typeof evaluateRegime>;
  priorRecordDate: string;
}): LastYearComparison => ({
  current: {
    recordDate: currentRecordDate,
    regime: current.regime,
    tightness: current.scores.tightness,
    riskAppetite: current.scores.riskAppetite,
    curveSlope: current.scores.curveSlope,
    baseRate: current.scores.baseRate,
  },
  prior: {
    recordDate: priorRecordDate,
    regime: prior.regime,
    tightness: prior.scores.tightness,
    riskAppetite: prior.scores.riskAppetite,
    curveSlope: prior.scores.curveSlope,
    baseRate: prior.scores.baseRate,
  },
});

const signalLabels: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Cash availability",
  riskAppetite: "Risk appetite",
  baseRate: "Base rate",
  curveSlope: "Curve slope",
};

export const buildReportDynamics = ({
  current,
  previous,
}: {
  current: ReturnType<typeof evaluateRegime>;
  previous: ReturnType<typeof evaluateRegime> | null;
}): ReportDynamics => {
  if (!previous) {
    return {
      changedSignals: [],
      totalSignalChanges: 0,
      regimeChanged: false,
      directionLabel: "stable",
    };
  }

  const comparisons = [
    {
      key: "tightness" as const,
      label: signalLabels.tightness,
      delta: current.scores.tightness - previous.scores.tightness,
    },
    {
      key: "riskAppetite" as const,
      label: signalLabels.riskAppetite,
      delta: current.scores.riskAppetite - previous.scores.riskAppetite,
    },
    {
      key: "baseRate" as const,
      label: signalLabels.baseRate,
      delta: current.scores.baseRate - previous.scores.baseRate,
    },
    {
      key: "curveSlope" as const,
      label: signalLabels.curveSlope,
      delta: (current.scores.curveSlope ?? 0) - (previous.scores.curveSlope ?? 0),
    },
  ].filter((item) => Math.abs(item.delta) >= 0.01);

  const improvingMoves = comparisons.filter((item) =>
    isImprovingSignalDelta(item.key, item.delta),
  ).length;
  const deterioratingMoves = comparisons.filter((item) => !isImprovingSignalDelta(item.key, item.delta)).length;
  const directionLabel: ReportDynamics["directionLabel"] =
    comparisons.length === 0
      ? "stable"
      : improvingMoves > 0 && deterioratingMoves > 0
        ? "mixed"
        : improvingMoves > 0
          ? "improving"
          : "deteriorating";

  return {
    changedSignals: comparisons,
    totalSignalChanges: comparisons.length,
    regimeChanged: current.regime !== previous.regime,
    directionLabel,
  };
};
