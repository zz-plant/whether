/**
 * Posture-transition forecasting model (regime boundary movement),
 * not a macro growth forecasting model.
 */
import {
  classifyRegime,
  type RegimeAssessment,
  type RegimeKey,
} from "../regimeEngine";
import { getMonthlyRegimeHistory } from "../summary/monthlyRegimeHistory";
import { getTimeMachineRegimeSeries } from "../timeMachine/timeMachineCache";
import type { MacroSeriesId, MacroSeriesReading } from "../types";
import type { ReportDynamics } from "./reportData";
import { findSignalDelta } from "./evidenceReaderModel";
import { resolveDistanceToFlip } from "./confidence";

export type ForecastRegimeLabel =
  | "Expansion"
  | "Mixed"
  | "Scarcity"
  | "Defensive";
type SignalDirection = "up" | "down" | "flat";
type SignalTrajectoryLabel = "improving" | "deteriorating" | "stable" | "unmeasured";
type CrossingRiskLabel = "low" | "medium" | "high";
type BoundaryMomentum =
  | "toward-threshold"
  | "away-from-threshold"
  | "mixed"
  | "stable";

export type TransitionVelocityEstimate =
  | {
      status: "ok";
      from: ForecastRegimeLabel;
      to: ForecastRegimeLabel;
      sampleSize: number;
      lowerBoundMonths: number;
      upperBoundMonths: number;
      typicalRangeLabel: string;
      displayLabel: string;
    }
  | {
      status: "insufficient_history";
      from: ForecastRegimeLabel;
      to: ForecastRegimeLabel;
      sampleSize: number;
      displayLabel: string;
    };

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
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_SAMPLES_FOR_RANGE = 2;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const FORECAST_HORIZONS = {
  nearTerm: { driftScale: 1, uncertaintyScale: 1 },
  mediumTerm: { driftScale: 2.2, uncertaintyScale: 1.6 },
} as const;

type TransitionDurationSample = {
  from: ForecastRegimeLabel;
  to: ForecastRegimeLabel;
  durationDays: number;
};

const regimeKeyToForecastLabel: Record<RegimeKey, ForecastRegimeLabel> = {
  EXPANSION: "Expansion",
  VOLATILE: "Mixed",
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
};

const parseDate = (value: string) => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const toMonthlyRegimePoints = () => {
  const archivePoints = getMonthlyRegimeHistory()
    .map((entry) => ({
      timestamp: parseDate(entry.record_date),
      regime: regimeKeyToForecastLabel[entry.regime],
    }))
    .filter((point): point is { timestamp: number; regime: ForecastRegimeLabel } => point.timestamp !== null);

  const timeMachinePoints = getTimeMachineRegimeSeries(240)
    .map((entry) => ({
      timestamp: parseDate(entry.recordDate),
      regime: regimeKeyToForecastLabel[entry.regime],
    }))
    .filter((point): point is { timestamp: number; regime: ForecastRegimeLabel } => point.timestamp !== null);

  const byMonth = new Map<string, { timestamp: number; regime: ForecastRegimeLabel }>();
  [...archivePoints, ...timeMachinePoints].forEach((point) => {
    const monthKey = new Date(point.timestamp).toISOString().slice(0, 7);
    const existing = byMonth.get(monthKey);
    if (!existing || point.timestamp > existing.timestamp) {
      byMonth.set(monthKey, point);
    }
  });

  return Array.from(byMonth.values()).sort((a, b) => a.timestamp - b.timestamp);
};

const buildTransitionDurationSamples = (): TransitionDurationSample[] => {
  const points = toMonthlyRegimePoints();
  if (points.length < 2) {
    return [];
  }

  const samples: TransitionDurationSample[] = [];
  let runRegime = points[0]?.regime;
  let runStart = points[0]?.timestamp;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (!point || !runRegime || !runStart) {
      continue;
    }
    if (point.regime === runRegime) {
      continue;
    }

    const durationDays = Math.max(1, Math.round((point.timestamp - runStart) / MS_PER_DAY));
    samples.push({
      from: runRegime,
      to: point.regime,
      durationDays,
    });

    runRegime = point.regime;
    runStart = point.timestamp;
  }

  return samples;
};

const quantile = (sortedValues: number[], q: number) => {
  if (sortedValues.length === 0) {
    return 0;
  }
  const position = (sortedValues.length - 1) * q;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex] ?? 0;
  }
  const lower = sortedValues[lowerIndex] ?? 0;
  const upper = sortedValues[upperIndex] ?? lower;
  const weight = position - lowerIndex;
  return lower + (upper - lower) * weight;
};

