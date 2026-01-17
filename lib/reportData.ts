/**
 * Shared loader for Whether Report pages.
 * Centralizes Treasury data fetching and formatting for multi-page layouts.
 */
import { fetchTreasuryData } from "./treasuryClient";
import { snapshotData } from "./snapshot";
import { buildSensorReadings } from "./sensors";
import { evaluateRegime } from "./regimeEngine";
import { getPlaybookGuidance } from "./playbook";
import {
  getLatestTimeMachineSnapshot,
  getTimeMachineCoverage,
  getTimeMachineMonthsByYear,
} from "./timeMachineCache";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "./timeMachineSelection";
import { macroSeries } from "./macroSnapshot";
import { parseThresholdsFromSearchParams } from "./thresholds";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatDateValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatTimestampValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : timestampFormatter.format(date);
};

export type ReportSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

export const loadReportData = async (searchParams?: ReportSearchParams) => {
  const historicalSelection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const treasuryPromise = fetchTreasuryData({
    snapshotFallback: snapshotData,
    asOf: historicalSelection?.asOf,
  });
  const liveTreasuryPromise = historicalSelection
    ? fetchTreasuryData({ snapshotFallback: snapshotData })
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
  const treasury = await treasuryPromise;
  const liveTreasury = liveTreasuryPromise ? await liveTreasuryPromise : treasury;
  const recordDateLabel = formatDateValue(treasury.record_date);
  const fetchedAtLabel = formatTimestampValue(treasury.fetched_at);
  const sensors = buildSensorReadings(treasury);
  const assessment = evaluateRegime(treasury, thresholds);
  const liveAssessment = historicalSelection ? evaluateRegime(liveTreasury, thresholds) : null;
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime);
  const fenceItems = assessment.constraints;
  const treasuryProvenance = {
    sourceLabel: "US Treasury Fiscal Data API",
    sourceUrl: treasury.source,
    timestampLabel: fetchedAtLabel,
    statusLabel: treasury.isLive ? "Live" : "Offline",
  };
  const macroProvenance = {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: macroSeries[0]?.sourceUrl,
    timestampLabel: formatTimestampValue(macroSeries[0]?.fetched_at ?? treasury.fetched_at),
    statusLabel: macroSeries.some((signal) => signal.isLive) ? "Live" : "Offline",
  };
  const internalProvenance = {
    sourceLabel: "Whether internal backlog",
    timestampLabel: "Static catalog",
    statusLabel: "Offline",
  };
  const statusLabel = historicalSelection
    ? "Historical"
    : treasury.isLive
      ? "Live"
      : "Offline / Simulated";
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
    liveAssessment,
    liveTreasury,
    macroProvenance,
    macroSeries,
    playbook,
    recordDateLabel,
    requestedSelection,
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
