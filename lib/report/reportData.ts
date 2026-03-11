/**
 * Shared loader for Whether Report pages.
 * Centralizes Treasury data fetching and formatting for multi-page layouts.
 */
import { fetchTreasuryData } from "../treasury/treasuryClient";
import { snapshotData } from "../snapshot";
import { buildSensorReadings } from "../sensors";
import { DEFAULT_THRESHOLDS, buildSignalInfluence, deriveRegimeTrend, evaluateRegime } from "../regimeEngine";
import { getPlaybookGuidance } from "../playbook";
import {
  getLatestTimeMachineSnapshot,
  getTimeMachineCoverage,
  getTimeMachineMonthsByYear,
  getPreviousTimeMachineSnapshot,
  getTimeMachineRegimeSeries,
  getTimeMachineYieldCurveSeries,
  findTimeMachineSnapshot,
  DEFAULT_REGIME_SERIES_MONTHS,
  getTimeMachineSnapshots,
} from "../timeMachine/timeMachineCache";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../timeMachine/timeMachineSelection";
import { loadMacroSeries } from "../macroSnapshot";
import { parseThresholdsFromSearchParams } from "../thresholds";
import { formatAgeHours, formatDateUTC, formatTimestampUTC } from "../formatters";
import { buildRegimeAlert, formatConfidencePlainLabel } from "./reportFormatting";
import { normalizeSignalContributions } from "./signalFormatting";
import { buildFallbackForecastModel, buildForecastModel } from "./forecastModel";
import { formatRegimeLabel } from "../regimeFormat";
import { logReportDependencyFailure } from "./reportError";
import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { buildActionStripItems } from "./operatingCalls";
import { deltaLabelBySignal, resolveSignalDirection, signalOrder } from "./briefFormatting";
import { cache } from "react";
import type { TreasuryData } from "../types";
import { loadCanonicalReportInputs } from "../ingestion/materialized";

export type ReportSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

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


export type AnalogScoreDimensions = {
  postureMatch: number;
  trendDirection: number;
  confidence: number;
  distanceToFlip: number;
};

export type HistoricalAnalog = {
  recordDate: string;
  score: number;
  dimensions: AnalogScoreDimensions;
  implication: string;
};

export type ReportDynamics = {
  changedSignals: Array<{
    key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
    label: string;
    delta: number;
  }>;
  anomalySignals: Array<{
    key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
    label: string;
    delta: number;
    reason: string;
  }>;
  totalSignalChanges: number;
  regimeChanged: boolean;
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable";
  signalContributions?: ReturnType<typeof normalizeSignalContributions>;
};

export type ReportEvidenceItem = {
  key: ReportDynamics["changedSignals"][number]["key"];
  title: string;
  lastUpdated: string | null;
  supportingBullets: string[];
  confidenceLabel: string;
  directionLabel: "Tightening" | "Easing" | "Unchanged";
  immediateImplication: string;
};

export type WeeklyConfidencePoint = {
  recordDate: string;
  confidencePercent: number | null;
  isMissing: boolean;
};

export type ConfidenceTrendFraming = "strengthening" | "weakening" | "unstable";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const resolveConfidencePercent = (assessment: ReturnType<typeof evaluateRegime>) => {
  const gap = resolveDistanceToFlip(assessment);
  return Math.max(35, Math.min(92, Math.round(55 + gap * 3)));
};

export const classifyConfidenceTrend = (points: WeeklyConfidencePoint[]): ConfidenceTrendFraming => {
  const values = points
    .filter((point): point is WeeklyConfidencePoint & { confidencePercent: number } => typeof point.confidencePercent === "number")
    .map((point) => point.confidencePercent);

  if (values.length < 3) {
    return "unstable";
  }

  const slope = (values[values.length - 1] - values[0]) / (values.length - 1);
  const averageStepChange =
    values.slice(1).reduce((sum, value, index) => sum + Math.abs(value - values[index]), 0)
    / (values.length - 1);

  if (averageStepChange >= 7 || Math.abs(slope) < 1.5) {
    return "unstable";
  }

  return slope > 0 ? "strengthening" : "weakening";
};

