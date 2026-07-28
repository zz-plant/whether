/**
 * Shared loader for Whether Report pages.
 * Centralizes Treasury data fetching and formatting for multi-page layouts.
 *
 * Loop stage owner: signals.
 *
 * Responsibilities:
 * - fetch and normalize signal inputs + source freshness
 * - derive report dynamics from normalized readings
 *
 * Allowed dependencies:
 * - ingestion/fetch + formatting helpers
 * - pure decision libraries only for read-only enrichment
 *
 * Not allowed:
 * - React/UI components
 * - view-specific presentation decisions
 */
import { fetchTreasuryData } from "../treasury/treasuryClient";
import { snapshotData } from "../snapshot";
import { buildSensorReadings } from "../sensors";
import { deriveRegimeTrend, evaluateRegime } from "../regimeEngine";
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
import {
  formatAgeHours,
  formatDateUTC,
  formatTimestampUTC,
  formatWeekEndingUTC,
  resolveWeekEndingIsoDateUTC,
} from "../formatters";
import { buildRegimeAlert } from "./reportFormatting";
import { buildFallbackForecastModel, buildForecastModel } from "./forecastModel";
import { formatRegimeLabel } from "../regimeFormat";
import { logReportDependencyFailure } from "./reportError";
import { buildSourceHealthRows, getLatestParseableTimestamp, type SourceFreshnessStatus } from "./sourceHealth";
import { loadCanonicalReportInputs } from "../ingestion/materialized";
import { cache } from "react";
import type { TreasuryData } from "../types";
import {
  buildFallbackReportDataInternal,
  loadReportDataUncachedInternal,
} from "./reportDataLoader";
import {
  buildWeeklyConfidenceSeries,
  classifyConfidenceTrend,
} from "./reportConfidence";
import {
  buildActionNowShort,
  buildFlipThreshold,
  buildGuidanceBundleFromAssessment,
  buildReportDynamics,
  buildReportEvidenceItems,
} from "./reportEvidence";
import {
  buildHistoricalAnalogs,
  buildLastYearComparison,
} from "./reportHistory";
import { withDeadline } from "../withDeadline";
import type {
  AnalogScoreDimensions,
  ConfidenceTrendFraming,
  HistoricalAnalog,
  LastYearComparison,
  ReportDynamics,
  ReportEvidenceItem,
  WeeklyConfidencePoint,
} from "./reportDataTypes";
export type {
  AnalogScoreDimensions,
  ConfidenceTrendFraming,
  HistoricalAnalog,
  LastYearComparison,
  ReportDynamics,
  ReportEvidenceItem,
  WeeklyConfidencePoint,
} from "./reportDataTypes";
export {
  buildWeeklyConfidenceSeries,
  classifyConfidenceTrend,
} from "./reportConfidence";
export {
  buildActionNowShort,
  buildFlipThreshold,
  buildReportDynamics,
  buildReportEvidenceItems,
  isImprovingSignalDelta,
  signalDeltaImprovesWhen,
} from "./reportEvidence";
export {
  buildHistoricalAnalogs,
  buildLastYearComparison,
} from "./reportHistory";

export type ReportSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

export type ReportDataLoadOptions = {
  includeHistoricalLiveComparison?: boolean;
};

export type DecisionTransmissionConfidenceLabel = "high" | "medium" | "low" | "unknown";

export type DecisionTransmissionBoundedRule = {
  action: string;
  triggerThreshold: string;
  reversalCondition: string;
  manualReviewRequired: boolean;
};

export type DecisionTransmission = {
  whatChanged: string;
  postureNow: string;
  boundedRules: DecisionTransmissionBoundedRule[];
  flipConditions: string[];
  freshness: {
    timestamp: string;
    freshnessStatus: SourceFreshnessStatus;
  };
  confidence: DecisionTransmissionConfidenceLabel;
  provenance: Array<{
    sourceLabel: string;
    reference: string;
    isFallback: boolean;
  }>;
};

const loadCanonicalReportInputsIfAvailable = async (options: { fetcher?: typeof fetch }) => {
  try {
    return await loadCanonicalReportInputs(options);
  } catch {
    return null;
  }
};

const REPORT_DATA_REVALIDATE_SECONDS = 900;

/**
 * Wall-clock ceiling for assembling report data before falling back to the snapshot.
 * Chosen to sit above normal cold-path latency (upstream fetches are individually capped
 * at 8s but run concurrently) while staying far below the point where a visitor gives up.
 */
const REPORT_DATA_DEADLINE_MS = 10_000;
const REPORT_FALLBACK_REASON = "Report dependency outage: serving cached treasury snapshot.";

type ReportDependency = "treasury" | "macro" | "report";

const toError = (value: unknown): Error => (value instanceof Error ? value : new Error(String(value)));

export const REPORT_DATA_CACHE_BUCKET_SECONDS = REPORT_DATA_REVALIDATE_SECONDS;

export const buildReportDataMemoizationKey = (
  searchParams?: ReportSearchParams,
  options?: ReportDataLoadOptions,
  nowMs: number = Date.now(),
) => {
  const cacheBucket = Math.floor(nowMs / (REPORT_DATA_CACHE_BUCKET_SECONDS * 1000));
  return JSON.stringify({
    cacheBucket,
    options: options ?? null,
    searchParams: searchParams ?? null,
  });
};

const withDependencyContext = (dependency: ReportDependency, error: unknown): Error => {
  const resolvedError = toError(error);
  return new Error(`[dependency:${dependency}] ${resolvedError.message}`);
};

export const buildSnapshotFallbackTreasury = (snapshot: TreasuryData, now = new Date()): TreasuryData => ({
  ...snapshot,
  fallback_at: snapshot.fallback_at ?? now.toISOString(),
  fallback_reason: snapshot.fallback_reason ?? REPORT_FALLBACK_REASON,
});

