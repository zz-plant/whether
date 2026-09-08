import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import type { RegimeAssessment, RegimeThresholds, RegimeTrend } from "../regimeEngine";
import {
  PROVENANCE_STATUS,
  historicalMacroStatus,
  resolveProvenanceStatus,
} from "./provenanceStatus";

/**
 * `isLive` is not on the declared macro-series element type, so this used to be
 * read through a cast. `in` narrows instead, which also makes a series that
 * simply lacks the flag read as not-live rather than as `undefined` coerced.
 */
const hasLiveFlag = (signal: object): boolean => "isLive" in signal && signal.isLive === true;
import type { ForecastModel } from "./forecastModel";
import { loadRegimeMachineSnapshot } from "../storage/regimeMachineSnapshotStore";
import type { PlaybookEntry } from "../playbook";
import type { SourceHealthRow } from "./sourceHealth";
import type { ActionStripItem } from "./operatingCalls";
import type {
  ConfidenceTrendFraming,
  HistoricalAnalog,
  LastYearComparison,
  ReportDynamics,
  ReportEvidenceItem,
  WeeklyConfidencePoint,
} from "./reportDataTypes";
import type { TimeMachineRegimeEntry, TimeMachineYieldCurveEntry } from "../timeMachine/timeMachineCache";
import type { OperatingSnapshot } from "../operatingState/types";

type ReportSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

type ReportDataLoadOptions = {
  includeHistoricalLiveComparison?: boolean;
};

type ReportDataLoaderDependencies = {
  REPORT_DATA_REVALIDATE_SECONDS: number;
  snapshotData: TreasuryData;
  fetchTreasuryData: (options: {
    fetcher?: typeof fetch;
    snapshotFallback?: TreasuryData;
    asOf?: string;
  }) => Promise<TreasuryData>;
  loadMacroSeries: (fetcher?: typeof fetch) => Promise<MacroSeriesReading[]>;
  buildSensorReadings: (treasury: TreasuryData) => SensorReading[];
  evaluateRegime: typeof import("../regimeEngine").evaluateRegime;
  deriveRegimeTrend: (
    previous: RegimeAssessment | null,
    current: RegimeAssessment,
  ) => RegimeTrend;
  parseThresholdsFromSearchParams: (searchParams?: ReportSearchParams) => RegimeThresholds;
  resolveTimeMachineSelection: (searchParams?: ReportSearchParams) => { asOf: string; month: number; year: number; banner: string } | null;
  parseTimeMachineRequest: (searchParams?: ReportSearchParams) => { month?: number; year?: number } | null;
  getLatestTimeMachineSnapshot: () => { month: number; year: number } | null;
  getTimeMachineCoverage: () => { earliest: string | null; latest: string | null };
  getTimeMachineMonthsByYear: () => Record<number, number[]>;
  getTimeMachineRegimeSeries: (months: number, thresholds: RegimeThresholds, asOf?: string) => TimeMachineRegimeEntry[];
  getTimeMachineYieldCurveSeries: (months: number, asOf?: string) => TimeMachineYieldCurveEntry[];
  getTimeMachineSnapshots: () => Array<TreasuryData & { year: number; month: number }>;
  getPreviousTimeMachineSnapshot: (recordDate: string) => TreasuryData | null;
  findTimeMachineSnapshot: (recordDate: string) => TreasuryData | null;
  DEFAULT_REGIME_SERIES_MONTHS: number;
  loadCanonicalReportInputsIfAvailable: (options: { fetcher?: typeof fetch }) => Promise<{
    treasury: TreasuryData;
    macroSeries: MacroSeriesReading[];
    materializedSignals: unknown;
  } | null>;
  loadLatestOperatingSnapshot: () => Promise<OperatingSnapshot | null>;
  withDependencyContext: (dependency: "treasury" | "macro" | "report", error: unknown) => Error;
  formatDateUTC: (value: string) => string;
  formatWeekEndingUTC: (value: string) => string;
  resolveWeekEndingIsoDateUTC: (value: string) => string;
  formatTimestampUTC: (value: string) => string;
  formatAgeHours: typeof import("../formatters").formatAgeHours;
  formatRegimeLabel: typeof import("../regimeFormat").formatRegimeLabel;
  getLatestParseableTimestamp: (values: Array<string | null | undefined>) => string | null;
  buildGuidanceBundleFromAssessment: (
    assessment: RegimeAssessment,
  ) => {
    playbook: PlaybookEntry | null;
    startItems: string[];
    stopItems: string[];
    actionStripItems: ActionStripItem[];
  };
  buildRegimeAlert: (
    current: RegimeAssessment,
    previous: RegimeAssessment,
    currentRecordDate: string,
    previousRecordDate: string
  ) => {
    changed: boolean;
    currentRegime: RegimeAssessment["regime"];
    previousRegime: RegimeAssessment["regime"];
    currentRecordDate: string;
    previousRecordDate: string;
    reasons: string[];
    summary: string;
  } | null;
  buildReportDynamics: (args: {
    current: RegimeAssessment;
    previous: RegimeAssessment | null;
  }) => ReportDynamics;
  buildForecastModel: (args: {
    assessment: RegimeAssessment;
    reportDynamics: ReportDynamics;
    macroSeries: MacroSeriesReading[];
  }) => ForecastModel;
  buildLastYearComparison: (args: {
    current: RegimeAssessment;
    currentRecordDate: string;
    prior: RegimeAssessment;
    priorRecordDate: string;
  }) => LastYearComparison;
  buildWeeklyConfidenceSeries: (args: {
    snapshots: TreasuryData[];
    currentSnapshot?: TreasuryData;
    thresholds: RegimeThresholds;
    asOf: string;
    window?: number;
  }) => WeeklyConfidencePoint[];
  classifyConfidenceTrend: (points: WeeklyConfidencePoint[]) => ConfidenceTrendFraming;
  buildHistoricalAnalogs: (args: {
    current: RegimeAssessment;
    snapshots: TreasuryData[];
    thresholds: RegimeThresholds;
    currentTrendDirection: ReportDynamics["directionLabel"];
    limit?: number;
  }) => HistoricalAnalog[];
  buildActionNowShort: (args: Pick<ReportDynamics, "directionLabel" | "regimeChanged"> & { regime?: RegimeAssessment["regime"] }) => string;
  buildFlipThreshold: (assessment: RegimeAssessment) => string;
  buildReportEvidenceItems: (args: {
    reportDynamics: ReportDynamics;
    assessment: RegimeAssessment;
    lastUpdated: string | null;
  }) => ReportEvidenceItem[];
  buildSourceHealthRows: (args: {
    treasury: TreasuryData;
    macroSeries: MacroSeriesReading[];
    macroStatusLabel: string;
    now: Date;
  }) => SourceHealthRow[];
  buildSnapshotFallbackTreasury: (snapshot: TreasuryData, now?: Date) => TreasuryData;
  buildFallbackForecastModel: () => ForecastModel;
};