export const buildWeeklyConfidenceSeries = ({
  snapshots,
  currentSnapshot,
  thresholds,
  asOf,
  window = 8,
}: {
  snapshots: TreasuryData[];
  currentSnapshot?: TreasuryData;
  thresholds: ReturnType<typeof parseThresholdsFromSearchParams>;
  asOf: string;
  window?: number;
}): WeeklyConfidencePoint[] => {
  const asOfTime = new Date(asOf).getTime();
  const snapshotsBeforeAsOf = [...snapshots, ...(currentSnapshot ? [currentSnapshot] : [])]
    .filter((snapshot) => {
      const timestamp = new Date(snapshot.record_date).getTime();
      return Number.isFinite(timestamp) && timestamp <= asOfTime;
    })
    .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());

  const deduped = Array.from(
    new Map(snapshotsBeforeAsOf.map((snapshot) => [snapshot.record_date, snapshot])).values()
  );

  const actualPoints = deduped.map((snapshot) => ({
    recordDate: snapshot.record_date,
    confidencePercent: resolveConfidencePercent(evaluateRegime(snapshot, thresholds)),
    isMissing: false,
  }));

  if (actualPoints.length === 0) {
    return [];
  }

  const withMissing: WeeklyConfidencePoint[] = [];
  for (let index = 0; index < actualPoints.length; index += 1) {
    const current = actualPoints[index];
    withMissing.push(current);

    const next = actualPoints[index + 1];
    if (!next) {
      continue;
    }

    const currentTime = new Date(current.recordDate).getTime();
    const nextTime = new Date(next.recordDate).getTime();
    const missingWeeks = Math.max(0, Math.round((nextTime - currentTime) / WEEK_MS) - 1);

    for (let step = 1; step <= missingWeeks; step += 1) {
      const missingDate = new Date(currentTime + WEEK_MS * step).toISOString().slice(0, 10);
      withMissing.push({
        recordDate: missingDate,
        confidencePercent: null,
        isMissing: true,
      });
    }
  }

  return withMissing.slice(-window);
};

const buildActionNowShort = ({
  directionLabel,
  regimeChanged,
}: Pick<ReportDynamics, "directionLabel" | "regimeChanged">): string => {
  if (regimeChanged || directionLabel === "deteriorating") {
    return "Tighten approvals now; keep new spend reversible.";
  }
  if (directionLabel === "improving") {
    return "Release selective bets now, but keep payback discipline.";
  }
  if (directionLabel === "mixed") {
    return "Hold approval pace and gate decisions with explicit stop triggers.";
  }
  return "Hold last week's operating cadence; avoid irreversible commitments.";
};

const buildGuidanceBundleFromAssessment = (assessment: ReturnType<typeof evaluateRegime>) => {
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime, {
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  });
  const actionStripItems = buildActionStripItems(
    buildCanonicalBoundedDecisionRules({
      regime: assessment.regime,
      thresholds: assessment.thresholds,
      scores: assessment.scores,
    })
  );

  return {
    playbook,
    startItems,
    stopItems,
    actionStripItems,
  };
};

export const buildFlipThreshold = (assessment: ReturnType<typeof evaluateRegime>): string => {
  const tightnessThreshold = assessment.thresholds.tightnessRegime.toFixed(1);
  const riskThreshold = assessment.thresholds.riskAppetiteRegime.toFixed(1);

  if (assessment.regime === "SCARCITY") {
    return `Flip watch: Tightness <= ${tightnessThreshold} or Risk appetite > ${riskThreshold}.`;
  }

  if (assessment.regime === "DEFENSIVE") {
    return `Flip watch: Tightness <= ${tightnessThreshold} or Risk appetite <= ${riskThreshold}.`;
  }

  if (assessment.regime === "VOLATILE") {
    return `Flip watch: Tightness > ${tightnessThreshold} or Risk appetite > ${riskThreshold}.`;
  }

  return `Flip watch: Tightness > ${tightnessThreshold} or Risk appetite <= ${riskThreshold}.`;
};


const ANALOG_DIMENSION_WEIGHTS: AnalogScoreDimensions = {
  postureMatch: 0.45,
  trendDirection: 0.2,
  confidence: 0.15,
  distanceToFlip: 0.2,
};

const resolveDistanceToFlip = (assessment: ReturnType<typeof evaluateRegime>) => {
  const tightnessGap = Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime);
  const riskGap = Math.abs(assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime);
  return Math.min(tightnessGap, riskGap);
};

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
  thresholds: ReturnType<typeof parseThresholdsFromSearchParams>;
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

