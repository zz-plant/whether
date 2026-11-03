import premiseData from "../../data/research/premise-test-results.json";

type PremiseSignalQuarter = {
  quarter: string;
  tight: boolean;
  fundingPressure: number;
  riskAppetite: number;
  forwardValue: number;
  forwardCount: number;
};

type PremiseOutcomeDistribution = {
  regime: "tight" | "calm";
  label: string;
  count: number;
  medianForwardValue: number;
  minForwardValue: number;
  maxForwardValue: number;
  medianForwardCount: number;
};

export type PremiseTestBacktestModel = {
  quarters: readonly PremiseSignalQuarter[];
  tightDistribution: PremiseOutcomeDistribution;
  calmDistribution: PremiseOutcomeDistribution;
  verdict: string;
  totalQuarters: number;
};

const medianOf = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

export const loadPremiseTestBacktestModel = (): PremiseTestBacktestModel => {
  const signals: PremiseSignalQuarter[] = premiseData.signals.map((s) => ({
    quarter: s.quarter,
    tight: s.tight,
    fundingPressure: s.fundingPressure,
    riskAppetite: s.riskAppetite,
    forwardValue: s.forwardValue,
    forwardCount: s.forwardCount,
  }));

  const tightSignals = signals.filter((s) => s.tight);
  const calmSignals = signals.filter((s) => !s.tight);

  const tightValues = tightSignals.map((s) => s.forwardValue);
  const calmValues = calmSignals.map((s) => s.forwardValue);

  const tightCounts = tightSignals.map((s) => s.forwardCount);
  const calmCounts = calmSignals.map((s) => s.forwardCount);

  return {
    quarters: signals,
    totalQuarters: signals.length,
    verdict: premiseData.p1.verdict,
    tightDistribution: {
      regime: "tight",
      label: "Funding pressure > 70 (Tight)",
      count: tightSignals.length,
      medianForwardValue: medianOf(tightValues),
      minForwardValue: Math.min(...tightValues),
      maxForwardValue: Math.max(...tightValues),
      medianForwardCount: medianOf(tightCounts),
    },
    calmDistribution: {
      regime: "calm",
      label: "Funding pressure ≤ 70 (Calm)",
      count: calmSignals.length,
      medianForwardValue: medianOf(calmValues),
      minForwardValue: Math.min(...calmValues),
      maxForwardValue: Math.max(...calmValues),
      medianForwardCount: medianOf(calmCounts),
    },
  };
};
