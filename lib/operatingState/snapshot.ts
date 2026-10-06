import type { MacroSeriesReading, TreasuryData } from "../types";
import { evaluateRegime, type RegimeThresholds } from "../regimeEngine";
import type { RegimeMachineSnapshot } from "../regimeStateMachine";
import { buildWeeklyCallContract } from "../report/weeklyCallContract";
import { buildHomeBriefModel } from "../report/homeBriefModel";
import { buildGuidanceBundleFromAssessment, buildReportDynamics } from "../report/reportEvidence";
import { buildSensorReadings } from "../sensors";
import { formatAgeHours, formatDateUTC, formatTimestampUTC, formatWeekEndingUTC } from "../formatters";
import type { OperatingSnapshot } from "./types";

export const hashOperatingInputs = (treasury: TreasuryData, macroSeries: MacroSeriesReading[]): string => {
  const yieldsKey = [
    treasury.yields.oneMonth,
    treasury.yields.threeMonth,
    treasury.yields.twoYear,
    treasury.yields.tenYear,
  ].map((v) => (typeof v === "number" ? v.toFixed(3) : "null")).join(",");

  const macroKey = macroSeries
    .map((s) => `${s.id}:${typeof s.value === "number" ? s.value.toFixed(3) : "null"}`)
    .sort()
    .join(";");

  const raw = `${treasury.record_date}|${yieldsKey}|${macroKey}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
};

export const buildOperatingSnapshot = ({
  treasury,
  macroSeries,
  thresholds,
  previousMachineState = null,
  now = new Date(),
}: {
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  thresholds?: Partial<RegimeThresholds>;
  previousMachineState?: RegimeMachineSnapshot | null;
  now?: Date;
}): OperatingSnapshot => {
  const assessment = evaluateRegime(treasury, thresholds, macroSeries, previousMachineState, {
    baseRateHistory: treasury.oneMonthHistory,
  });
  const machineState = assessment.regimeTransition?.snapshot ?? {
    committedState: assessment.regime,
    pendingState: null,
    pendingCount: 0,
    lastSignals: {
      tightness: assessment.scores.tightness,
      riskAppetite: assessment.scores.riskAppetite,
    },
  };

  const inputHash = hashOperatingInputs(treasury, macroSeries);
  const recordDate = treasury.record_date;
  const epoch = now.toISOString();
  const id = `op_${recordDate}_${inputHash}`;

  const reportDynamics = buildReportDynamics({ current: assessment, previous: null });
  const sensors = buildSensorReadings(treasury);
  const { startItems, stopItems, actionStripItems } = buildGuidanceBundleFromAssessment(assessment);

  const homeBriefModel = buildHomeBriefModel({
    assessment,
    reportDynamics,
    macroSeries,
    sensors,
    startItems,
    stopItems,
    actionStripItems,
    regimeAlert: null,
    asOf: treasury.fetched_at,
    recordDateLabel: formatDateUTC(recordDate),
    weeklyRecordDateLabel: formatWeekEndingUTC(recordDate),
    sourceStatusLabel: treasury.isLive ? "Live" : "Cached",
  });

  const weeklyCall = buildWeeklyCallContract({
    assessment,
    homeBriefModel,
  });

  const treasuryAgeHours = Number.parseFloat(formatAgeHours(treasury.fetched_at, now)) || 0;
  const macroAgeHours = macroSeries.length > 0
    ? Math.max(...macroSeries.map((s) => Number.parseFloat(formatAgeHours(s.fetched_at, now)) || 0))
    : treasuryAgeHours;

  const freshnessStatus = treasury.isLive ? "fresh" : "fallback";

  const sourceSnapshotIds = [
    `treasury:${recordDate}`,
    ...macroSeries.map((s) => `${s.id}:${s.record_date}`),
  ];

  return {
    id,
    schemaVersion: 2,
    epoch,
    recordDate,
    inputHash,
    sourceSnapshotIds,
    treasury,
    macroSeries,
    assessment,
    weeklyCall,
    machineState,
    provenance: {
      sourceLabel: treasury.isLive ? "Federal Reserve Economic Data (FRED)" : "Canonical snapshot (FRED)",
      sourceUrl: treasury.source,
      recordDateLabel: formatDateUTC(recordDate),
      timestampLabel: formatTimestampUTC(treasury.fetched_at),
      ageLabel: formatAgeHours(treasury.fetched_at, now),
      statusLabel: treasury.isLive ? "Live (high confidence)" : "Canonical snapshot (high confidence)",
      isLive: treasury.isLive,
    },
    freshness: {
      treasuryAgeHours,
      macroAgeHours,
      status: freshnessStatus,
    },
  };
};