const loadReportDataUncached = async (
  searchParams?: ReportSearchParams,
  options?: ReportDataLoadOptions,
) =>
  loadReportDataUncachedInternal({
    searchParams,
    options,
    deps: {
      REPORT_DATA_REVALIDATE_SECONDS,
      snapshotData,
      fetchTreasuryData,
      loadMacroSeries,
      buildSensorReadings,
      evaluateRegime,
      deriveRegimeTrend,
      parseThresholdsFromSearchParams,
      resolveTimeMachineSelection,
      parseTimeMachineRequest,
      getLatestTimeMachineSnapshot,
      getTimeMachineCoverage,
      getTimeMachineMonthsByYear,
      getTimeMachineRegimeSeries,
      getTimeMachineYieldCurveSeries,
      getTimeMachineSnapshots,
      getPreviousTimeMachineSnapshot,
      findTimeMachineSnapshot,
      DEFAULT_REGIME_SERIES_MONTHS,
      loadCanonicalReportInputsIfAvailable,
      withDependencyContext,
      formatDateUTC,
      formatWeekEndingUTC,
      resolveWeekEndingIsoDateUTC,
      formatTimestampUTC,
      formatAgeHours,
      formatRegimeLabel,
      getLatestParseableTimestamp,
      buildGuidanceBundleFromAssessment,
      buildRegimeAlert,
      buildReportDynamics,
      buildForecastModel,
      buildLastYearComparison,
      buildWeeklyConfidenceSeries,
      classifyConfidenceTrend,
      buildHistoricalAnalogs,
      buildActionNowShort,
      buildFlipThreshold,
      buildReportEvidenceItems,
      buildSourceHealthRows,
      buildSnapshotFallbackTreasury,
      buildFallbackForecastModel,
    },
  });

export type ReportData = Awaited<ReturnType<typeof loadReportDataUncached>>;

export type ReportDataFallback = ReportData & {
  stale: true;
  lastCachedTimestamp: string;
};

export type LoadReportDataSafeResult =
  | { ok: true; data: ReportData }
  | { ok: false; error: Error; fallback: ReportDataFallback };

const loadReportDataMemoized = cache(async (cacheKey: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(cacheKey);
  } catch {
    return loadReportDataUncached();
  }

  if (!parsed || typeof parsed !== "object") {
    return loadReportDataUncached();
  }

  const parsedWithParams = parsed as { options?: unknown; searchParams?: unknown };
  const normalizedOptions: ReportDataLoadOptions = {};
  if (parsedWithParams.options && typeof parsedWithParams.options === "object") {
    const parsedOptions = parsedWithParams.options as Record<string, unknown>;
    if (typeof parsedOptions.includeHistoricalLiveComparison === "boolean") {
      normalizedOptions.includeHistoricalLiveComparison = parsedOptions.includeHistoricalLiveComparison;
    }
  }

  if (parsedWithParams.searchParams === null || typeof parsedWithParams.searchParams === "undefined") {
    return loadReportDataUncached(undefined, normalizedOptions);
  }

  const normalizedSearchParams: ReportSearchParams = {};
  for (const [key, value] of Object.entries(parsedWithParams.searchParams as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "undefined") {
      normalizedSearchParams[key] = value;
    }
  }

  return loadReportDataUncached(normalizedSearchParams, normalizedOptions);
});

export const loadReportData = (searchParams?: ReportSearchParams, options?: ReportDataLoadOptions) => {
  const cacheKey = buildReportDataMemoizationKey(searchParams, options);
  return loadReportDataMemoized(cacheKey);
};


const buildFallbackReportData = (searchParams?: ReportSearchParams): ReportDataFallback =>
  buildFallbackReportDataInternal({
    searchParams,
    deps: {
      REPORT_DATA_REVALIDATE_SECONDS,
      snapshotData,
      fetchTreasuryData,
      loadMacroSeries,
      buildSensorReadings,
      evaluateRegime,
      deriveRegimeTrend,
      parseThresholdsFromSearchParams,
      resolveTimeMachineSelection,
      parseTimeMachineRequest,
      getLatestTimeMachineSnapshot,
      getTimeMachineCoverage,
      getTimeMachineMonthsByYear,
      getTimeMachineRegimeSeries,
      getTimeMachineYieldCurveSeries,
      getTimeMachineSnapshots,
      getPreviousTimeMachineSnapshot,
      findTimeMachineSnapshot,
      DEFAULT_REGIME_SERIES_MONTHS,
      loadCanonicalReportInputsIfAvailable,
      withDependencyContext,
      formatDateUTC,
      formatWeekEndingUTC,
      resolveWeekEndingIsoDateUTC,
      formatTimestampUTC,
      formatAgeHours,
      formatRegimeLabel,
      getLatestParseableTimestamp,
      buildGuidanceBundleFromAssessment,
      buildRegimeAlert,
      buildReportDynamics,
      buildForecastModel,
      buildLastYearComparison,
      buildWeeklyConfidenceSeries,
      classifyConfidenceTrend,
      buildHistoricalAnalogs,
      buildActionNowShort,
      buildFlipThreshold,
      buildReportEvidenceItems,
      buildSourceHealthRows,
      buildSnapshotFallbackTreasury,
      buildFallbackForecastModel,
    },
  }) as ReportDataFallback;

export const loadReportDataSafe = async (
  searchParams?: ReportSearchParams,
  context?: { route?: string; requestId?: string },
  options?: ReportDataLoadOptions,
): Promise<LoadReportDataSafeResult> => {
  try {
    const data = await withDeadline(
      loadReportData(searchParams, options),
      REPORT_DATA_DEADLINE_MS,
      "report-data",
    );
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
