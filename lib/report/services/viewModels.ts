import type { PlaybookEntry } from "../../playbook";
import type { RegimeAssessment, RegimeTrend } from "../../regimeEngine";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../../types";
import type { LastYearComparison, ReportDynamics } from "./dynamics";
import type { TimeMachineRegimeEntry } from "../../timeMachine/timeMachineCache";
import type { TimeMachineRequest, TimeMachineSelection } from "../../timeMachine/timeMachineSelection";

export type ReportPostureEvidenceViewModel = {
  assessment: RegimeAssessment;
  statusLabel: string;
  reportDynamics: ReportDynamics;
  regimeTrend: RegimeTrend;
  sensors: SensorReading[];
  macroSeries: MacroSeriesReading[];
  treasury: TreasuryData;
  liveTreasury: TreasuryData;
  thresholds: RegimeAssessment["thresholds"];
};

export type ReportOperationsViewModel = {
  playbook: PlaybookEntry | null;
  startItems: string[];
  stopItems: string[];
  fenceItems: string[];
};

export type ReportHistoricalViewModel = {
  cacheCoverage: {
    earliest: string | null;
    latest: string | null;
  };
  cacheMonthsByYear: Record<number, number[]>;
  regimeSeries: TimeMachineRegimeEntry[];
  selectedMonth: number;
  selectedYear: number;
  historicalSelection: TimeMachineSelection | null;
  requestedSelection: TimeMachineRequest | null;
  invalidHistoricalSelection: boolean;
  historicalComparison: {
    then: {
      regime: RegimeAssessment["regime"];
      recordDate: string;
      baseRate: number;
      curveSlope: number | null;
      tightness: number;
      riskAppetite: number;
    };
    now: {
      regime: RegimeAssessment["regime"];
      recordDate: string;
      baseRate: number;
      curveSlope: number | null;
      tightness: number;
      riskAppetite: number;
    };
  } | null;
  lastYearComparison: LastYearComparison | null;
};

export type ReportProvenanceViewModel = {
  recordDateLabel: string;
  fetchedAtLabel: string;
  treasuryProvenance: {
    sourceLabel: string;
    sourceUrl?: string;
    recordDateLabel: string;
    timestampLabel: string;
    ageLabel: string;
    statusLabel: string;
  };
  macroProvenance: {
    sourceLabel: string;
    sourceUrl?: string;
    recordDateLabel: string;
    timestampLabel: string;
    ageLabel: string;
    statusLabel: string;
  };
  internalProvenance: {
    sourceLabel: string;
    recordDateLabel: string;
    timestampLabel: string;
    ageLabel: string;
    statusLabel: string;
  };
};

export type ReportViewModelBundle = {
  postureEvidence: ReportPostureEvidenceViewModel;
  operations: ReportOperationsViewModel;
  historical: ReportHistoricalViewModel;
  provenance: ReportProvenanceViewModel;
};

export const buildReportViewModelBundle = ({
  assessment,
  cacheCoverage,
  cacheMonthsByYear,
  fetchedAtLabel,
  fenceItems,
  historicalComparison,
  historicalSelection,
  internalProvenance,
  invalidHistoricalSelection,
  lastYearComparison,
  liveTreasury,
  macroProvenance,
  macroSeries,
  playbook,
  recordDateLabel,
  reportDynamics,
  requestedSelection,
  regimeSeries,
  regimeTrend,
  selectedMonth,
  selectedYear,
  sensors,
  startItems,
  statusLabel,
  stopItems,
  thresholds,
  treasury,
  treasuryProvenance,
}: {
  assessment: RegimeAssessment;
  cacheCoverage: {
    earliest: string | null;
    latest: string | null;
  };
  cacheMonthsByYear: Record<number, number[]>;
  fetchedAtLabel: string;
  fenceItems: string[];
  historicalComparison: ReportHistoricalViewModel["historicalComparison"];
  historicalSelection: TimeMachineSelection | null;
  internalProvenance: ReportProvenanceViewModel["internalProvenance"];
  invalidHistoricalSelection: boolean;
  lastYearComparison: LastYearComparison | null;
  liveTreasury: TreasuryData;
  macroProvenance: ReportProvenanceViewModel["macroProvenance"];
  macroSeries: MacroSeriesReading[];
  playbook: PlaybookEntry | null;
  recordDateLabel: string;
  reportDynamics: ReportDynamics;
  requestedSelection: TimeMachineRequest | null;
  regimeSeries: TimeMachineRegimeEntry[];
  regimeTrend: RegimeTrend;
  selectedMonth: number;
  selectedYear: number;
  sensors: SensorReading[];
  startItems: string[];
  statusLabel: string;
  stopItems: string[];
  thresholds: RegimeAssessment["thresholds"];
  treasury: TreasuryData;
  treasuryProvenance: ReportProvenanceViewModel["treasuryProvenance"];
}): ReportViewModelBundle => ({
  postureEvidence: {
    assessment,
    statusLabel,
    reportDynamics,
    regimeTrend,
    sensors,
    macroSeries,
    treasury,
    liveTreasury,
    thresholds,
  },
  operations: {
    playbook,
    startItems,
    stopItems,
    fenceItems,
  },
  historical: {
    cacheCoverage,
    cacheMonthsByYear,
    regimeSeries,
    selectedMonth,
    selectedYear,
    historicalSelection,
    requestedSelection,
    invalidHistoricalSelection,
    historicalComparison,
    lastYearComparison,
  },
  provenance: {
    recordDateLabel,
    fetchedAtLabel,
    treasuryProvenance,
    macroProvenance,
    internalProvenance,
  },
});