type LoadReportDataUncachedArgs = {
  searchParams?: ReportSearchParams;
  options?: ReportDataLoadOptions;
  deps: ReportDataLoaderDependencies;
};

type BuildFallbackReportDataArgs = {
  searchParams?: ReportSearchParams;
  deps: ReportDataLoaderDependencies;
};

const getLatestRecordDate = (dates: Array<string | null | undefined>) => {
  let latestDate: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;

  for (const date of dates) {
    if (typeof date !== "string") {
      continue;
    }

    const parsedDate = Date.parse(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate) || parsedDate <= latestMs) {
      continue;
    }

    latestDate = date;
    latestMs = parsedDate;
  }

  return latestDate;
};

const toUtcDateMs = (value: string) => Date.parse(`${value}T00:00:00.000Z`);

const hasThresholdOverrides = (searchParams?: ReportSearchParams) =>
  Boolean(
    searchParams?.baseRateThreshold
    || searchParams?.tightnessThreshold
    || searchParams?.riskThreshold,
  );

const alignMacroSeriesToAsOf = (macroSeries: MacroSeriesReading[], asOf: string) => {
  const asOfMs = toUtcDateMs(asOf);

  if (!Number.isFinite(asOfMs)) {
    return {
      series: [],
      coverage: {
        mode: "treasury-only" as const,
        label: "No aligned macro history available",
        alignedCount: 0,
        totalCount: macroSeries.length,
      },
    };
  }

  let alignedCount = 0;
  const series = macroSeries.map((entry) => {
    const historicalPoint = [...(entry.history ?? [])]
      .filter((point) => Number.isFinite(toUtcDateMs(point.date)) && toUtcDateMs(point.date) <= asOfMs)
      .sort((left, right) => toUtcDateMs(left.date) - toUtcDateMs(right.date))
      .at(-1);
    const canUseCurrentValue =
      typeof entry.value === "number"
      && Number.isFinite(toUtcDateMs(entry.record_date))
      && toUtcDateMs(entry.record_date) <= asOfMs;

    if (!historicalPoint && !canUseCurrentValue) {
      return {
        ...entry,
        value: null,
        record_date: asOf,
        isLive: false,
        history: (entry.history ?? []).filter((point) => toUtcDateMs(point.date) <= asOfMs),
      };
    }

    alignedCount += 1;
    return {
      ...entry,
      value: historicalPoint?.value ?? entry.value,
      record_date: historicalPoint?.date ?? entry.record_date,
      isLive: false,
      history: (entry.history ?? []).filter((point) => toUtcDateMs(point.date) <= asOfMs),
    };
  });

  const coverageMode =
    alignedCount === 0
      ? "treasury-only"
      : alignedCount === macroSeries.length
        ? "historical-aligned"
        : "historical-partial";

  const coverageLabel =
    coverageMode === "historical-aligned"
      ? "Historical macro aligned"
      : coverageMode === "historical-partial"
        ? `Historical macro partial (${alignedCount}/${macroSeries.length})`
        : "Historical Treasury-only";

  return {
    series,
    coverage: {
      mode: coverageMode,
      label: coverageLabel,
      alignedCount,
      totalCount: macroSeries.length,
    },
  };
};

