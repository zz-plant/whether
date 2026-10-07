import type { MacroSeriesReading, TreasuryData } from "../types";
import { ENGINE_VERSION, evaluateRegime, type RegimeThresholds } from "../regimeEngine";
import type { RegimeMachineSnapshot } from "../regimeStateMachine";
import { buildWeeklyCallContract } from "../report/weeklyCallContract";
import { buildHomeBriefModel } from "../report/homeBriefModel";
import { buildGuidanceBundleFromAssessment, buildReportDynamics, buildWeekActionNow } from "../report/reportEvidence";
import { resolveWeekComparison } from "../report/weekComparison";
import { buildRegimeAlert } from "../report/reportFormatting";
import { FRED_SOURCE_LABEL, PROVENANCE_STATUS } from "../report/provenanceStatus";
import { buildSensorReadings } from "../sensors";
import { formatAgeHours, formatDateUTC, formatTimestampUTC, formatWeekEndingUTC } from "../formatters";
import type { OperatingSnapshot } from "./types";

/**
 * The identity of what scored a snapshot: its record date, its inputs, and the
 * engine calibration that read them (`ENGINE_VERSION`), so a re-score of the
 * same inputs under a new calibration is stored as a new snapshot rather than
 * under the old one's key.
 *
 * Folding the version in changed every hash once, on the first refresh after
 * it landed (2026-10-06). That was traced before it shipped: the hash names the
 * snapshot (`id`), its per-reading KV key and a field in the ingest-pipeline
 * telemetry stream, and nothing compares it between runs — change detection
 * reads the regime, the alerts read the latest snapshot, and the per-reading
 * key has no reader — so the change re-keyed one write and nothing else.
 */
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

  const raw = `${ENGINE_VERSION}|${treasury.record_date}|${yieldsKey}|${macroKey}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
};

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Hours since a timestamp, from the timestamp; zero when it does not parse.
 * The freshness fields used to parse the display label back
 * (`Number.parseFloat(formatAgeHours(…))`), which drops the unit, so a reading
 * fetched six minutes ago ("6m.") stored 6 hours and a three-month-old one
 * ("3mo.") stored 3.
 */
const hoursSince = (timestamp: string, now: Date): number => {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? Math.max(0, now.getTime() - parsed) / MS_PER_HOUR : 0;
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

  /* Compared as the page compares the week, so the stored weekly call carries
     the week's direction (docs/claims-ledger.md). */
  const comparison = resolveWeekComparison(recordDate, assessment.thresholds);
  const reportDynamics = buildReportDynamics({
    current: assessment,
    previous: comparison?.reading ?? null,
    comparedWith: comparison?.comparedWith,
  });
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
    actionNowShort: buildWeekActionNow({ assessment, reportDynamics, actionStripItems }),
    /* From the same comparison, as the report loader builds it. This was null, so the
       stored call (`currentCall`, which every paste, the embed and the Monday sends
       print) took the stance rule's no-change branch on a week the conditions changed:
       "Favour releases that pay back quickly and can be rolled back." where the page's
       own model, the /api/decision memo and the frozen record said "Ship fixes and
       releases that pay back quickly; hold anything you could not reverse." */
    regimeAlert: comparison
      ? buildRegimeAlert(assessment, comparison.reading, recordDate, comparison.reading.recordDate)
      : null,
    asOf: treasury.fetched_at,
    recordDateLabel: formatDateUTC(recordDate),
    weeklyRecordDateLabel: formatWeekEndingUTC(recordDate),
    sourceStatusLabel: treasury.isLive ? "Live" : "Cached",
  });

  const weeklyCall = buildWeeklyCallContract({
    assessment,
    homeBriefModel,
  });

  const treasuryAgeHours = hoursSince(treasury.fetched_at, now);
  const macroAgeHours = macroSeries.length > 0
    ? Math.max(...macroSeries.map((s) => hoursSince(s.fetched_at, now)))
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
    /* The source is the publisher whether or not this read was live; `statusLabel` says
       which. Until 2026-10-07 a saved copy was sourced "Canonical snapshot (FRED)" and
       both sides claimed "(high confidence)", a figure nothing here computes and the
       published confidence often contradicts. A saved copy is the cached tier. */
    provenance: {
      sourceLabel: FRED_SOURCE_LABEL,
      sourceUrl: treasury.source,
      recordDateLabel: formatDateUTC(recordDate),
      timestampLabel: formatTimestampUTC(treasury.fetched_at),
      ageLabel: formatAgeHours(treasury.fetched_at, now),
      statusLabel: treasury.isLive ? PROVENANCE_STATUS.live : PROVENANCE_STATUS.cached,
      isLive: treasury.isLive,
    },
    freshness: {
      treasuryAgeHours,
      macroAgeHours,
      status: freshnessStatus,
    },
  };
};
