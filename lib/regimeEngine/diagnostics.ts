import {
  DIAGNOSTIC_CONFIDENCE_HIGH_DELTA,
  DIAGNOSTIC_CONFIDENCE_MEDIUM_DELTA,
  DIAGNOSTIC_INTENSITY_STANDARD_DELTA,
  DIAGNOSTIC_INTENSITY_STRONG_DELTA,
  DIAGNOSTIC_TRANSITION_WATCH_DELTA,
  TWO_WEAK_READS_WARNING_COUNT,
} from "./constants";
import type { RegimeDiagnostics, RegimeThresholds } from "./types";

export const computeDiagnostics = (
  tightness: number,
  riskAppetite: number,
  thresholds: RegimeThresholds,
  boundaryContributors: string[] = [],
  weakReadCount = 0,
): RegimeDiagnostics => {
  const tightnessDelta = Math.round(tightness - thresholds.tightnessRegime);
  const riskAppetiteDelta = Math.round(riskAppetite - thresholds.riskAppetiteRegime);
  const nearestThresholdDelta = Math.min(Math.abs(tightnessDelta), Math.abs(riskAppetiteDelta));
  const confidence =
    nearestThresholdDelta >= DIAGNOSTIC_CONFIDENCE_HIGH_DELTA
      ? "HIGH"
      : nearestThresholdDelta >= DIAGNOSTIC_CONFIDENCE_MEDIUM_DELTA
        ? "MEDIUM"
        : "LOW";
  const transitionWatch = nearestThresholdDelta <= DIAGNOSTIC_TRANSITION_WATCH_DELTA;
  const intensity =
    nearestThresholdDelta >= DIAGNOSTIC_INTENSITY_STRONG_DELTA
      ? "STRONG"
      : nearestThresholdDelta >= DIAGNOSTIC_INTENSITY_STANDARD_DELTA
        ? "STANDARD"
        : "MILD";

  return {
    tightnessDelta,
    riskAppetiteDelta,
    nearestThresholdDelta,
    confidence,
    transitionWatch,
    intensity,
    boundaryContributors,
    weakReadCount,
    twoWeakReadsWarning: weakReadCount >= TWO_WEAK_READS_WARNING_COUNT,
  };
};