const signalAnomalyThresholds: Record<ReportDynamics["changedSignals"][number]["key"], number> = {
  tightness: 90,
  riskAppetite: 50,
  baseRate: 1.5,
  curveSlope: 1,
};

export const signalDeltaImprovesWhen: Record<ReportDynamics["changedSignals"][number]["key"], "positive" | "negative"> = {
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

const resolveSignalInfluence = (assessment: ReturnType<typeof evaluateRegime>) =>
  normalizeSignalContributions(
    assessment.signalInfluence ??
      buildSignalInfluence({
        tightness: assessment.scores.tightness,
        riskAppetite: assessment.scores.riskAppetite,
        baseRate: assessment.scores.baseRate,
        curveSlope: assessment.scores.curveSlope,
        thresholds: (assessment as { thresholds?: typeof DEFAULT_THRESHOLDS }).thresholds ?? DEFAULT_THRESHOLDS,
      })
  );

const signalLabels: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Cash tightness",
  riskAppetite: "Risk appetite",
  baseRate: "Base rate",
  curveSlope: "Curve slope",
};

const evidenceTitleBySignal: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Capital conditions",
  riskAppetite: "Risk appetite",
  baseRate: "Policy rate pressure",
  curveSlope: "Yield-curve signal",
};

const toConfidenceLabel = (delta: number): "LOW" | "MED" | "HIGH" => {
  const magnitude = Math.abs(delta);
  if (magnitude >= 3) return "HIGH";
  if (magnitude >= 1) return "MED";
  return "LOW";
};

const signalImmediateImplication = (key: ReportDynamics["changedSignals"][number]["key"], delta: number) => {
  if (delta === 0) {
    return "No material operating change this week.";
  }

  if (key === "tightness") {
    return delta > 0
      ? "Tighten approvals and protect runway for fixed-cost commitments."
      : "Release selective approvals while keeping commitments reversible.";
  }

  if (key === "riskAppetite") {
    return delta > 0
      ? "Increase reversible experiments where payback stays visible."
      : "Bias toward proof-first launches and smaller bet sizes.";
  }

  if (key === "baseRate") {
    return delta > 0
      ? "Shorten payback windows before approving net-new spend."
      : "Maintain discipline while testing selective long-payback upside.";
  }

  return delta > 0
    ? "Longer-payback work becomes incrementally safer if guardrails hold."
    : "Keep commitments staged while macro risk remains elevated.";
};

export const buildReportEvidenceItems = ({
  reportDynamics,
  assessment,
  lastUpdated,
}: {
  reportDynamics: ReportDynamics;
  assessment: ReturnType<typeof evaluateRegime>;
  lastUpdated: string | null;
}): ReportEvidenceItem[] =>
  signalOrder.map((key) => {
    const movedSignal = reportDynamics.changedSignals.find((item) => item.key === key);
    const delta = movedSignal?.delta ?? 0;
    const direction = resolveSignalDirection(delta);
    const directionLabel =
      direction === "tightening" ? "Tightening" : direction === "easing" ? "Easing" : "Unchanged";

    const thresholdDistance =
      key === "tightness"
        ? Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime)
        : key === "riskAppetite"
          ? Math.abs(assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime)
          : null;

    const supportingBullets = [
      `Weekly move: ${delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} vs. prior snapshot.`,
      `Signal direction: ${directionLabel.toLowerCase()} (${deltaLabelBySignal[key]}).`,
      thresholdDistance === null
        ? `Current level: ${signalLabels[key]} contributes to this week's call.`
        : `Distance to regime threshold: ${thresholdDistance.toFixed(1)} points.`,
    ];

    return {
      key,
      title: evidenceTitleBySignal[key],
      lastUpdated,
      supportingBullets,
      confidenceLabel: formatConfidencePlainLabel(toConfidenceLabel(delta)),
      directionLabel,
      immediateImplication: signalImmediateImplication(key, delta),
    };
  });

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
      anomalySignals: [],
      totalSignalChanges: 0,
      regimeChanged: false,
      directionLabel: "stable",
      signalContributions: resolveSignalInfluence(current),
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

  const { anomalies, changes } = comparisons.reduce(
    (accumulator, item) => {
      const maxExpectedDelta = signalAnomalyThresholds[item.key];
      if (Math.abs(item.delta) > maxExpectedDelta) {
        accumulator.anomalies.push({
          ...item,
          reason: `Exceeded weekly sanity threshold of ±${maxExpectedDelta}.`,
        });
        return accumulator;
      }

      accumulator.changes.push(item);
      return accumulator;
    },
    {
      anomalies: [] as Array<{
        key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
        label: string;
        delta: number;
        reason: string;
      }>,
      changes: [] as typeof comparisons,
    }
  );

  const sortedChanges = changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const improvingMoves = sortedChanges.filter((item) => isImprovingSignalDelta(item.key, item.delta)).length;
  const deterioratingMoves = sortedChanges.filter((item) => !isImprovingSignalDelta(item.key, item.delta)).length;
  const directionLabel: ReportDynamics["directionLabel"] =
    sortedChanges.length === 0
      ? "stable"
      : improvingMoves > 0 && deterioratingMoves > 0
        ? "mixed"
        : improvingMoves > 0
          ? "improving"
          : "deteriorating";

  return {
    changedSignals: sortedChanges,
    anomalySignals: anomalies,
    totalSignalChanges: sortedChanges.length,
    regimeChanged: current.regime !== previous.regime,
    directionLabel,
    signalContributions: resolveSignalInfluence(current),
  };
};

