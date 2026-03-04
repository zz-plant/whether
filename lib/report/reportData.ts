/**
 * Shared loader for Whether Report pages.
 * Centralizes Treasury data fetching and formatting for multi-page layouts.
 */
import { formatAgeHours, formatDateUTC, formatTimestampUTC } from "../formatters";
import { deriveRegimeTrend, evaluateRegime } from "../regimeEngine";
import { snapshotData } from "../snapshot";
import { buildSensorReadings } from "../sensors";
import { getTimeMachineCoverage, getTimeMachineMonthsByYear } from "../timeMachine/timeMachineCache";
import { parseTimeMachineRequest, resolveTimeMachineSelection } from "../timeMachine/timeMachineSelection";
import { buildGuidanceContext } from "./services/guidanceAssembler";
import { loadReportInputs, resolveReportSelectionContext } from "./services/inputLoader";
import { buildReportProvenance } from "./services/provenanceBuilder";
import { buildRegimeContext } from "./services/regimeAssembler";
import { buildReportViewModelBundle } from "./services/viewModels";
import { assembleReportViewModel } from "./services/viewModelAssembler";
import type { ReportSearchParams } from "./services/reportDataTypes";

export type { ReportSearchParams };
export {
  buildLastYearComparison,
  buildReportDynamics,
  isImprovingSignalDelta,
  signalDeltaImprovesWhen,
} from "./services/dynamics";
export type { LastYearComparison, ReportDynamics } from "./services/dynamics";

const loadReportDataUncached = async (searchParams?: ReportSearchParams) => {
  const now = new Date();
  const loadedInputs = await loadReportInputs(searchParams, now);
  const regimeContext = buildRegimeContext({
    historicalSelection: loadedInputs.historicalSelection,
    liveTreasury: loadedInputs.liveTreasury,
    macroSeries: loadedInputs.macroSeries,
    thresholds: loadedInputs.thresholds,
    treasury: loadedInputs.treasury,
  });
  const guidanceContext = buildGuidanceContext(regimeContext.assessment);
  const provenanceContext = buildReportProvenance({
    historicalSelection: loadedInputs.historicalSelection,
    macroSeries: loadedInputs.macroSeries,
    now,
    treasury: loadedInputs.treasury,
  });
  const viewModels = buildReportViewModelBundle({
    assessment: regimeContext.assessment,
    cacheCoverage: loadedInputs.cacheCoverage,
    cacheMonthsByYear: loadedInputs.cacheMonthsByYear,
    fetchedAtLabel: provenanceContext.fetchedAtLabel,
    fenceItems: guidanceContext.fenceItems,
    historicalComparison: regimeContext.historicalComparison,
    historicalSelection: loadedInputs.historicalSelection,
    internalProvenance: provenanceContext.internalProvenance,
    invalidHistoricalSelection: loadedInputs.invalidHistoricalSelection,
    lastYearComparison: regimeContext.lastYearComparison,
    liveTreasury: loadedInputs.liveTreasury,
    macroProvenance: provenanceContext.macroProvenance,
    macroSeries: loadedInputs.macroSeries,
    playbook: guidanceContext.playbook,
    recordDateLabel: provenanceContext.recordDateLabel,
    reportDynamics: regimeContext.reportDynamics,
    requestedSelection: loadedInputs.requestedSelection,
    regimeSeries: loadedInputs.regimeSeries,
    regimeTrend: regimeContext.regimeTrend,
    selectedMonth: loadedInputs.selectedMonth,
    selectedYear: loadedInputs.selectedYear,
    sensors: regimeContext.sensors,
    startItems: guidanceContext.startItems,
    statusLabel: guidanceContext.statusLabel,
    stopItems: guidanceContext.stopItems,
    thresholds: loadedInputs.thresholds,
    treasury: loadedInputs.treasury,
    treasuryProvenance: provenanceContext.treasuryProvenance,
  });

  return assembleReportViewModel({
    assessment: regimeContext.assessment,
    cacheCoverage: loadedInputs.cacheCoverage,
    cacheMonthsByYear: loadedInputs.cacheMonthsByYear,
    fetchedAtLabel: provenanceContext.fetchedAtLabel,
    fenceItems: guidanceContext.fenceItems,
    historicalComparison: regimeContext.historicalComparison,
    historicalSelection: loadedInputs.historicalSelection,
    internalProvenance: provenanceContext.internalProvenance,
    invalidHistoricalSelection: loadedInputs.invalidHistoricalSelection,
    lastYearComparison: regimeContext.lastYearComparison,
    liveAssessment: regimeContext.liveAssessment,
    liveTreasury: loadedInputs.liveTreasury,
    macroProvenance: provenanceContext.macroProvenance,
    macroSeries: loadedInputs.macroSeries,
    playbook: guidanceContext.playbook,
    recordDateLabel: provenanceContext.recordDateLabel,
    reportDynamics: regimeContext.reportDynamics,
    requestedSelection: loadedInputs.requestedSelection,
    regimeSeries: loadedInputs.regimeSeries,
    regimeAlert: regimeContext.regimeAlert,
    regimeTrend: regimeContext.regimeTrend,
    selectedMonth: loadedInputs.selectedMonth,
    selectedYear: loadedInputs.selectedYear,
    sensors: regimeContext.sensors,
    startItems: guidanceContext.startItems,
    statusLabel: guidanceContext.statusLabel,
    stopItems: guidanceContext.stopItems,
    thresholds: loadedInputs.thresholds,
    treasury: loadedInputs.treasury,
    treasuryProvenance: provenanceContext.treasuryProvenance,
    viewModels,
  });
};

