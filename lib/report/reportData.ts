/**
 * Shared loader for Whether Report pages.
 * Centralizes Treasury data fetching and formatting for multi-page layouts.
 */
import { fetchTreasuryData } from "../treasury/treasuryClient";
import { snapshotData } from "../snapshot";
import { buildSensorReadings } from "../sensors";
import { evaluateRegime } from "../regimeEngine";
import { getPlaybookGuidance } from "../playbook";
import {
  getLatestTimeMachineSnapshot,
  getTimeMachineCoverage,
  getTimeMachineMonthsByYear,
  getPreviousTimeMachineSnapshot,
  getTimeMachineRegimeSeries,
} from "../timeMachine/timeMachineCache";
import { getSummaryArchive } from "../summary/summaryArchive";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../timeMachine/timeMachineSelection";
import { macroSeries } from "../macroSnapshot";
import { parseThresholdsFromSearchParams } from "../thresholds";
import { formatAgeHours, formatDateUTC, formatTimestampUTC } from "../formatters";
import { buildRegimeAlert } from "./reportFormatting";

export type ReportSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

export const loadReportData = async (searchParams?: ReportSearchParams) => {
  const liveFetcher: typeof fetch = (input, init) =>
    fetch(input, { ...init, cache: "no-store" });
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
  const summaryArchive = getSummaryArchive();
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const thresholds = parseThresholdsFromSearchParams(searchParams);
  const regimeSeries = getTimeMachineRegimeSeries(24, thresholds);
  const [treasury, liveTreasury] = await Promise.all([
    treasuryPromise,
    liveTreasuryPromise ?? treasuryPromise,
  ]);
  const recordDateLabel = formatDateUTC(treasury.record_date);
  const fetchedAtLabel = formatTimestampUTC(treasury.fetched_at);
  const treasuryAgeLabel = formatAgeHours(treasury.fetched_at, now);
  const sensors = buildSensorReadings(treasury);
  const assessment = evaluateRegime(treasury, thresholds);
  const liveAssessment = historicalSelection ? evaluateRegime(liveTreasury, thresholds) : null;
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime);
  const fenceItems = assessment.constraints;
  const previousSnapshot = historicalSelection
    ? null
    : getPreviousTimeMachineSnapshot(treasury.record_date);
  const previousAssessment = previousSnapshot
    ? evaluateRegime(previousSnapshot, thresholds)
    : null;
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
    sourceLabel: "Whether internal backlog",
    recordDateLabel: "Static",
    timestampLabel: "Static catalog",
    ageLabel: "Static.",
    statusLabel: "Simulated (low)",
  };
  const statusLabel = confidenceLabel;
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
    regimeSeries,
    regimeAlert,
    selectedMonth,
    selectedYear,
    sensors,
    startItems,
    statusLabel,
    stopItems,
    thresholds,
    summaryArchive,
    treasury,
    treasuryProvenance,
  };
};
