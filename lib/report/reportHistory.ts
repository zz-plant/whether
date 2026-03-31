import type { TreasuryData } from "../types";
import { evaluateRegime } from "../regimeEngine";
import { resolveDistanceToFlip as resolveDistanceToFlipFromInputs } from "./confidence";
import { buildReportDynamics } from "./reportEvidence";
import type {
  AnalogScoreDimensions,
  HistoricalAnalog,
  LastYearComparison,
  ReportDynamics,
} from "./reportDataTypes";

const ANALOG_DIMENSION_WEIGHTS: AnalogScoreDimensions = {
  postureMatch: 0.45,
  trendDirection: 0.2,
  confidence: 0.15,
  distanceToFlip: 0.2,
};

const resolveDistanceToFlip = (assessment: ReturnType<typeof evaluateRegime>) =>
  resolveDistanceToFlipFromInputs({
    scores: assessment.scores,
    thresholds: assessment.thresholds,
  });

const resolveConfidenceBand = (assessment: ReturnType<typeof evaluateRegime>) => {
  const gap = resolveDistanceToFlip(assessment);
  if (gap <= 5) return "LOW" as const;
  if (gap <= 12) return "MED" as const;
  return "HIGH" as const;
};

const resolveAnalogImplication = ({
  postureMatch,
  trendDirection,
  confidence,
  distanceToFlip,
}: AnalogScoreDimensions) => {
  if (postureMatch >= 0.99 && trendDirection >= 0.99) {
    return "Posture and momentum closely match this week; reuse operating pace unless boundary distance compresses.";
  }

  if (distanceToFlip < 0.65) {
    return "Similar regime but closer to a flip boundary; tighten approval thresholds and monitor reversal triggers daily.";
  }

  if (confidence < 0.65) {
    return "Pattern match exists with lower confidence; keep experiments reversible until confidence improves.";
  }

  return "Comparable operating setup; preserve bounded rules and revisit if trend direction diverges next update.";
};

export const buildHistoricalAnalogs = ({
  current,
  snapshots,
  thresholds,
  currentTrendDirection,
  limit = 3,
}: {
  current: ReturnType<typeof evaluateRegime>;
  snapshots: TreasuryData[];
  thresholds: ReturnType<typeof import("../thresholds").parseThresholdsFromSearchParams>;
  currentTrendDirection: ReportDynamics["directionLabel"];
  limit?: number;
}): HistoricalAnalog[] => {
  if (snapshots.length <= 1) {
    return [];
  }

  const historicalCandidates = snapshots.slice(0, -1);
  const scored = historicalCandidates
    .map((snapshot, index) => {
      const priorSnapshot = index > 0 ? historicalCandidates[index - 1] ?? null : null;
      const candidateAssessment = evaluateRegime(snapshot, thresholds);
      const candidateDistanceToFlip = resolveDistanceToFlip(candidateAssessment);
      const currentDistanceToFlip = resolveDistanceToFlip(current);
      const maxDistanceDomain = 30;
      const distanceGap = Math.abs(currentDistanceToFlip - candidateDistanceToFlip);

      const dimensions: AnalogScoreDimensions = {
        postureMatch: candidateAssessment.regime === current.regime ? 1 : 0,
        trendDirection:
          buildReportDynamics({
            current: candidateAssessment,
            previous: priorSnapshot ? evaluateRegime(priorSnapshot, thresholds) : null,
          }).directionLabel === currentTrendDirection
            ? 1
            : 0,
        confidence:
          resolveConfidenceBand(candidateAssessment) === resolveConfidenceBand(current)
            ? 1
            : 0.5,
        distanceToFlip: Math.max(0, 1 - distanceGap / maxDistanceDomain),
      };

      const score =
        dimensions.postureMatch * ANALOG_DIMENSION_WEIGHTS.postureMatch +
        dimensions.trendDirection * ANALOG_DIMENSION_WEIGHTS.trendDirection +
        dimensions.confidence * ANALOG_DIMENSION_WEIGHTS.confidence +
        dimensions.distanceToFlip * ANALOG_DIMENSION_WEIGHTS.distanceToFlip;

      return {
        recordDate: snapshot.record_date,
        score,
        dimensions,
        implication: resolveAnalogImplication(dimensions),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.recordDate.localeCompare(a.recordDate);
    });

  return scored.slice(0, limit).map((item) => ({
    ...item,
    score: Number(item.score.toFixed(3)),
  }));
};

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