const buildFallbackReportData = async (searchParams?: ReportSearchParams) => {
  const historicalSelection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const now = new Date();
  const selectionContext = resolveReportSelectionContext(searchParams, now);
  const treasury = {
    ...snapshotData,
    isLive: false,
    fallback_at: now.toISOString(),
    fallback_reason: "Home loader timeout — serving cached snapshot.",
  };
  const assessment = evaluateRegime(treasury, selectionContext.thresholds, []);
  const guidanceContext = buildGuidanceContext(assessment);
  const fetchedAtLabel = formatTimestampUTC(treasury.fetched_at);
  const recordDateLabel = formatDateUTC(treasury.record_date);
  const treasuryProvenance = {
    sourceLabel: "Federal Reserve Economic Data (FRED)",
    sourceUrl: treasury.source,
    recordDateLabel,
    timestampLabel: fetchedAtLabel,
    ageLabel: formatAgeHours(treasury.fetched_at, now),
    statusLabel: "Cached snapshot",
  };
  const macroProvenance = {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: treasury.source,
    recordDateLabel,
    timestampLabel: fetchedAtLabel,
    ageLabel: formatAgeHours(treasury.fetched_at, now),
    statusLabel: "Cached (medium)",
  };
  const internalProvenance = {
    sourceLabel: "Whether curated playbook catalog",
    recordDateLabel: "Static",
    timestampLabel: "Static catalog",
    ageLabel: "Static.",
    statusLabel: "Simulated (low)",
  };
  const viewModels = buildReportViewModelBundle({
    assessment,
    cacheCoverage: getTimeMachineCoverage(),
    cacheMonthsByYear: getTimeMachineMonthsByYear(),
    fetchedAtLabel,
    fenceItems: guidanceContext.fenceItems,
    historicalComparison: null,
    historicalSelection,
    internalProvenance,
    invalidHistoricalSelection: Boolean(requestedSelection && !historicalSelection),
    lastYearComparison: null,
    liveTreasury: treasury,
    macroProvenance,
    macroSeries: [],
    playbook: guidanceContext.playbook,
    recordDateLabel,
    reportDynamics: {
      changedSignals: [],
      totalSignalChanges: 0,
      regimeChanged: false,
      directionLabel: "stable" as const,
    },
    requestedSelection,
    regimeSeries: selectionContext.regimeSeries,
    regimeTrend: deriveRegimeTrend(null, assessment),
    selectedMonth: requestedSelection?.month ?? now.getUTCMonth() + 1,
    selectedYear: requestedSelection?.year ?? now.getUTCFullYear(),
    sensors: buildSensorReadings(treasury),
    startItems: guidanceContext.startItems,
    statusLabel: guidanceContext.statusLabel,
    stopItems: guidanceContext.stopItems,
    thresholds: selectionContext.thresholds,
    treasury,
    treasuryProvenance,
  });

  return assembleReportViewModel({
    assessment,
    cacheCoverage: getTimeMachineCoverage(),
    cacheMonthsByYear: getTimeMachineMonthsByYear(),
    fetchedAtLabel,
    fenceItems: guidanceContext.fenceItems,
    historicalComparison: null,
    historicalSelection,
    internalProvenance,
    invalidHistoricalSelection: Boolean(requestedSelection && !historicalSelection),
    lastYearComparison: null,
    liveAssessment: null,
    liveTreasury: treasury,
    macroProvenance,
    macroSeries: [],
    playbook: guidanceContext.playbook,
    recordDateLabel,
    reportDynamics: {
      changedSignals: [],
      totalSignalChanges: 0,
      regimeChanged: false,
      directionLabel: "stable" as const,
    },
    requestedSelection,
    regimeSeries: selectionContext.regimeSeries,
    regimeAlert: null,
    regimeTrend: deriveRegimeTrend(null, assessment),
    selectedMonth: requestedSelection?.month ?? now.getUTCMonth() + 1,
    selectedYear: requestedSelection?.year ?? now.getUTCFullYear(),
    sensors: buildSensorReadings(treasury),
    startItems: guidanceContext.startItems,
    statusLabel: guidanceContext.statusLabel,
    stopItems: guidanceContext.stopItems,
    thresholds: selectionContext.thresholds,
    treasury,
    treasuryProvenance,
    viewModels,
  });
};

export const loadReportDataWithTimeout = async (
  searchParams?: ReportSearchParams,
  timeoutMs = 1_000,
) => {
  const timed = new Promise<Awaited<ReturnType<typeof loadReportDataUncached>> | null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });
  const liveData = await Promise.race([loadReportData(searchParams), timed]);
  if (liveData) {
    return { ...liveData, usedTimeoutFallback: false as const };
  }
  const fallback = await buildFallbackReportData(searchParams);
  return { ...fallback, usedTimeoutFallback: true as const };
};

let defaultReportDataPromise: Promise<Awaited<ReturnType<typeof loadReportDataUncached>>> | null = null;

export const loadReportData = (searchParams?: ReportSearchParams) => {
  if (searchParams) {
    return loadReportDataUncached(searchParams);
  }

  if (!defaultReportDataPromise) {
    defaultReportDataPromise = loadReportDataUncached();
  }

  return defaultReportDataPromise;
};
