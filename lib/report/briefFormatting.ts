import type { ReportDynamics } from "./reportData";

type ReportSignalDirection = "tightening" | "easing" | "unchanged";

/**
 * Canonical operator-facing signal names. These match the glossary in
 * `lib/report/reportCopy.ts` — do not introduce a fourth spelling of the same
 * four signals.
 */
export const deltaLabelBySignal: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Funding pressure",
  riskAppetite: "Risk appetite",
  baseRate: "Fed interest rate",
  curveSlope: "Recession warning gauge",
};

export const signalOrder: Array<ReportDynamics["changedSignals"][number]["key"]> = [
  "tightness",
  "riskAppetite",
  "baseRate",
  "curveSlope",
];

export const resolveSignalDirection = (delta: number): ReportSignalDirection =>
  delta > 0 ? "tightening" : delta < 0 ? "easing" : "unchanged";

