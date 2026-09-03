import type { TreasuryData } from "../types";
import type { RegimeAssessment, RegimeThresholds } from "../regimeEngine";
import {
  getLatestTimeMachineSnapshot,
  getTimeMachineCoverage,
  getTimeMachineMonthsByYear,
  getPreviousTimeMachineSnapshot,
  getTimeMachineRegimeSeries,
  getTimeMachineYieldCurveSeries,
  findTimeMachineSnapshot,
  DEFAULT_REGIME_SERIES_MONTHS,
  getTimeMachineSnapshots,
  type TimeMachineRegimeEntry,
  type TimeMachineYieldCurveEntry,
} from "../timeMachine/timeMachineCache";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../timeMachine/timeMachineSelection";
import { buildHistoricalAnalogs, buildLastYearComparison } from "./reportHistory";
import type { HistoricalAnalog, LastYearComparison, ReportDynamics } from "./reportDataTypes";

export type ReportSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

export type HistoricalStateResult = {
  historicalSelection: { asOf: string; month: number; year: number; banner: string } | null;
  requestedSelection: { month?: number; year?: number } | null;
  invalidHistoricalSelection: boolean;
  selectedMonth: number;
  selectedYear: number;
  cacheCoverage: { earliest: string | null; latest: string | null };
  cacheMonthsByYear: Record<number, number[]>;
  regimeSeries: TimeMachineRegimeEntry[];
  yieldCurveSeries: TimeMachineYieldCurveEntry[];
  timeMachineSnapshots: Array<TreasuryData & { year: number; month: number }>;
  previousSnapshot: TreasuryData | null;
  lastYearSnapshot: TreasuryData | null;
  historicalAnalogs: HistoricalAnalog[];
  lastYearComparison: LastYearComparison;
};

export const loadHistoricalState = ({
  searchParams,
  treasury,
  thresholds,
  assessment,
  reportDynamics,
  lastYearAssessment,
}: {
  searchParams?: ReportSearchParams;
  treasury: TreasuryData;
  thresholds: RegimeThresholds;
  assessment: RegimeAssessment;
  reportDynamics: ReportDynamics;
  previousAssessment: RegimeAssessment | null;
  lastYearAssessment: RegimeAssessment | null;
  evaluateRegimeFn: typeof import("../regimeEngine").evaluateRegime;
}): HistoricalStateResult => {
  const historicalSelection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const now = new Date();
  const latestCache = getLatestTimeMachineSnapshot();
  const defaultMonth = latestCache?.month ?? now.getUTCMonth() + 1;
  const defaultYear = latestCache?.year ?? now.getUTCFullYear();
  const cacheCoverage = getTimeMachineCoverage();
  const cacheMonthsByYear = getTimeMachineMonthsByYear();
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;

  const regimeSeries = getTimeMachineRegimeSeries(DEFAULT_REGIME_SERIES_MONTHS, thresholds, historicalSelection?.asOf);
  const yieldCurveSeries = getTimeMachineYieldCurveSeries(240, historicalSelection?.asOf);
  const timeMachineSnapshots = getTimeMachineSnapshots();

  const previousSnapshot = getPreviousTimeMachineSnapshot(treasury.record_date);

  const recordDate = new Date(treasury.record_date);
  const comparisonDate = new Date(treasury.record_date);
  comparisonDate.setUTCFullYear(recordDate.getUTCFullYear() - 1);
  const lastYearSnapshot = findTimeMachineSnapshot(comparisonDate.toISOString());

  const historicalAnalogs = buildHistoricalAnalogs({
    current: assessment,
    snapshots: timeMachineSnapshots,
    thresholds,
    currentTrendDirection: reportDynamics.directionLabel,
  });

  const lastYearComparison: LastYearComparison = lastYearAssessment && lastYearSnapshot
    ? buildLastYearComparison({
        current: assessment,
        currentRecordDate: treasury.record_date,
        prior: lastYearAssessment,
        priorRecordDate: lastYearSnapshot.record_date,
      })
    : {
        current: {
          recordDate: treasury.record_date,
          regime: assessment.regime,
          tightness: assessment.scores.tightness,
          riskAppetite: assessment.scores.riskAppetite,
          curveSlope: assessment.scores.curveSlope,
          baseRate: assessment.scores.baseRate,
        },
        prior: {
          recordDate: treasury.record_date,
          regime: assessment.regime,
          tightness: assessment.scores.tightness,
          riskAppetite: assessment.scores.riskAppetite,
          curveSlope: assessment.scores.curveSlope,
          baseRate: assessment.scores.baseRate,
        },
      };

  return {
    historicalSelection,
    requestedSelection,
    invalidHistoricalSelection,
    selectedMonth,
    selectedYear,
    cacheCoverage,
    cacheMonthsByYear,
    regimeSeries,
    yieldCurveSeries,
    timeMachineSnapshots,
    previousSnapshot,
    lastYearSnapshot,
    historicalAnalogs,
    lastYearComparison,
  };
};
