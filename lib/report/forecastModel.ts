/**
 * Posture-transition forecasting model (regime boundary movement),
 * not a macro growth forecasting model.
 */
import {
  classifyRegime,
  type RegimeAssessment,
  type RegimeKey,
} from "../regimeEngine";
import type { MacroSeriesId, MacroSeriesReading } from "../types";
import type { ReportDynamics } from "./reportData";

export type ForecastRegimeLabel =
  | "Expansion"
  | "Mixed"
  | "Scarcity"
  | "Defensive";
export type SignalDirection = "up" | "down" | "flat";
export type SignalTrajectoryLabel = "improving" | "deteriorating" | "stable";
export type CrossingRiskLabel = "low" | "medium" | "high";
export type BoundaryMomentum =
  | "toward-threshold"
  | "away-from-threshold"
  | "mixed"
  | "stable";

export interface ForecastModel {
  next4WeekProbabilities: Record<ForecastRegimeLabel, number>;
  next90DayProbabilities: Record<ForecastRegimeLabel, number>;
  boundaryPressure: {
    distance: number;
    momentum: BoundaryMomentum;
    crossingRisk: CrossingRiskLabel;
  };
  signalTrajectory: {
    riskAppetite: SignalTrajectoryLabel;
    tightness: SignalTrajectoryLabel;
    yieldCurveProxy: SignalTrajectoryLabel;
  };
}

const DIRECTION_EPSILON = 0.01;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toDirection = (
  delta: number,
  epsilon = DIRECTION_EPSILON,
): SignalDirection => {
  if (delta > epsilon) {
    return "up";
  }
  if (delta < -epsilon) {
    return "down";
  }
  return "flat";
};

const toTrajectory = ({
  key,
  delta,
}: {
  key: "tightness" | "riskAppetite" | "curveSlope";
  delta: number;
}): SignalTrajectoryLabel => {
  const direction = toDirection(
    delta,
    key === "curveSlope" ? 0.001 : DIRECTION_EPSILON,
  );
  if (direction === "flat") {
    return "stable";
  }

  if (key === "tightness") {
    return direction === "down" ? "improving" : "deteriorating";
  }

  return direction === "up" ? "improving" : "deteriorating";
};

const normalizeProbabilities = (
  probabilities: Record<ForecastRegimeLabel, number>,
) => {
  const total = Object.values(probabilities).reduce(
    (sum, value) => sum + value,
    0,
  );
  if (total <= 0) {
    return {
      Expansion: 25,
      Mixed: 25,
      Scarcity: 25,
      Defensive: 25,
    } satisfies Record<ForecastRegimeLabel, number>;
  }

  const labels: ForecastRegimeLabel[] = [
    "Expansion",
    "Mixed",
    "Scarcity",
    "Defensive",
  ];
  const normalized = labels.reduce<Record<ForecastRegimeLabel, number>>(
    (acc, label) => {
      acc[label] = Math.round((probabilities[label] / total) * 100);
      return acc;
    },
    { Expansion: 0, Mixed: 0, Scarcity: 0, Defensive: 0 },
  );

  const normalizedTotal = Object.values(normalized).reduce(
    (sum, value) => sum + value,
    0,
  );
  const diff = 100 - normalizedTotal;
  if (diff !== 0) {
    const dominantLabel = labels.sort(
      (a, b) => normalized[b] - normalized[a],
    )[0];
    normalized[dominantLabel] += diff;
  }

  return normalized;
};

const findSignalDelta = (
  dynamics: ReportDynamics,
  key: ReportDynamics["changedSignals"][number]["key"],
) => dynamics.changedSignals.find((signal) => signal.key === key)?.delta ?? 0;

const stressUpIsWorseSeries = new Set<MacroSeriesId>([
  "HY_CREDIT_SPREAD",
  "CHICAGO_FCI",
  "VIX_INDEX",
  "TECH_LAYOFF_TREND",
  "UNEMPLOYMENT_RATE",
  "CPI_YOY",
  "BBB_CREDIT_SPREAD",
]);
const reliefUpIsBetterSeries = new Set<MacroSeriesId>([
  "VC_FUNDING_VELOCITY",
  "SAAS_VALUATION_MULTIPLE",
  "EARNINGS_REVISION_INDEX",
  "AI_COMPUTE_COST_TREND",
]);

