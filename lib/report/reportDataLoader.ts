import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import type { RegimeAssessment, RegimeThresholds } from "../regimeEngine";
import {
  FRED_SOURCE_LABEL,
  PROVENANCE_CATALOG_STATUS,
  PROVENANCE_FALLBACK_STATUS,
  PROVENANCE_STATUS,
  historicalMacroStatus,
  publisherSourceLabel,
  resolveProvenanceStatus,
  type ReportProvenance,
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
import { buildComparedWith } from "./comparisonBasis";
import { rescoreStoredInputs, type ComparisonReading, type RescoreStoredInputs } from "./comparisonReading";
import { buildWeekActionNow, buildWeekCallChangesIf } from "./reportEvidence";
import { monthEndComparisonReading, selectWeekComparison } from "./weekComparison";
import { explainScoreMovement } from "./scoreMovement";
import type {
  ComparedWith,
  ConfidenceTrendFraming,
  HistoricalAnalog,
  LastYearComparison,
  ReportDynamics,
  ReportEvidenceItem,
  WeeklyConfidencePoint,
} from "./reportDataTypes";
import type { TimeMachineRegimeEntry, TimeMachineYieldCurveEntry } from "../timeMachine/timeMachineCache";
import { buildReplayContext } from "../timeMachine/regimeReplay";
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
  deriveRegimeTrend: typeof import("../regimeEngine").deriveRegimeTrend;
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
  /**
   * Last week's published brief as a comparison, or null where the archive has none in range
   * (`findWeeklyComparisonReading`). A brief scored by another engine is scored again by `rescore`.
   */
  findWeeklyComparisonReading: (recordDate: string, rescore: RescoreStoredInputs) => ComparisonReading | null;
  findTimeMachineSnapshot: (recordDate: string) => TreasuryData | null;
  findTimeMachineGovernedAssessment: (
    recordDate: string,
    overrides?: Partial<RegimeThresholds>,
  ) => RegimeAssessment | null;
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
  formatRegimeLabel: (regime: string) => string;
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
    previous: Pick<ComparisonReading, "regime" | "scores">,
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
    previous: ComparisonReading | null;
    comparedWith?: ComparedWith;
    movement?: ReportDynamics["movement"];
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
    resolveGovernedAssessment?: (recordDate: string) => RegimeAssessment | null;
  }) => WeeklyConfidencePoint[];
  classifyConfidenceTrend: (points: WeeklyConfidencePoint[]) => ConfidenceTrendFraming;
  buildHistoricalAnalogs: (args: {
    current: RegimeAssessment;
    snapshots: TreasuryData[];
    thresholds: RegimeThresholds;
    currentTrendDirection: ReportDynamics["directionLabel"];
    limit?: number;
    resolveGovernedAssessment?: (recordDate: string) => RegimeAssessment | null;
  }) => HistoricalAnalog[];
  buildActionNowShort: (
    args: Pick<ReportDynamics, "directionLabel" | "regimeChanged"> & { regime?: RegimeAssessment["regime"]; pauseApplies?: boolean },
  ) => string;
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

/**
 * The reading a week is compared with, the date it is named by, and, against a
 * month-end only, what each score's move is made of (`ReportDynamics.movement`).
 */