const REPORT_DATA_REVALIDATE_SECONDS = 900;
const REPORT_FALLBACK_REASON = "Report dependency outage: serving cached treasury snapshot.";

type ReportDependency = "treasury" | "macro" | "report";

const toError = (value: unknown): Error => (value instanceof Error ? value : new Error(String(value)));

const withDependencyContext = (dependency: ReportDependency, error: unknown): Error => {
  const resolvedError = toError(error);
  return new Error(`[dependency:${dependency}] ${resolvedError.message}`);
};

export const buildSnapshotFallbackTreasury = (snapshot: TreasuryData, now = new Date()): TreasuryData => ({
  ...snapshot,
  fallback_at: snapshot.fallback_at ?? now.toISOString(),
  fallback_reason: snapshot.fallback_reason ?? REPORT_FALLBACK_REASON,
});

const loadReportDataUncached = async (searchParams?: ReportSearchParams) => {
  const liveFetcher: typeof fetch = (input, init) =>
    fetch(input, {
      ...init,
      next: {
        ...((init as RequestInit & { next?: { revalidate?: number } })?.next ?? {}),
        revalidate: REPORT_DATA_REVALIDATE_SECONDS,
      },
    });
  const historicalSelection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const canonicalInputs = historicalSelection
    ? null
    : await loadCanonicalReportInputs({ fetcher: liveFetcher });
  const treasuryPromise = canonicalInputs
    ? Promise.resolve(canonicalInputs.treasury)
    : fetchTreasuryData({
        fetcher: liveFetcher,
        snapshotFallback: snapshotData,
        asOf: historicalSelection?.asOf,
      });
  const liveTreasuryPromise = canonicalInputs
    ? Promise.resolve(canonicalInputs.treasury)
    : historicalSelection
      ? fetchTreasuryData({ snapshotFallback: snapshotData, fetcher: liveFetcher })
      : null;
  const now = new Date();
  const latestCache = getLatestTimeMachineSnapshot();
  const defaultMonth = latestCache?.month ?? now.getUTCMonth() + 1;
  const defaultYear = latestCache?.year ?? now.getUTCFullYear();
  const cacheCoverage = getTimeMachineCoverage();
  const cacheMonthsByYear = getTimeMachineMonthsByYear();
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const thresholds = parseThresholdsFromSearchParams(searchParams);
  const regimeSeries = getTimeMachineRegimeSeries(DEFAULT_REGIME_SERIES_MONTHS, thresholds, historicalSelection?.asOf);
  const yieldCurveSeries = getTimeMachineYieldCurveSeries(240, historicalSelection?.asOf);
  const timeMachineSnapshots = getTimeMachineSnapshots();
  const [treasuryResult, liveTreasuryResult, macroResult] = await Promise.allSettled([
    treasuryPromise,
    liveTreasuryPromise ?? treasuryPromise,
    canonicalInputs ? Promise.resolve(canonicalInputs.macroSeries) : loadMacroSeries(liveFetcher),
  ]);

  if (treasuryResult.status === "rejected") {
    throw withDependencyContext("treasury", treasuryResult.reason);
  }

  if (liveTreasuryResult.status === "rejected") {
    throw withDependencyContext("treasury", liveTreasuryResult.reason);
  }

  if (macroResult.status === "rejected") {
    throw withDependencyContext("macro", macroResult.reason);
  }

  const treasury = treasuryResult.value;
  const liveTreasury = liveTreasuryResult.value;
  const macroSeries = macroResult.value;
  const recordDateLabel = formatDateUTC(treasury.record_date);
  const fetchedAtLabel = formatTimestampUTC(treasury.fetched_at);
  const treasuryAgeLabel = formatAgeHours(treasury.fetched_at, now);
  const sensors = buildSensorReadings(treasury);
  const assessmentMacroSeries = historicalSelection ? [] : macroSeries;
  const assessment = evaluateRegime(treasury, thresholds, assessmentMacroSeries);
  const liveAssessment = historicalSelection ? evaluateRegime(liveTreasury, thresholds, macroSeries) : null;
  const { playbook, startItems, stopItems, actionStripItems } = buildGuidanceBundleFromAssessment(assessment);
  const fenceItems = assessment.constraints;
  const previousSnapshot = historicalSelection
    ? null
    : getPreviousTimeMachineSnapshot(treasury.record_date);
  const recordDate = new Date(treasury.record_date);
  const comparisonDate = new Date(treasury.record_date);
  comparisonDate.setUTCFullYear(recordDate.getUTCFullYear() - 1);
  const lastYearSnapshot = findTimeMachineSnapshot(comparisonDate.toISOString());
  const previousAssessment = previousSnapshot
    ? evaluateRegime(previousSnapshot, thresholds)
    : null;
  const lastYearAssessment = lastYearSnapshot ? evaluateRegime(lastYearSnapshot, thresholds) : null;
  const confidenceLabel = historicalSelection
    ? "Simulated (low)"
    : canonicalInputs
      ? "Canonical snapshot (high confidence)"
      : treasury.isLive
      ? "Live (high confidence)"
      : "Cached (medium)";
  const treasuryProvenance = {
    sourceLabel: canonicalInputs ? "Canonical ingestion (FRED/BLS)" : "Federal Reserve Economic Data (FRED)",
    sourceUrl: treasury.source,
    recordDateLabel,
    timestampLabel: fetchedAtLabel,
    ageLabel: treasuryAgeLabel,
    statusLabel: confidenceLabel,
  };
  const macroTimestamp = macroSeries[0]?.fetched_at ?? treasury.fetched_at;
  const macroRecordDate = macroSeries[0]?.record_date ?? treasury.record_date;
  const macroAgeLabel = formatAgeHours(macroTimestamp, now);
  const macroProvenance = {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: macroSeries[0]?.sourceUrl,
    recordDateLabel: formatDateUTC(macroRecordDate),
    timestampLabel: formatTimestampUTC(macroTimestamp),
    ageLabel: macroAgeLabel,
    statusLabel: historicalSelection
      ? "Simulated (low)"
      : canonicalInputs
        ? "Canonical snapshot (high confidence)"
        : macroSeries.some((signal) => signal.isLive)
        ? "Live (high confidence)"
        : "Cached (medium)",
  };
  const internalProvenance = {
    sourceLabel: "Whether curated playbook catalog",
    recordDateLabel: "Static",
    timestampLabel: "Static catalog",
    ageLabel: "Static.",
    statusLabel: "Simulated (low)",
  };
  const statusLabel = formatRegimeLabel(assessment.regime);
  const historicalComparison =
    historicalSelection && liveAssessment
      ? {
          then: {
            regime: assessment.regime,
            recordDate: treasury.record_date,
            baseRate: assessment.scores.baseRate,
            curveSlope: assessment.scores.curveSlope,
            tightness: assessment.scores.tightness,
            riskAppetite: assessment.scores.riskAppetite,
          },
          now: {
            regime: liveAssessment.regime,
            recordDate: liveTreasury.record_date,
            baseRate: liveAssessment.scores.baseRate,
            curveSlope: liveAssessment.scores.curveSlope,
            tightness: liveAssessment.scores.tightness,
            riskAppetite: liveAssessment.scores.riskAppetite,
          },
        }
      : null;
  const regimeAlert =
    previousAssessment && previousSnapshot
      ? buildRegimeAlert(
          assessment,
          previousAssessment,
          treasury.record_date,
          previousSnapshot.record_date
        )
      : null;
  const reportDynamics = buildReportDynamics({
    current: assessment,
    previous: previousAssessment,
  });
  const regimeTrend = deriveRegimeTrend(previousAssessment, assessment);
  const forecast = buildForecastModel({
    assessment,
    reportDynamics,
    macroSeries,
  });
  const lastYearComparison =
    lastYearSnapshot && lastYearAssessment
      ? buildLastYearComparison({
          current: assessment,
          currentRecordDate: treasury.record_date,
          prior: lastYearAssessment,
          priorRecordDate: lastYearSnapshot.record_date,
        })
      : null;
  const confidenceHistory = buildWeeklyConfidenceSeries({
    snapshots: timeMachineSnapshots.map(({ year: _year, month: _month, ...snapshot }) => snapshot),
    currentSnapshot: treasury,
    thresholds,
    asOf: treasury.record_date,
    window: 8,
  });
  const confidenceTrend = classifyConfidenceTrend(confidenceHistory);

  const historicalAnalogs = buildHistoricalAnalogs({
    current: assessment,
    snapshots: timeMachineSnapshots
      .filter((snapshot) => new Date(snapshot.record_date).getTime() <= new Date(treasury.record_date).getTime())
      .map(({ year: _year, month: _month, ...snapshot }) => snapshot),
    thresholds,
    currentTrendDirection: reportDynamics.directionLabel,
  });

  const actionNowShort = buildActionNowShort(reportDynamics);
  const guardrailThreshold = stopItems[0] ?? "Do not approve irreversible commitments without trigger confirmation.";
  const flipThreshold = buildFlipThreshold(assessment);
  const reportEvidenceItems = buildReportEvidenceItems({
    reportDynamics,
    assessment,
    lastUpdated: treasury.record_date,
  });

  return {
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
    fenceItems,
    forecast,
    historicalComparison,
    historicalSelection,
    historicalAnalogs,
    internalProvenance,
    invalidHistoricalSelection,
    lastYearComparison,
    liveAssessment,
    liveTreasury,
    macroProvenance,
    macroSeries,
    playbook,
    recordDateLabel,
    reportDynamics,
    requestedSelection,
    regimeSeries,
    regimeAlert,
    yieldCurveSeries,
    regimeTrend,
    selectedMonth,
    selectedYear,
    sensors,
    startItems,
    statusLabel,
    stopItems,
    actionStripItems,
    actionNowShort,
    reportEvidenceItems,
    guardrailThreshold,
    flipThreshold,
    confidenceHistory,
    confidenceTrend,
    thresholds,
    treasury,
    treasuryProvenance,
    materializedSignals: canonicalInputs?.materializedSignals ?? null,
  };
};

