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
      `Market climate shifted as tightness (${formatScoreValue(previous.scores.tightness)} → ${formatScoreValue(current.scores.tightness)}) ` +
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
    summary: `Market climate moved from ${previous.regime} to ${current.regime}.`,
  };
};