const computeMacroDownsideBias = (
  macroSeries: MacroSeriesReading[],
): number => {
  let score = 0;
  let weightTotal = 0;

  macroSeries.forEach((series) => {
    const latest = series.history?.at(0)?.value;
    const prior = series.history?.at(1)?.value;
    if (typeof latest !== "number" || typeof prior !== "number") {
      return;
    }

    const delta = latest - prior;
    const normalizedStep = Math.tanh(Math.abs(delta));
    if (stressUpIsWorseSeries.has(series.id)) {
      score += Math.sign(delta) * normalizedStep;
      weightTotal += normalizedStep;
      return;
    }

    if (reliefUpIsBetterSeries.has(series.id)) {
      score -= Math.sign(delta) * normalizedStep;
      weightTotal += normalizedStep;
    }
  });

  if (weightTotal === 0) {
    return 0;
  }

  return clamp(score / weightTotal, -1, 1);
};

const toForecastLabel = (regime: RegimeKey): ForecastRegimeLabel => {
  if (regime === "EXPANSION") return "Expansion";
  if (regime === "SCARCITY") return "Scarcity";
  if (regime === "DEFENSIVE") return "Defensive";
  return "Mixed";
};

const classifyGapMotion = (
  gap: number,
  drift: number,
): "toward" | "away" | "flat" => {
  if (Math.abs(drift) <= DIRECTION_EPSILON) {
    return "flat";
  }

  const movedGap = gap + drift;
  const movedAbs = Math.abs(movedGap);
  const baseAbs = Math.abs(gap);

  if (gap !== 0 && Math.sign(movedGap) !== Math.sign(gap)) {
    return "toward";
  }

  if (movedAbs < baseAbs - DIRECTION_EPSILON) {
    return "toward";
  }
  if (movedAbs > baseAbs + DIRECTION_EPSILON) {
    return "away";
  }

  return "flat";
};

export const classifyBoundaryMomentum = ({
  tightnessGap,
  riskGap,
  tightnessDrift,
  riskDrift,
}: {
  tightnessGap: number;
  riskGap: number;
  tightnessDrift: number;
  riskDrift: number;
}): BoundaryMomentum => {
  const tightnessMotion = classifyGapMotion(tightnessGap, tightnessDrift);
  const riskMotion = classifyGapMotion(riskGap, riskDrift);

  if (tightnessMotion === "flat" && riskMotion === "flat") {
    return "stable";
  }

  if (tightnessMotion === "toward" && riskMotion === "toward") {
    return "toward-threshold";
  }

  if (
    (tightnessMotion === "away" || tightnessMotion === "flat") &&
    (riskMotion === "away" || riskMotion === "flat")
  ) {
    return "away-from-threshold";
  }

  return "mixed";
};

const SCENARIO_SHOCKS = [-1, 0, 1] as const;
const SCENARIO_WEIGHTS = [0.2, 0.6, 0.2] as const;

export const classifyCrossingRisk = ({
  crossingProbability,
  distance,
  momentum,
}: {
  crossingProbability: number;
  distance: number;
  momentum: BoundaryMomentum;
}): CrossingRiskLabel => {
  if (
    crossingProbability >= 0.45 ||
    (distance <= 3 && momentum !== "away-from-threshold")
  ) {
    return "high";
  }
  if (
    crossingProbability >= 0.2 ||
    (distance <= 8 && momentum !== "away-from-threshold")
  ) {
    return "medium";
  }
  return "low";
};