type WeekComparison = {
  reading: ComparisonReading;
  comparedWith: ComparedWith | undefined;
  movement?: ReportDynamics["movement"];
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
  /* The macro series as of the record date: the live read's own series, or for
     a historical selection each series' last observation on or before that
     month-end, and null where its history does not reach back that far. This is
     the series the report returns, not just the one it scores with. Until
     2026-10-07 the return carried `macroSeries`, the series fetched today, so
     /history/compare printed this week's 1.46% borrowing premium, 3.35%
     inflation and 4.2% unemployment under Mar 31, 2020 and a "0.00%" change
     between the two months. `macroSeries` itself stays live for what is about
     today's feeds: the live comparison, source health and provenance. */
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
  /**
   * A historical selection is a replay, not a point read: it must resolve
   * against the governed walk whose machine state was threaded through the full
   * prefix. Evaluating the snapshot against today's live machine snapshot
   * published a different regime than /history and the archives list for the
   * same month — the compare cards contradicted the very options that selected
   * them. Falls back to the point evaluation only when the date sits outside
   * the walk, and that fallback is still a replay: judged on the inputs on
   * record for the month (`buildReplayContext`), so a series whose history does
   * not reach back that far is absent from the record, not a missing input.
   */
  const governedHistoricalAssessment = historicalSelection
    ? deps.findTimeMachineGovernedAssessment(treasury.record_date, thresholds)
    : null;
  const pointEvaluationContext = historicalSelection
    ? buildReplayContext({ treasury, macroSeries: assessmentMacroSeries, baseRateHistory: treasury.oneMonthHistory })
    : { baseRateHistory: treasury.oneMonthHistory };
  const assessment = projectsOperatingSnapshot && operatingSnapshot
    ? operatingSnapshot.assessment
    : governedHistoricalAssessment ??
      deps.evaluateRegime(treasury, thresholds, assessmentMacroSeries, previousMachineSnapshot, pointEvaluationContext);
  const liveAssessment = shouldLoadHistoricalLiveComparison
    ? deps.evaluateRegime(liveTreasury, thresholds, macroSeries, previousMachineSnapshot, {
        baseRateHistory: liveTreasury.oneMonthHistory,
      })
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
  // Annotated rather than inferred: the fallback loader stamps these fields with
  // its own labels, and both loaders have to produce one type.
  const treasuryProvenance: ReportProvenance = {
    // "Canonical ingestion (FRED)" on the ingested path until 2026-10-07, printed as the
    // source of every cadence summary: the pipeline's name, where a reader wants the
    // publisher. A snapshot stored before then still says "Canonical snapshot (FRED)".
    sourceLabel: publisherSourceLabel(operatingSnapshot?.provenance.sourceLabel ?? FRED_SOURCE_LABEL),
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
  const macroProvenance: ReportProvenance = {
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
  const internalProvenance: ReportProvenance = {
    sourceLabel: "Whether curated playbook catalog",
    recordDateLabel: "Static",
    timestampLabel: "Static catalog",
    ageLabel: "Static.",
    statusLabel: PROVENANCE_CATALOG_STATUS,
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
  /* The previous month-end snapshot as a comparison, named by its date. Its
     moves are split by what made them: the month-end is scored from rates alone
     (above), so today's inputs are scored in stages to say which part of each
     move is rates and which is an input the month-end score never had. No split
     is printed unless the stages rebuild the assessment on the page. The
     conditions map draws month-ends, so its like-for-like note reads this split
     whichever reading the week itself compares with. */
  const monthEndComparison: WeekComparison | null =
    previousSnapshot && previousAssessment
      ? {
          reading: monthEndComparisonReading(previousSnapshot, previousAssessment),
          comparedWith: buildComparedWith(previousSnapshot.record_date, treasury.record_date),
          movement: explainScoreMovement({
            previous: previousAssessment.scores,
            current: assessment.scores,
            treasury,
            thresholds,
            macroSeries: assessmentMacroSeries,
            evaluate: deps.evaluateRegime,
          }),
        }
      : null;
  /* What changed this week is against last week's published brief, where the
     archive has one from the previous one to two weeks: it was scored the way
     this reading is, so the moves are like-for-like and there is no
     rates-versus-inputs split to make. A brief scored by an earlier engine is
     like-for-like once its stored inputs are scored again by this one, under
     these thresholds and, like the month-end above, with no machine state
     (`rescoreStoredInputs`). The month-end is the fallback. A replay
     is a walk of month-ends, and a threshold override rescores this reading
     against lines the brief was not published with, so both keep the month-end. */
  const weeklyReading =
    historicalSelection || hasThresholdOverrides(searchParams)
      ? null
      : deps.findWeeklyComparisonReading(treasury.record_date, rescoreStoredInputs(deps.evaluateRegime, thresholds));
  const comparison: WeekComparison | null = selectWeekComparison(treasury.record_date, weeklyReading, () => monthEndComparison);
  const regimeAlert = comparison
    ? deps.buildRegimeAlert(assessment, comparison.reading, treasury.record_date, comparison.reading.recordDate)
    : null;
  const reportDynamics = deps.buildReportDynamics({
    current: assessment,
    previous: comparison?.reading ?? null,
    comparedWith: comparison?.comparedWith,
    movement: comparison?.movement,
  });
  const regimeTrend = deps.deriveRegimeTrend(
    comparison ? { scores: comparison.reading.scores, thresholds } : null,
    assessment,
  );
  // As of the record date, like the assessment: a replayed month's forecast
  // read today's macro downside bias.
  const forecast = deps.buildForecastModel({
    assessment,
    reportDynamics,
    macroSeries: assessmentMacroSeries,
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
  /**
   * Historical confidence points and analog candidates resolve to the governed
   * record — the threaded walk, with each month's VIX haircut and veto — not a
   * bare re-evaluation of the curve. The current record date resolves to the
   * assessment above, which already carries the live macro series. Off the
   * bare curve February 2020 read risk appetite 51 where the record says 31,
   * so its confidence history and analog rank were both wrong by that gap.
   */
  const resolveGovernedAssessment = (recordDate: string) =>
    recordDate === treasury.record_date
      ? assessment
      : deps.findTimeMachineGovernedAssessment(recordDate, thresholds);
  const confidenceHistory = deps.buildWeeklyConfidenceSeries({
    snapshots: timeMachineSnapshots.map(({ year: _year, month: _month, ...snapshot }) => snapshot),
    currentSnapshot: treasury,
    thresholds,
    asOf: treasury.record_date,
    window: 8,
    resolveGovernedAssessment,
  });
  const confidenceTrend = deps.classifyConfidenceTrend(confidenceHistory);
  const historicalAnalogs = deps.buildHistoricalAnalogs({
    current: assessment,
    snapshots: timeMachineSnapshots
      .filter((snapshot) => new Date(snapshot.record_date).getTime() <= new Date(treasury.record_date).getTime())
      .map(({ year: _year, month: _month, ...snapshot }) => snapshot),
    thresholds,
    currentTrendDirection: reportDynamics.directionLabel,
    resolveGovernedAssessment,
  });
  const actionNowShort = buildWeekActionNow({ assessment, reportDynamics, actionStripItems }, deps.buildActionNowShort);
  // A threshold, not a playbook "stop" item. This read stopItems[0], so the
  // guardrail slot on the trust and evidence pages carried lines like
  // "Over-engineering before demand proves out" under "Pause if:".
  const guardrailThreshold = actionStripItems[0]?.triggerThreshold ?? stopItems[0];
  /* What would change the guidance, the hold's condition on a held week
     (`buildWeekCallChangesIf`): /trust, /signals, /resolve and the frozen record
     print it under "Conditions change if". */
  const flipThreshold = buildWeekCallChangesIf(assessment, deps.buildFlipThreshold);
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
    /** The previous month-end as a comparison, for the conditions map's month-end path; null with no month-end before this reading. */
    monthEndComparison: monthEndComparison
      ? { comparedWith: monthEndComparison.comparedWith, movement: monthEndComparison.movement }
      : null,
    macroProvenance,
    macroSeries: assessmentMacroSeries,
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
}: BuildFallbackReportDataArgs): Awaited<ReturnType<typeof loadReportDataUncachedInternal>> & {
  stale: true;
  lastCachedTimestamp: string;
} => {
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
  // Same policy as the primary path: a historical replay resolves against the
  // governed walk, which needs no network — exactly what a degraded read wants.
  const assessment = (historicalSelection
    ? deps.findTimeMachineGovernedAssessment(fallbackTreasury.record_date, thresholds)
    : null) ?? deps.evaluateRegime(fallbackTreasury, thresholds, []);
  const liveAssessment = deps.evaluateRegime(fallbackTreasury, thresholds, []);
  const sensors = deps.buildSensorReadings(fallbackTreasury);
  const recordDateLabel = deps.formatDateUTC(fallbackTreasury.record_date);
  const weeklyRecordDate = deps.resolveWeekEndingIsoDateUTC(fallbackTreasury.record_date);
  const weeklyRecordDateLabel = deps.formatWeekEndingUTC(fallbackTreasury.record_date);
  const fetchedAtLabel = deps.formatTimestampUTC(fallbackTreasury.fetched_at);
  const ageLabel = deps.formatAgeHours(fallbackTreasury.fetched_at, now);
  const { playbook, startItems, stopItems, actionStripItems } = deps.buildGuidanceBundleFromAssessment(assessment);

  /* The fallback report has no previous reading behind it at all, so it claims
     no direction. It said "stable" until 2026-09-17, which is how a degraded
     read published "Conditions held steady this week" to the homepage. */
  const fallbackReportDynamics: ReportDynamics = {
    changedSignals: [],
    anomalySignals: [],
    totalSignalChanges: 0,
    regimeChanged: false,
    directionLabel: "unavailable",
  };
  const actionNowShort = buildWeekActionNow(
    { assessment, reportDynamics: fallbackReportDynamics, actionStripItems },
    deps.buildActionNowShort,
  );
  // A threshold, not a playbook "stop" item. This read stopItems[0], so the
  // guardrail slot on the trust and evidence pages carried lines like
  // "Over-engineering before demand proves out" under "Pause if:".
  const guardrailThreshold = actionStripItems[0]?.triggerThreshold ?? stopItems[0];
  /* What would change the guidance, the hold's condition on a held week
     (`buildWeekCallChangesIf`): /trust, /signals, /resolve and the frozen record
     print it under "Conditions change if". */
  const flipThreshold = buildWeekCallChangesIf(assessment, deps.buildFlipThreshold);
  const reportEvidenceItems = deps.buildReportEvidenceItems({
    reportDynamics: fallbackReportDynamics,
    assessment,
    lastUpdated: fallbackTreasury.record_date,
  });
  const sourceHealth = deps.buildSourceHealthRows({
    treasury: fallbackTreasury,
    macroSeries: [],
    macroStatusLabel: PROVENANCE_FALLBACK_STATUS.unavailable,
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
      statusLabel: PROVENANCE_CATALOG_STATUS,
    },
    invalidHistoricalSelection,
    lastYearComparison: null,
    liveAssessment,
    liveTreasury: fallbackTreasury,
    monthEndComparison: null,
    macroProvenance: {
      sourceLabel: "FRED & US Treasury",
      sourceUrl: fallbackTreasury.source,
      recordDateLabel,
      timestampLabel: fetchedAtLabel,
      ageLabel,
      statusLabel: PROVENANCE_FALLBACK_STATUS.unavailable,
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
      statusLabel: PROVENANCE_FALLBACK_STATUS.cached,
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
