import type { CrossingRiskLabel } from "./forecastModel";
import type { RegimeAssessment } from "../regimeEngine";
import { formatScoreValue } from "../formatters";

export const buildRegimeAlert = (
  current: RegimeAssessment,
  previous: RegimeAssessment,
  currentRecordDate: string,
  previousRecordDate: string
) => {
  const tightnessThreshold = current.thresholds.tightnessRegime;
  const riskThreshold = current.thresholds.riskAppetiteRegime;
  const wasTight = previous.scores.tightness > tightnessThreshold;
  const isTight = current.scores.tightness > tightnessThreshold;
  const wasBrave = previous.scores.riskAppetite > riskThreshold;
  const isBrave = current.scores.riskAppetite > riskThreshold;
  const regimeChanged = current.regime !== previous.regime;
  const thresholdCrossed = wasTight !== isTight || wasBrave !== isBrave;
  const reasons: string[] = [];

  if (!regimeChanged && !thresholdCrossed) {
    return null;
  }

  if (wasTight !== isTight) {
    reasons.push(
      `Tightness moved ${isTight ? "above" : "below"} ${formatScoreValue(tightnessThreshold)}.`
    );
  }
  if (wasBrave !== isBrave) {
    reasons.push(
      `Risk appetite moved ${isBrave ? "above" : "below"} ${formatScoreValue(riskThreshold)}.`
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      `Capital posture shifted as tightness (${formatScoreValue(previous.scores.tightness)} → ${formatScoreValue(current.scores.tightness)}) ` +
        `and risk appetite (${formatScoreValue(previous.scores.riskAppetite)} → ${formatScoreValue(current.scores.riskAppetite)}) moved across boundaries.`
    );
  }

  return {
    changed: regimeChanged,
    currentRegime: current.regime,
    previousRegime: previous.regime,
    currentRecordDate,
    previousRecordDate,
    reasons,
    summary: `Capital posture moved from ${previous.regime} to ${current.regime}.`,
  };
};

const crossingRiskLabels: Record<CrossingRiskLabel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const formatRegimeProbability = (probability: number): string => {
  const bounded = Math.min(100, Math.max(0, Math.round(probability)));
  return `${bounded}%`;
};

export const formatCrossingRiskLabel = (risk: CrossingRiskLabel): string => crossingRiskLabels[risk];