const toMonths = (days: number) => Math.max(1, Math.round(days / 30.44));

export const buildTransitionVelocityEstimateFromDurations = ({
  from,
  to,
  durationsDays,
}: {
  from: ForecastRegimeLabel;
  to: ForecastRegimeLabel;
  durationsDays: number[];
}): TransitionVelocityEstimate => {
  if (durationsDays.length < MIN_SAMPLES_FOR_RANGE) {
    return {
      status: "insufficient_history",
      from,
      to,
      sampleSize: durationsDays.length,
      displayLabel: `${from}→${to}: insufficient history`,
    };
  }

  const sorted = [...durationsDays].sort((a, b) => a - b);
  const lowerBoundMonths = toMonths(quantile(sorted, 0.25));
  const upperBoundMonths = Math.max(lowerBoundMonths, toMonths(quantile(sorted, 0.75)));
  const typicalRangeLabel = `${lowerBoundMonths}–${upperBoundMonths} months`;

  return {
    status: "ok",
    from,
    to,
    sampleSize: durationsDays.length,
    lowerBoundMonths,
    upperBoundMonths,
    typicalRangeLabel,
    displayLabel: `${from}→${to} typically ${typicalRangeLabel}`,
  };
};

const transitionVelocityEstimateCache = new Map<string, TransitionVelocityEstimate>();

