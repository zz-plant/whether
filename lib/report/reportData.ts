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
  getTimeMachineYieldCurveSeries,
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
import { formatRegimeLabel } from "../regimeFormat";
import { logReportDependencyFailure } from "./reportError";
import type { TreasuryData } from "../types";

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
  ]
    .filter((item) => Math.abs(item.delta) >= 0.01)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const improvingMoves = comparisons.filter((item) => isImprovingSignalDelta(item.key, item.delta)).length;
  const deterioratingMoves = comparisons.filter((item) => !isImprovingSignalDelta(item.key, item.delta)).length;
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
  const yieldCurveSeries = getTimeMachineYieldCurveSeries(240, historicalSelection?.asOf);
  const [treasuryResult, liveTreasuryResult, macroResult] = await Promise.allSettled([
    treasuryPromise,
    liveTreasuryPromise ?? treasuryPromise,
    loadMacroSeries(liveFetcher),
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
    yieldCurveSeries,
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

export type ReportData = Awaited<ReturnType<typeof loadReportDataUncached>>;

export type ReportDataFallback = ReportData & {
  stale: true;
  lastCachedTimestamp: string;
};

export type LoadReportDataSafeResult =
  | { ok: true; data: ReportData }
  | { ok: false; error: Error; fallback: ReportDataFallback };

let defaultReportDataPromise: Promise<ReportData> | null = null;

export const loadReportData = (searchParams?: ReportSearchParams) => {
  if (searchParams) {
    return loadReportDataUncached(searchParams);
  }

  if (!defaultReportDataPromise) {
    defaultReportDataPromise = loadReportDataUncached();
  }

  return defaultReportDataPromise;
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
  const regimeSeries = getTimeMachineRegimeSeries(DEFAULT_REGIME_SERIES_MONTHS, thresholds);
  const yieldCurveSeries = getTimeMachineYieldCurveSeries(240, historicalSelection?.asOf);
  const assessment = evaluateRegime(fallbackTreasury, thresholds, []);
  const liveAssessment = evaluateRegime(fallbackTreasury, thresholds, []);
  const sensors = buildSensorReadings(fallbackTreasury);
  const recordDateLabel = formatDateUTC(fallbackTreasury.record_date);
  const fetchedAtLabel = formatTimestampUTC(fallbackTreasury.fetched_at);
  const ageLabel = formatAgeHours(fallbackTreasury.fetched_at, now);
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime);

  return {
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
    fenceItems: assessment.constraints,
    historicalComparison: null,
    historicalSelection,
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
    reportDynamics: {
      changedSignals: [],
      totalSignalChanges: 0,
      regimeChanged: false,
      directionLabel: "stable",
    },
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
    thresholds,
    treasury: fallbackTreasury,
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