export type ReportData = Awaited<ReturnType<typeof loadReportDataUncached>>;

export type ReportDataFallback = ReportData & {
  stale: true;
  lastCachedTimestamp: string;
};

export type LoadReportDataSafeResult =
  | { ok: true; data: ReportData }
  | { ok: false; error: Error; fallback: ReportDataFallback };

const loadReportDataMemoized = cache(async (cacheKey?: string) => {
  if (!cacheKey) {
    return loadReportDataUncached();
  }

  return loadReportDataUncached(JSON.parse(cacheKey) as ReportSearchParams);
});

export const loadReportData = (searchParams?: ReportSearchParams) => {
  if (!searchParams) {
    return loadReportDataMemoized();
  }

  const cacheKey = JSON.stringify(searchParams);
  return loadReportDataMemoized(cacheKey);
};


const buildFallbackReportData = (searchParams?: ReportSearchParams): ReportDataFallback => {
  const now = new Date();
  const fallbackTreasury = buildSnapshotFallbackTreasury(snapshotData, now);
  const historicalSelection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const latestCache = getLatestTimeMachineSnapshot();
  const defaultMonth = latestCache?.month ?? now.getUTCMonth() + 1;
  const defaultYear = latestCache?.year ?? now.getUTCFullYear();
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const thresholds = parseThresholdsFromSearchParams(searchParams);
  const cacheCoverage = getTimeMachineCoverage();
  const cacheMonthsByYear = getTimeMachineMonthsByYear();
  const regimeSeries = getTimeMachineRegimeSeries(DEFAULT_REGIME_SERIES_MONTHS, thresholds, historicalSelection?.asOf);
  const yieldCurveSeries = getTimeMachineYieldCurveSeries(240, historicalSelection?.asOf);
  const assessment = evaluateRegime(fallbackTreasury, thresholds, []);
  const liveAssessment = evaluateRegime(fallbackTreasury, thresholds, []);
  const sensors = buildSensorReadings(fallbackTreasury);
  const recordDateLabel = formatDateUTC(fallbackTreasury.record_date);
  const fetchedAtLabel = formatTimestampUTC(fallbackTreasury.fetched_at);
  const ageLabel = formatAgeHours(fallbackTreasury.fetched_at, now);
  const { playbook, startItems, stopItems, actionStripItems } = buildGuidanceBundleFromAssessment(assessment);

  const fallbackReportDynamics: ReportDynamics = {
    changedSignals: [],
    anomalySignals: [],
    totalSignalChanges: 0,
    regimeChanged: false,
    directionLabel: "stable",
  };
  const actionNowShort = buildActionNowShort(fallbackReportDynamics);
  const guardrailThreshold = stopItems[0] ?? "Do not approve irreversible commitments without trigger confirmation.";
  const flipThreshold = buildFlipThreshold(assessment);
  const reportEvidenceItems = buildReportEvidenceItems({
    reportDynamics: fallbackReportDynamics,
    assessment,
    lastUpdated: fallbackTreasury.record_date,
  });

  return {
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
    fenceItems: assessment.constraints,
    forecast: buildFallbackForecastModel(),
    historicalComparison: null,
    historicalSelection,
    historicalAnalogs: [],
    internalProvenance: {
      sourceLabel: "Whether curated playbook catalog",
      recordDateLabel: "Static",
      timestampLabel: "Static catalog",
      ageLabel: "Static.",
      statusLabel: "Simulated (low)",
    },
    invalidHistoricalSelection,
    lastYearComparison: null,
    liveAssessment,
    liveTreasury: fallbackTreasury,
    macroProvenance: {
      sourceLabel: "FRED & US Treasury",
      sourceUrl: fallbackTreasury.source,
      recordDateLabel,
      timestampLabel: fetchedAtLabel,
      ageLabel,
      statusLabel: "Unavailable (fallback)",
    },
    macroSeries: [],
    playbook,
    recordDateLabel,
    reportDynamics: fallbackReportDynamics,
    requestedSelection,
    regimeSeries,
    regimeAlert: null,
    yieldCurveSeries,
    regimeTrend: "STABLE",
    selectedMonth,
    selectedYear,
    sensors,
    startItems,
    statusLabel: formatRegimeLabel(assessment.regime),
    stopItems,
    actionStripItems,
    actionNowShort,
    reportEvidenceItems,
    guardrailThreshold,
    flipThreshold,
    confidenceHistory: [],
    confidenceTrend: "unstable" as const,
    thresholds,
    treasury: fallbackTreasury,
    materializedSignals: null,
    treasuryProvenance: {
      sourceLabel: "Federal Reserve Economic Data (FRED)",
      sourceUrl: fallbackTreasury.source,
      recordDateLabel,
      timestampLabel: fetchedAtLabel,
      ageLabel,
      statusLabel: "Cached (fallback)",
    },
    stale: true,
    lastCachedTimestamp: fallbackTreasury.fetched_at,
  };
};

export const loadReportDataSafe = async (
  searchParams?: ReportSearchParams,
  context?: { route?: string; requestId?: string },
): Promise<LoadReportDataSafeResult> => {
  try {
    const data = await loadReportData(searchParams);
    return { ok: true, data };
  } catch (error) {
    const resolvedError = toError(error);
    const dependencyMatch = resolvedError.message.match(/\[dependency:(treasury|macro|report)\]/i);
    const dependencyLabel = dependencyMatch?.[1]?.toLowerCase();
    const dependency =
      dependencyLabel === "treasury" || dependencyLabel === "macro" || dependencyLabel === "report"
        ? dependencyLabel
        : /macro/i.test(resolvedError.message)
          ? "macro"
          : /treasury|fred|fiscal/i.test(resolvedError.message)
            ? "treasury"
            : "report";
    logReportDependencyFailure({
      route: context?.route ?? "unknown",
      requestId: context?.requestId ?? "n/a",
      dependency,
      status: "degraded",
      message: resolvedError.message,
      fallbackUsed: true,
      timestamp: new Date().toISOString(),
    });

    return {
      ok: false,
      error: resolvedError,
      fallback: buildFallbackReportData(searchParams),
    };
  }
};