export const buildForecastModel = ({
  assessment,
  reportDynamics,
  macroSeries,
}: {
  assessment: RegimeAssessment;
  reportDynamics: ReportDynamics;
  macroSeries: MacroSeriesReading[];
}): ForecastModel => {
  const tightnessDelta = findSignalDelta(reportDynamics, "tightness");
  const riskDelta = findSignalDelta(reportDynamics, "riskAppetite");
  const curveDelta = findSignalDelta(reportDynamics, "curveSlope");
  const macroDownsideBias = computeMacroDownsideBias(macroSeries);

  const projectedTightnessDrift = tightnessDelta + macroDownsideBias * 7;
  const projectedRiskDrift = riskDelta - macroDownsideBias * 8;

  const tightnessGap =
    assessment.scores.tightness - assessment.thresholds.tightnessRegime;
  const riskGap =
    assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime;
  const nearestDistance = Math.round(
    Math.min(Math.abs(tightnessGap), Math.abs(riskGap)),
  );

  const volatilityScale = clamp(
    1 +
      reportDynamics.totalSignalChanges * 0.25 +
      Math.abs(macroDownsideBias) * 1.5,
    1,
    3,
  );
  const tightnessUncertainty =
    clamp(3 + Math.abs(projectedTightnessDrift) * 0.7, 3, 14) * volatilityScale;
  const riskUncertainty =
    clamp(3 + Math.abs(projectedRiskDrift) * 0.7, 3, 14) * volatilityScale;

  const regimeWeights: Record<ForecastRegimeLabel, number> = {
    Expansion: 0,
    Mixed: 0,
    Scarcity: 0,
    Defensive: 0,
  };

  let crossingProbability = 0;

  SCENARIO_SHOCKS.forEach((tightnessShock, tightnessIndex) => {
    SCENARIO_SHOCKS.forEach((riskShock, riskIndex) => {
      const scenarioWeight =
        SCENARIO_WEIGHTS[tightnessIndex] * SCENARIO_WEIGHTS[riskIndex];
      const scenarioTightness = clamp(
        assessment.scores.tightness +
          projectedTightnessDrift +
          tightnessShock * tightnessUncertainty,
        0,
        100,
      );
      const scenarioRisk = clamp(
        assessment.scores.riskAppetite +
          projectedRiskDrift +
          riskShock * riskUncertainty,
        0,
        100,
      );

      const scenarioRegime = classifyRegime(
        scenarioTightness,
        scenarioRisk,
        assessment.thresholds,
      );
      const forecastLabel = toForecastLabel(scenarioRegime);
      regimeWeights[forecastLabel] += scenarioWeight;

      const tightnessCrossed =
        assessment.scores.tightness > assessment.thresholds.tightnessRegime !==
        scenarioTightness > assessment.thresholds.tightnessRegime;
      const riskCrossed =
        assessment.scores.riskAppetite >
          assessment.thresholds.riskAppetiteRegime !==
        scenarioRisk > assessment.thresholds.riskAppetiteRegime;

      if (tightnessCrossed || riskCrossed) {
        crossingProbability += scenarioWeight;
      }
    });
  });

  const momentum = classifyBoundaryMomentum({
    tightnessGap,
    riskGap,
    tightnessDrift: projectedTightnessDrift,
    riskDrift: projectedRiskDrift,
  });

  const crossingRisk = classifyCrossingRisk({
    crossingProbability,
    distance: nearestDistance,
    momentum,
  });

  return {
    next4WeekProbabilities: normalizeProbabilities(regimeWeights),
    next90DayProbabilities: normalizeProbabilities(regimeWeights),
    boundaryPressure: {
      distance: nearestDistance,
      momentum,
      crossingRisk,
    },
    signalTrajectory: {
      riskAppetite: toTrajectory({ key: "riskAppetite", delta: riskDelta }),
      tightness: toTrajectory({ key: "tightness", delta: tightnessDelta }),
      yieldCurveProxy: toTrajectory({ key: "curveSlope", delta: curveDelta }),
    },
  };
};

export const buildFallbackForecastModel = (): ForecastModel => ({
  next4WeekProbabilities: {
    Expansion: 25,
    Mixed: 25,
    Scarcity: 25,
    Defensive: 25,
  },
  next90DayProbabilities: {
    Expansion: 25,
    Mixed: 25,
    Scarcity: 25,
    Defensive: 25,
  },
  boundaryPressure: {
    distance: 0,
    momentum: "stable",
    crossingRisk: "medium",
  },
  signalTrajectory: {
    riskAppetite: "stable",
    tightness: "stable",
    yieldCurveProxy: "stable",
  },
});
