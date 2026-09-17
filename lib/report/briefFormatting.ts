import type { ReportDynamics } from "./reportData";
import { regimeSignalLabel } from "./signalTranslations";

type ReportSignalDirection = "tightening" | "easing" | "unchanged";

/**
 * Canonical operator-facing signal names.
 *
 * This used to be its own literal under a comment asking the next reader not to
 * add a fourth spelling. A comment cannot enforce that, and the four spellings
 * happened anyway; the map is derived now.
 */
export const deltaLabelBySignal: Record<ReportDynamics["changedSignals"][number]["key"], string> =
  regimeSignalLabel;

export const signalOrder: Array<ReportDynamics["changedSignals"][number]["key"]> = [
  "tightness",
  "riskAppetite",
  "baseRate",
  "curveSlope",
];

export const resolveSignalDirection = (delta: number): ReportSignalDirection =>
  delta > 0 ? "tightening" : delta < 0 ? "easing" : "unchanged";

