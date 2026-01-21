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
  getPreviousTimeMachineSnapshot,
  getTimeMachineRegimeSeries,
} from "./timeMachineCache";
import { getSummaryArchive } from "./summaryArchive";
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

const formatAgeLabel = (value: string | null, now: Date) => {
  if (!value) {
    return "—";
  }
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) {
    return "—";
  }
  const hours = Math.max(0, Math.round((now.getTime() - timestamp.getTime()) / 36e5));
  return `${hours}h.`;
};

const formatScore = (value: number) => value.toFixed(0);

const buildRegimeAlert = (
  current: ReturnType<typeof evaluateRegime>,
  previous: ReturnType<typeof evaluateRegime>,
  currentRecordDate: string,
  previousRecordDate: string
) => {
  const tightnessThreshold = current.thresholds.tightnessRegime;
  const riskThreshold = current.thresholds.riskAppetiteRegime;
  const wasTight = previous.scores.tightness > tightnessThreshold;
  const isTight = current.scores.tightness > tightnessThreshold;
  const wasBrave = previous.scores.riskAppetite > riskThreshold;
  const isBrave = current.scores.riskAppetite > riskThreshold;
  const regimeChanged = current.regime !== previous.regime;
  const thresholdCrossed = wasTight !== isTight || wasBrave !== isBrave;
  const reasons: string[] = [];

  if (!regimeChanged && !thresholdCrossed) {
    return null;
  }

  if (wasTight !== isTight) {
    reasons.push(
      `Tightness moved ${isTight ? "above" : "below"} ${formatScore(tightnessThreshold)}.`
    );
  }
  if (wasBrave !== isBrave) {
    reasons.push(
      `Risk appetite moved ${isBrave ? "above" : "below"} ${formatScore(riskThreshold)}.`
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      `Market climate shifted as tightness (${formatScore(previous.scores.tightness)} → ${formatScore(current.scores.tightness)}) ` +
        `and risk appetite (${formatScore(previous.scores.riskAppetite)} → ${formatScore(current.scores.riskAppetite)}) moved across boundaries.`
    );
  }

  return {
    changed: regimeChanged,
    currentRegime: current.regime,
    previousRegime: previous.regime,
    currentRecordDate,
    previousRecordDate,
    reasons,
    summary: `Market climate moved from ${previous.regime} to ${current.regime}.`,
  };
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
  const summaryArchive = getSummaryArchive();
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const thresholds = parseThresholdsFromSearchParams(searchParams);
  const regimeSeries = getTimeMachineRegimeSeries(24, thresholds);
  const treasury = await treasuryPromise;
  const liveTreasury = liveTreasuryPromise ? await liveTreasuryPromise : treasury;
  const recordDateLabel = formatDateValue(treasury.record_date);
  const fetchedAtLabel = formatTimestampValue(treasury.fetched_at);
  const treasuryAgeLabel = formatAgeLabel(treasury.fetched_at, now);
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
    sourceLabel: "US Treasury Fiscal Data API",
    sourceUrl: treasury.source,
    recordDateLabel,
    timestampLabel: fetchedAtLabel,
    ageLabel: treasuryAgeLabel,
    statusLabel: confidenceLabel,
  };
  const macroTimestamp = macroSeries[0]?.fetched_at ?? treasury.fetched_at;
  const macroRecordDate = macroSeries[0]?.record_date ?? treasury.record_date;
  const macroAgeLabel = formatAgeLabel(macroTimestamp, now);
  const macroProvenance = {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: macroSeries[0]?.sourceUrl,
    recordDateLabel: formatDateValue(macroRecordDate),
    timestampLabel: formatTimestampValue(macroTimestamp),
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
