/**
 * Shared loader for Whether Report pages.
 * Centralizes Treasury data fetching and formatting for multi-page layouts.
 */
import { fetchTreasuryData } from "../treasury/treasuryClient";
import { snapshotData } from "../snapshot";
import { buildSensorReadings } from "../sensors";
import { deriveRegimeTrend, evaluateRegime } from "../regimeEngine";
import { getPlaybookGuidance } from "../playbook";
import {
  getLatestTimeMachineSnapshot,
  getTimeMachineCoverage,
  getTimeMachineMonthsByYear,
  getPreviousTimeMachineSnapshot,
  getTimeMachineRegimeSeries,
  findTimeMachineSnapshot,
  DEFAULT_REGIME_SERIES_MONTHS,
} from "../timeMachine/timeMachineCache";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../timeMachine/timeMachineSelection";
import { loadMacroSeries } from "../macroSnapshot";
import { parseThresholdsFromSearchParams } from "../thresholds";
import { formatAgeHours, formatDateUTC, formatTimestampUTC } from "../formatters";
import { buildRegimeAlert } from "./reportFormatting";

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

export type ReportDynamics = {
  changedSignals: Array<{
    key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
    label: string;
    delta: number;
  }>;
  totalSignalChanges: number;
  regimeChanged: boolean;
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable";
};

const regimeStatusLabelMap = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Neutral",
  EXPANSION: "Expansion",
} as const;

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

const signalLabels: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Cash availability",
  riskAppetite: "Risk appetite",
  baseRate: "Base rate",
  curveSlope: "Curve slope",
};

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
      totalSignalChanges: 0,
      regimeChanged: false,
      directionLabel: "stable",
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

  const improvingMoves = comparisons.filter(
    (item) =>
      ((item.key === "riskAppetite" || item.key === "curveSlope") && item.delta > 0) ||
      ((item.key === "tightness" || item.key === "baseRate") && item.delta < 0),
  ).length;
  const deterioratingMoves = comparisons.filter(
    (item) =>
      ((item.key === "riskAppetite" || item.key === "curveSlope") && item.delta < 0) ||
      ((item.key === "tightness" || item.key === "baseRate") && item.delta > 0),
  ).length;
  const directionLabel: ReportDynamics["directionLabel"] =
    comparisons.length === 0
      ? "stable"
      : improvingMoves > 0 && deterioratingMoves > 0
        ? "mixed"
        : improvingMoves > 0
          ? "improving"
          : "deteriorating";

  return {
    changedSignals: comparisons,
    totalSignalChanges: comparisons.length,
    regimeChanged: current.regime !== previous.regime,
    directionLabel,
  };
};

const REPORT_DATA_REVALIDATE_SECONDS = 900;

export const loadReportData = async (searchParams?: ReportSearchParams) => {
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
  const treasuryPromise = fetchTreasuryData({
    fetcher: liveFetcher,
    snapshotFallback: snapshotData,
    asOf: historicalSelection?.asOf,
  });
  const liveTreasuryPromise = historicalSelection
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
  const regimeSeries = getTimeMachineRegimeSeries(DEFAULT_REGIME_SERIES_MONTHS, thresholds);
  const [treasury, liveTreasury, macroSeries] = await Promise.all([
    treasuryPromise,
    liveTreasuryPromise ?? treasuryPromise,
    loadMacroSeries(liveFetcher),
  ]);
  const recordDateLabel = formatDateUTC(treasury.record_date);
  const fetchedAtLabel = formatTimestampUTC(treasury.fetched_at);
  const treasuryAgeLabel = formatAgeHours(treasury.fetched_at, now);
  const sensors = buildSensorReadings(treasury);
  const assessmentMacroSeries = historicalSelection ? [] : macroSeries;
  const assessment = evaluateRegime(treasury, thresholds, assessmentMacroSeries);
  const liveAssessment = historicalSelection ? evaluateRegime(liveTreasury, thresholds, macroSeries) : null;
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime);
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
    : treasury.isLive
      ? "Live (high confidence)"
      : "Cached (medium)";
  const treasuryProvenance = {
    sourceLabel: "Federal Reserve Economic Data (FRED)",
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
  const statusLabel = regimeStatusLabelMap[assessment.regime];
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
  const lastYearComparison =
    lastYearSnapshot && lastYearAssessment
      ? buildLastYearComparison({
          current: assessment,
          currentRecordDate: treasury.record_date,
          prior: lastYearAssessment,
          priorRecordDate: lastYearSnapshot.record_date,
        })
      : null;

  return {
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
    fenceItems,
    historicalComparison,
    historicalSelection,
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
    regimeTrend,
    selectedMonth,
    selectedYear,
    sensors,
    startItems,
    statusLabel,
    stopItems,
    thresholds,
    treasury,
    treasuryProvenance,
  };
};