export const getTransitionVelocityEstimate = ({
  from,
  to,
}: {
  from: ForecastRegimeLabel;
  to: ForecastRegimeLabel;
}): TransitionVelocityEstimate => {
  const key = `${from}->${to}`;
  const cached = transitionVelocityEstimateCache.get(key);
  if (cached) {
    return cached;
  }

  const durationsDays = buildTransitionDurationSamples()
    .filter((sample) => sample.from === from && sample.to === to)
    .map((sample) => sample.durationDays);

  const estimate = buildTransitionVelocityEstimateFromDurations({
    from,
    to,
    durationsDays,
  });
  transitionVelocityEstimateCache.set(key, estimate);
  return estimate;
};

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
  delta: number | null;
}): SignalTrajectoryLabel => {
  /* Null is "the earlier reading did not record this signal", not a zero move:
     the label says unmeasured rather than claiming stability. */
  if (delta === null) {
    return "unmeasured";
  }
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

/* The shared lookup, not a local copy: it also reads `anomalySignals` and
   answers null for a signal the earlier reading did not record
   (`ReportDynamics.notCompared` names the two rates), so a rate without an
   earlier print is "not measured" here instead of a fabricated zero move. */

const deriveTightnessTrajectoryDelta = ({
  tightnessDelta,
  baseRateDelta,
  curveDelta,
}: {
  tightnessDelta: number;
  /* Null when the earlier reading did not record the rate (`notCompared`): the
     proxy needs both moves, so a missing one skips the proxy rather than
     pretending the rate did not move. */
  baseRateDelta: number | null;
  curveDelta: number | null;
}) => {
  if (Math.abs(tightnessDelta) > DIRECTION_EPSILON) {
    return tightnessDelta;
  }

  /* Rates-only proxy, in curve-equivalent points: tightness moves ~3.6 curve
     points per rate point (180 per rate point against 50 per inversion point),
     rounded to 4, and a steepening curve loosens. */
  if (baseRateDelta === null || curveDelta === null) {
    return 0;
  }
  const proxyDelta = baseRateDelta * 4 - curveDelta;
  return Math.abs(proxyDelta) > DIRECTION_EPSILON ? proxyDelta : 0;
};

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
    const latest = series.history?.at(-1)?.value;
    const prior = series.history?.at(-2)?.value;
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

export const toForecastLabel = (regime: RegimeKey): ForecastRegimeLabel => {
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

const buildScenarioWeights = ({
  assessment,
  projectedTightnessDrift,
  projectedRiskDrift,
  tightnessUncertainty,
  riskUncertainty,
}: {
  assessment: RegimeAssessment;
  projectedTightnessDrift: number;
  projectedRiskDrift: number;
  tightnessUncertainty: number;
  riskUncertainty: number;
}) => {
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

  return { regimeWeights, crossingProbability };
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
  /* `?? 0` is safe on the two scores: `notCompared` only ever names the rates,
     and a score delta is null here only when nothing was compared at all, where
     the forecast's neutral "no measured motion" drift of 0 is the intent. The
     two rates keep their null: an unrecorded earlier print is not a zero move. */
  const tightnessDelta = findSignalDelta(reportDynamics, "tightness") ?? 0;
  const riskDelta = findSignalDelta(reportDynamics, "riskAppetite") ?? 0;
  const curveDelta = findSignalDelta(reportDynamics, "curveSlope");
  const baseRateDelta = findSignalDelta(reportDynamics, "baseRate");
  const tightnessTrajectoryDelta = deriveTightnessTrajectoryDelta({
    tightnessDelta,
    baseRateDelta,
    curveDelta,
  });
  const macroDownsideBias = computeMacroDownsideBias(macroSeries);

  /* The macro bias is a signed average of the series' latest moves, so it is a
     per-period drift estimate, not a weekly rate; the 7 and the 8 spread it
     over the coming week, and risk appetite takes the slightly larger share
     (8) because the series feeding it (VIX, credit) move harder on a downside
     shock than the funding-pressure add-ons do. Tuned pair, changed together. */
  const projectedTightnessDrift = tightnessDelta + macroDownsideBias * 7;
  const projectedRiskDrift = riskDelta - macroDownsideBias * 8;

  /* Signed, per-axis gaps for the momentum read: each axis's motion toward or
     away from its own line. These are deliberately not compared with each
     other — the nearest-boundary judgment above is where the 4.5x scale
     conversion belongs. */
  const tightnessGap =
    assessment.scores.tightness - assessment.thresholds.tightnessRegime;
  const riskGap =
    assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime;

  /* The forecast's boundary pressure measures the same distance the published
     margin does (`resolveDistanceToFlip`): tightness-equivalent, with a pinned
     score's hidden points counted. A raw `min()` of the two point gaps hands
     "nearest" to the risk axis almost always, because its scale is 4.5x more
     compressed (`lib/report/confidence.ts`). */
  const nearestDistance = Math.round(
    resolveDistanceToFlip({
      scores: assessment.scores,
      thresholds: assessment.thresholds,
    }),
  );

  const baseVolatilityScale = clamp(
    1 +
      reportDynamics.totalSignalChanges * 0.25 +
      Math.abs(macroDownsideBias) * 1.5,
    1,
    3,
  );
  const nearTermScenario = buildScenarioWeights({
    assessment,
    projectedTightnessDrift:
      projectedTightnessDrift * FORECAST_HORIZONS.nearTerm.driftScale,
    projectedRiskDrift:
      projectedRiskDrift * FORECAST_HORIZONS.nearTerm.driftScale,
    tightnessUncertainty:
      clamp(3 + Math.abs(projectedTightnessDrift) * 0.7, 3, 14) *
      baseVolatilityScale *
      FORECAST_HORIZONS.nearTerm.uncertaintyScale,
    riskUncertainty:
      clamp(3 + Math.abs(projectedRiskDrift) * 0.7, 3, 14) *
      baseVolatilityScale *
      FORECAST_HORIZONS.nearTerm.uncertaintyScale,
  });
  const mediumTermScenario = buildScenarioWeights({
    assessment,
    projectedTightnessDrift:
      projectedTightnessDrift * FORECAST_HORIZONS.mediumTerm.driftScale,
    projectedRiskDrift:
      projectedRiskDrift * FORECAST_HORIZONS.mediumTerm.driftScale,
    tightnessUncertainty:
      clamp(3 + Math.abs(projectedTightnessDrift) * 0.7, 3, 14) *
      baseVolatilityScale *
      FORECAST_HORIZONS.mediumTerm.uncertaintyScale,
    riskUncertainty:
      clamp(3 + Math.abs(projectedRiskDrift) * 0.7, 3, 14) *
      baseVolatilityScale *
      FORECAST_HORIZONS.mediumTerm.uncertaintyScale,
  });

  const momentum = classifyBoundaryMomentum({
    tightnessGap,
    riskGap,
    tightnessDrift: projectedTightnessDrift,
    riskDrift: projectedRiskDrift,
  });

  const crossingRisk = classifyCrossingRisk({
    crossingProbability: nearTermScenario.crossingProbability,
    distance: nearestDistance,
    momentum,
  });

  return {
    next4WeekProbabilities: normalizeProbabilities(nearTermScenario.regimeWeights),
    next90DayProbabilities: normalizeProbabilities(mediumTermScenario.regimeWeights),
    boundaryPressure: {
      distance: nearestDistance,
      momentum,
      crossingRisk,
    },
    signalTrajectory: {
      riskAppetite: toTrajectory({ key: "riskAppetite", delta: riskDelta }),
      tightness: toTrajectory({ key: "tightness", delta: tightnessTrajectoryDelta }),
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