export const loadReportDataUncachedInternal = async ({
  searchParams,
  options,
  deps,
}: LoadReportDataUncachedArgs) => {
  const liveFetcher: typeof fetch = (input, init) =>
    fetch(input, {
      ...init,
      next: {
        ...init?.next,
        revalidate: deps.REPORT_DATA_REVALIDATE_SECONDS,
      },
    });

  const historicalSelection = deps.resolveTimeMachineSelection(searchParams);
  const requestedSelection = deps.parseTimeMachineRequest(searchParams);
  const shouldLoadHistoricalLiveComparison =
    options?.includeHistoricalLiveComparison !== false && Boolean(historicalSelection);
  const operatingSnapshot = historicalSelection
    ? null
    : await deps.loadLatestOperatingSnapshot();
  const projectsOperatingSnapshot = Boolean(operatingSnapshot && !hasThresholdOverrides(searchParams));
  const canonicalInputs = historicalSelection || operatingSnapshot
    ? null
    : await deps.loadCanonicalReportInputsIfAvailable({ fetcher: liveFetcher });
  const treasuryPromise = operatingSnapshot
    ? Promise.resolve(operatingSnapshot.treasury)
    : canonicalInputs
    ? Promise.resolve(canonicalInputs.treasury)
    : deps.fetchTreasuryData({
        fetcher: liveFetcher,
        snapshotFallback: deps.snapshotData,
        asOf: historicalSelection?.asOf,
      });
  const liveTreasuryPromise = operatingSnapshot
    ? Promise.resolve(operatingSnapshot.treasury)
    : canonicalInputs
    ? Promise.resolve(canonicalInputs.treasury)
    : shouldLoadHistoricalLiveComparison
      ? deps.fetchTreasuryData({ snapshotFallback: deps.snapshotData, fetcher: liveFetcher })
      : null;

  const now = new Date();
  const latestCache = deps.getLatestTimeMachineSnapshot();
  const defaultMonth = latestCache?.month ?? now.getUTCMonth() + 1;
  const defaultYear = latestCache?.year ?? now.getUTCFullYear();
  const cacheCoverage = deps.getTimeMachineCoverage();
  const cacheMonthsByYear = deps.getTimeMachineMonthsByYear();
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const thresholds = projectsOperatingSnapshot && operatingSnapshot
    ? operatingSnapshot.assessment.thresholds
    : deps.parseThresholdsFromSearchParams(searchParams);
  const regimeSeries = deps.getTimeMachineRegimeSeries(deps.DEFAULT_REGIME_SERIES_MONTHS, thresholds, historicalSelection?.asOf);
  const yieldCurveSeries = deps.getTimeMachineYieldCurveSeries(240, historicalSelection?.asOf);
  const timeMachineSnapshots = deps.getTimeMachineSnapshots();
  const [treasuryResult, liveTreasuryResult, macroResult, snapshotResult] = await Promise.allSettled([
    treasuryPromise,
    liveTreasuryPromise ?? Promise.resolve(null),
    operatingSnapshot
      ? Promise.resolve(operatingSnapshot.macroSeries)
      : canonicalInputs
        ? Promise.resolve(canonicalInputs.macroSeries)
        : deps.loadMacroSeries(liveFetcher),
    operatingSnapshot
      ? Promise.resolve(operatingSnapshot.machineState)
      : loadRegimeMachineSnapshot(),
  ]);

  if (treasuryResult.status === "rejected") {
    throw deps.withDependencyContext("treasury", treasuryResult.reason);
  }

  if (shouldLoadHistoricalLiveComparison && liveTreasuryResult.status === "rejected") {
    throw deps.withDependencyContext("treasury", liveTreasuryResult.reason);
  }

  if (macroResult.status === "rejected") {
    throw deps.withDependencyContext("macro", macroResult.reason);
  }

  const treasury = treasuryResult.value;
  const liveTreasury = liveTreasuryResult.status === "fulfilled" && liveTreasuryResult.value
    ? liveTreasuryResult.value
    : treasury;
  const macroSeries = macroResult.value;
  const alignedHistoricalMacro = historicalSelection
    ? alignMacroSeriesToAsOf(macroSeries, treasury.record_date)
    : null;
  const assessmentMacroSeries = historicalSelection
    ? alignedHistoricalMacro?.series ?? []
    : macroSeries;
  const recordDateLabel = deps.formatDateUTC(treasury.record_date);
  const weeklyRecordDate = deps.resolveWeekEndingIsoDateUTC(treasury.record_date);
  const weeklyRecordDateLabel = deps.formatWeekEndingUTC(treasury.record_date);
  const fetchedAtLabel = deps.formatTimestampUTC(treasury.fetched_at);
  const treasuryAgeLabel = deps.formatAgeHours(treasury.fetched_at, now);
  const sensors = deps.buildSensorReadings(treasury);
  const previousMachineSnapshot = snapshotResult.status === "fulfilled" ? snapshotResult.value : null;
  const assessment = projectsOperatingSnapshot && operatingSnapshot
    ? operatingSnapshot.assessment
    : deps.evaluateRegime(treasury, thresholds, assessmentMacroSeries, previousMachineSnapshot);
  const liveAssessment = shouldLoadHistoricalLiveComparison
    ? deps.evaluateRegime(liveTreasury, thresholds, macroSeries, previousMachineSnapshot)
    : null;
  const { playbook, startItems, stopItems, actionStripItems } = deps.buildGuidanceBundleFromAssessment(assessment);
  const fenceItems = assessment.constraints;
  const previousSnapshot = deps.getPreviousTimeMachineSnapshot(treasury.record_date);
  const recordDate = new Date(treasury.record_date);
  const comparisonDate = new Date(treasury.record_date);
  comparisonDate.setUTCFullYear(recordDate.getUTCFullYear() - 1);
  const lastYearSnapshot = deps.findTimeMachineSnapshot(comparisonDate.toISOString());
  const previousAssessment = previousSnapshot
    ? deps.evaluateRegime(previousSnapshot, thresholds)
    : null;
  const lastYearAssessment = lastYearSnapshot ? deps.evaluateRegime(lastYearSnapshot, thresholds) : null;
  // One policy, two readings of it: the treasury strip judges the treasury feed,
  // the macro strip judges the macro series. They differ only in what a replay
  // is called and which feed counts as live.
  const isCanonicalRead = Boolean(operatingSnapshot || canonicalInputs);
  const confidenceLabel = resolveProvenanceStatus({
    historicalLabel: historicalSelection ? PROVENANCE_STATUS.simulated : undefined,
    isCanonical: isCanonicalRead,
    isLive: Boolean(treasury.isLive),
  });
  const treasuryProvenance = {
    sourceLabel: operatingSnapshot?.provenance.sourceLabel
      ?? (canonicalInputs ? "Canonical ingestion (FRED)" : "Federal Reserve Economic Data (FRED)"),
    sourceUrl: treasury.source,
    recordDateLabel,
    timestampLabel: fetchedAtLabel,
    ageLabel: treasuryAgeLabel,
    statusLabel: confidenceLabel,
  };
  const freshestMacroSeries = [...macroSeries]
    .filter((series) => typeof (series as { fetched_at?: string }).fetched_at === "string")
    .sort((left, right) => Date.parse((right as { fetched_at: string }).fetched_at) - Date.parse((left as { fetched_at: string }).fetched_at))[0];
  const macroTimestamp = deps.getLatestParseableTimestamp(macroSeries.map((series) => (series as { fetched_at?: string }).fetched_at)) ?? treasury.fetched_at;
  const macroRecordDate = getLatestRecordDate(macroSeries.map((series) => (series as { record_date?: string }).record_date)) ?? treasury.record_date;
  const macroAgeLabel = deps.formatAgeHours(macroTimestamp, now);
  const macroProvenance = {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: (freshestMacroSeries as { sourceUrl?: string } | undefined)?.sourceUrl ?? (macroSeries[0] as { sourceUrl?: string } | undefined)?.sourceUrl,
    recordDateLabel: deps.formatDateUTC(macroRecordDate),
    timestampLabel: deps.formatTimestampUTC(macroTimestamp),
    ageLabel: macroAgeLabel,
    statusLabel: resolveProvenanceStatus({
      historicalLabel: historicalSelection
        ? historicalMacroStatus(alignedHistoricalMacro?.coverage.mode)
        : undefined,
      isCanonical: isCanonicalRead,
      isLive: macroSeries.some(hasLiveFlag),
    }),
  };
  const internalProvenance = {
    sourceLabel: "Whether curated playbook catalog",
    recordDateLabel: "Static",
    timestampLabel: "Static catalog",
    ageLabel: "Static.",
    statusLabel: "Simulated (low)",
  };
  const statusLabel = deps.formatRegimeLabel(assessment.regime);
  const historicalComparison =
    shouldLoadHistoricalLiveComparison && liveAssessment
      ? {
          historical: {
            regime: assessment.regime,
            recordDate: treasury.record_date,
            baseRate: assessment.scores.baseRate,
            curveSlope: assessment.scores.curveSlope,
            tightness: assessment.scores.tightness,
            riskAppetite: assessment.scores.riskAppetite,
          },
          live: {
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
      ? deps.buildRegimeAlert(
          assessment,
          previousAssessment,
          treasury.record_date,
          previousSnapshot.record_date,
        )
      : null;
  const reportDynamics = deps.buildReportDynamics({
    current: assessment,
    previous: previousAssessment,
  });
  const regimeTrend = deps.deriveRegimeTrend(previousAssessment, assessment);
  const forecast = deps.buildForecastModel({
    assessment,
    reportDynamics,
    macroSeries,
  });
  const lastYearComparison =
    lastYearSnapshot && lastYearAssessment
      ? deps.buildLastYearComparison({
          current: assessment,
          currentRecordDate: treasury.record_date,
          prior: lastYearAssessment,
          priorRecordDate: lastYearSnapshot.record_date,
        })
      : null;
  const confidenceHistory = deps.buildWeeklyConfidenceSeries({
    snapshots: timeMachineSnapshots.map(({ year: _year, month: _month, ...snapshot }) => snapshot),
    currentSnapshot: treasury,
    thresholds,
    asOf: treasury.record_date,
    window: 8,
  });
  const confidenceTrend = deps.classifyConfidenceTrend(confidenceHistory);
  const historicalAnalogs = deps.buildHistoricalAnalogs({
    current: assessment,
    snapshots: timeMachineSnapshots
      .filter((snapshot) => new Date(snapshot.record_date).getTime() <= new Date(treasury.record_date).getTime())
      .map(({ year: _year, month: _month, ...snapshot }) => snapshot),
    thresholds,
    currentTrendDirection: reportDynamics.directionLabel,
  });
  const actionNowShort = deps.buildActionNowShort({ ...reportDynamics, regime: assessment.regime });
  // A threshold, not a playbook "stop" item. This read stopItems[0], so the
  // guardrail slot on the trust and evidence pages carried lines like
  // "Over-engineering before demand proves out" under "Pause if:".
  const guardrailThreshold = actionStripItems[0]?.triggerThreshold ?? stopItems[0];
  const flipThreshold = deps.buildFlipThreshold(assessment);
  const reportEvidenceItems = deps.buildReportEvidenceItems({
    reportDynamics,
    assessment,
    lastUpdated: treasury.record_date,
  });
  const sourceHealth = deps.buildSourceHealthRows({
    treasury,
    macroSeries,
    macroStatusLabel: macroProvenance.statusLabel,
    now,
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
    macroCoverage: historicalSelection
      ? alignedHistoricalMacro?.coverage ?? {
        mode: "treasury-only" as const,
        label: "Historical Treasury-only",
        alignedCount: 0,
        totalCount: macroSeries.length,
      }
      : {
        mode: "live" as const,
        label: "Live macro coverage",
        alignedCount: macroSeries.length,
        totalCount: macroSeries.length,
      },
    playbook,
    recordDateLabel,
    weeklyRecordDate,
    weeklyRecordDateLabel,
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
    sourceHealth,
    materializedSignals: canonicalInputs?.materializedSignals ?? null,
    operatingSnapshot,
    projectsOperatingSnapshot,
  };
};

export const buildFallbackReportDataInternal = ({
  searchParams,
  deps,
}: BuildFallbackReportDataArgs) => {
  const now = new Date();
  const fallbackTreasury = deps.buildSnapshotFallbackTreasury(deps.snapshotData, now);
  const historicalSelection = deps.resolveTimeMachineSelection(searchParams);
  const requestedSelection = deps.parseTimeMachineRequest(searchParams);
  const latestCache = deps.getLatestTimeMachineSnapshot();
  const defaultMonth = latestCache?.month ?? now.getUTCMonth() + 1;
  const defaultYear = latestCache?.year ?? now.getUTCFullYear();
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const thresholds = deps.parseThresholdsFromSearchParams(searchParams);
  const cacheCoverage = deps.getTimeMachineCoverage();
  const cacheMonthsByYear = deps.getTimeMachineMonthsByYear();
  const regimeSeries = deps.getTimeMachineRegimeSeries(deps.DEFAULT_REGIME_SERIES_MONTHS, thresholds, historicalSelection?.asOf);
  const yieldCurveSeries = deps.getTimeMachineYieldCurveSeries(240, historicalSelection?.asOf);
  const assessment = deps.evaluateRegime(fallbackTreasury, thresholds, []);
  const liveAssessment = deps.evaluateRegime(fallbackTreasury, thresholds, []);
  const sensors = deps.buildSensorReadings(fallbackTreasury);
  const recordDateLabel = deps.formatDateUTC(fallbackTreasury.record_date);
  const weeklyRecordDate = deps.resolveWeekEndingIsoDateUTC(fallbackTreasury.record_date);
  const weeklyRecordDateLabel = deps.formatWeekEndingUTC(fallbackTreasury.record_date);
  const fetchedAtLabel = deps.formatTimestampUTC(fallbackTreasury.fetched_at);
  const ageLabel = deps.formatAgeHours(fallbackTreasury.fetched_at, now);
  const { playbook, startItems, stopItems, actionStripItems } = deps.buildGuidanceBundleFromAssessment(assessment);

  const fallbackReportDynamics: ReportDynamics = {
    changedSignals: [],
    anomalySignals: [],
    totalSignalChanges: 0,
    regimeChanged: false,
    directionLabel: "stable",
  };
  const actionNowShort = deps.buildActionNowShort({ ...fallbackReportDynamics, regime: assessment.regime });
  // A threshold, not a playbook "stop" item. This read stopItems[0], so the
  // guardrail slot on the trust and evidence pages carried lines like
  // "Over-engineering before demand proves out" under "Pause if:".
  const guardrailThreshold = actionStripItems[0]?.triggerThreshold ?? stopItems[0];
  const flipThreshold = deps.buildFlipThreshold(assessment);
  const reportEvidenceItems = deps.buildReportEvidenceItems({
    reportDynamics: fallbackReportDynamics,
    assessment,
    lastUpdated: fallbackTreasury.record_date,
  });
  const sourceHealth = deps.buildSourceHealthRows({
    treasury: fallbackTreasury,
    macroSeries: [],
    macroStatusLabel: "Unavailable (fallback)",
    now,
  });

  return {
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
    fenceItems: assessment.constraints,
    forecast: deps.buildFallbackForecastModel(),
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
    weeklyRecordDate,
    weeklyRecordDateLabel,
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
    statusLabel: deps.formatRegimeLabel(assessment.regime),
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
    operatingSnapshot: null,
    projectsOperatingSnapshot: false,
    sourceHealth,
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
    macroCoverage: {
      mode: historicalSelection ? "treasury-only" as const : "cached" as const,
      label: historicalSelection ? "Historical Treasury-only" : "Cached macro snapshot unavailable",
      alignedCount: 0,
      totalCount: 0,
    },
  };
};
