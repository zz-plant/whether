import { buildSensorReadings } from "../../sensors";
import { deriveRegimeTrend, evaluateRegime, type RegimeThresholds } from "../../regimeEngine";
import { findTimeMachineSnapshot, getPreviousTimeMachineSnapshot } from "../../timeMachine/timeMachineCache";
import type { TimeMachineSelection } from "../../timeMachine/timeMachineSelection";
import type { MacroSeriesReading, TreasuryData } from "../../types";
import { buildRegimeAlert } from "../reportFormatting";
import { buildLastYearComparison, buildReportDynamics } from "./dynamics";

export const buildRegimeContext = ({
  historicalSelection,
  liveTreasury,
  macroSeries,
  thresholds,
  treasury,
}: {
  historicalSelection: TimeMachineSelection | null;
  liveTreasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  thresholds: RegimeThresholds;
  treasury: TreasuryData;
}) => {
  const sensors = buildSensorReadings(treasury);
  const assessmentMacroSeries = historicalSelection ? [] : macroSeries;
  const assessment = evaluateRegime(treasury, thresholds, assessmentMacroSeries);
  const liveAssessment = historicalSelection ? evaluateRegime(liveTreasury, thresholds, macroSeries) : null;

  const previousSnapshot = historicalSelection ? null : getPreviousTimeMachineSnapshot(treasury.record_date);
  const recordDate = new Date(treasury.record_date);
  const comparisonDate = new Date(treasury.record_date);
  comparisonDate.setUTCFullYear(recordDate.getUTCFullYear() - 1);
  const lastYearSnapshot = findTimeMachineSnapshot(comparisonDate.toISOString());
  const previousAssessment = previousSnapshot ? evaluateRegime(previousSnapshot, thresholds) : null;
  const lastYearAssessment = lastYearSnapshot ? evaluateRegime(lastYearSnapshot, thresholds) : null;

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
      ? buildRegimeAlert(assessment, previousAssessment, treasury.record_date, previousSnapshot.record_date)
      : null;

  const reportDynamics = buildReportDynamics({
    current: assessment,
    previous: previousAssessment,
  });
  const regimeTrend = deriveRegimeTrend(previousAssessment, assessment);
  const lastYearComparison =
    lastYearSnapshot && lastYearAssessment
      ? buildLastYearComparison({
          current: assessment,
          currentRecordDate: treasury.record_date,
          prior: lastYearAssessment,
          priorRecordDate: lastYearSnapshot.record_date,
        })
      : null;

  return {
    assessment,
    historicalComparison,
    lastYearComparison,
    liveAssessment,
    previousAssessment,
    regimeAlert,
    regimeTrend,
    reportDynamics,
    sensors,
  };
};
