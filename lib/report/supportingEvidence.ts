import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import type { RegimeAssessment, RegimeThresholds } from "../regimeEngine";
import { buildSensorReadings } from "../sensors";
import { buildReportDynamics, buildReportEvidenceItems } from "./reportEvidence";
import { buildWeeklyConfidenceSeries, classifyConfidenceTrend } from "./reportConfidence";
import { buildSourceHealthRows, getLatestParseableTimestamp, type SourceHealthRow } from "./sourceHealth";
import { formatAgeHours, formatDateUTC, formatTimestampUTC } from "../formatters";
import type { ConfidenceTrendFraming, ReportDynamics, ReportEvidenceItem, WeeklyConfidencePoint } from "./reportDataTypes";

export type SupportingEvidenceResult = {
  sensors: SensorReading[];
  reportDynamics: ReportDynamics;
  confidenceSeries: WeeklyConfidencePoint[];
  confidenceTrendFraming: ConfidenceTrendFraming;
  evidenceItems: ReportEvidenceItem[];
  sourceHealthRows: SourceHealthRow[];
  treasuryProvenance: {
    sourceLabel: string;
    sourceUrl: string;
    recordDateLabel: string;
    timestampLabel: string;
    ageLabel: string;
    statusLabel: string;
  };
  macroProvenance: {
    sourceLabel: string;
    sourceUrl: string | undefined;
    recordDateLabel: string;
    timestampLabel: string;
    ageLabel: string;
    statusLabel: string;
  };
};

export const buildSupportingEvidence = ({
  treasury,
  macroSeries,
  assessment,
  previousAssessment,
  thresholds,
  now = new Date(),
  timeMachineSnapshots = [],
  isCanonical = false,
  isHistorical = false,
}: {
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  assessment: RegimeAssessment;
  previousAssessment: RegimeAssessment | null;
  thresholds: RegimeThresholds;
  now?: Date;
  timeMachineSnapshots?: TreasuryData[];
  isCanonical?: boolean;
  isHistorical?: boolean;
}): SupportingEvidenceResult => {
  const sensors = buildSensorReadings(treasury);
  const reportDynamics = buildReportDynamics({ current: assessment, previous: previousAssessment });

  const confidenceSeries = buildWeeklyConfidenceSeries({
    snapshots: timeMachineSnapshots,
    currentSnapshot: treasury,
    thresholds,
    asOf: treasury.fetched_at,
  });
  const confidenceTrendFraming = classifyConfidenceTrend(confidenceSeries);

  const freshestMacro = [...macroSeries]
    .filter((s) => typeof s.fetched_at === "string")
    .sort((a, b) => Date.parse(b.fetched_at) - Date.parse(a.fetched_at))[0];

  const macroTimestamp = getLatestParseableTimestamp(macroSeries.map((s) => s.fetched_at)) ?? treasury.fetched_at;
  const macroRecordDate = macroSeries[0]?.record_date ?? treasury.record_date;

  const confidenceLabel = isHistorical
    ? "Simulated (low)"
    : isCanonical
      ? "Canonical snapshot (high confidence)"
      : treasury.isLive
        ? "Live (high confidence)"
        : "Cached (medium)";

  const treasuryProvenance = {
    sourceLabel: isCanonical ? "Canonical ingestion (FRED)" : "Federal Reserve Economic Data (FRED)",
    sourceUrl: treasury.source,
    recordDateLabel: formatDateUTC(treasury.record_date),
    timestampLabel: formatTimestampUTC(treasury.fetched_at),
    ageLabel: formatAgeHours(treasury.fetched_at, now),
    statusLabel: confidenceLabel,
  };

  const macroProvenance = {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: freshestMacro?.sourceUrl ?? macroSeries[0]?.sourceUrl,
    recordDateLabel: formatDateUTC(macroRecordDate),
    timestampLabel: formatTimestampUTC(macroTimestamp),
    ageLabel: formatAgeHours(macroTimestamp, now),
    statusLabel: confidenceLabel,
  };

  const sourceHealthRows = buildSourceHealthRows({
    treasury,
    macroSeries,
    macroStatusLabel: confidenceLabel,
    now,
  });

  const evidenceItems = buildReportEvidenceItems({
    reportDynamics,
    assessment,
    lastUpdated: treasury.fetched_at,
  });

  return {
    sensors,
    reportDynamics,
    confidenceSeries,
    confidenceTrendFraming,
    evidenceItems,
    sourceHealthRows,
    treasuryProvenance,
    macroProvenance,
  };
};
