import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegime } from "../lib/regimeEngine";
import { buildLastYearComparison, buildReportDynamics } from "../lib/report/reportData";
import type { TreasuryData } from "../lib/types";

const makeAssessment = ({
  tightness,
  riskAppetite,
  baseRate,
  curveSlope,
  regime = "VOLATILE",
}: {
  tightness: number;
  riskAppetite: number;
  baseRate: number;
  curveSlope: number;
  regime?: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";
}) =>
  ({
    regime,
    scores: {
      tightness,
      riskAppetite,
      baseRate,
      curveSlope,
    },
  }) as ReturnType<typeof evaluateRegime>;

const makeTreasury = (
  record_date: string,
  oneMonth: number,
  twoYear: number,
  tenYear: number
): TreasuryData => ({
  source: "US Treasury",
  record_date,
  fetched_at: `${record_date}T12:00:00Z`,
  isLive: false,
  yields: {
    oneMonth,
    twoYear,
    tenYear,
  },
});

describe("buildLastYearComparison", () => {
  it("maps prior and current assessments into a comparable shape", () => {
    const priorAssessment = evaluateRegime(makeTreasury("2024-02-29", 5.1, 4.8, 4.5));
    const currentAssessment = evaluateRegime(makeTreasury("2025-02-28", 4.2, 4.1, 4.2));

    const comparison = buildLastYearComparison({
      prior: priorAssessment,
      priorRecordDate: "2024-02-29",
      current: currentAssessment,
      currentRecordDate: "2025-02-28",
    });

    assert.equal(comparison.prior.recordDate, "2024-02-29");
    assert.equal(comparison.current.recordDate, "2025-02-28");
    assert.equal(comparison.prior.regime, priorAssessment.regime);
    assert.equal(comparison.current.regime, currentAssessment.regime);
    assert.equal(comparison.prior.tightness, priorAssessment.scores.tightness);
    assert.equal(comparison.current.riskAppetite, currentAssessment.scores.riskAppetite);
  });
});

describe("buildReportDynamics", () => {
  it("treats risk-appetite increases as improving moves", () => {
    const previousAssessment = makeAssessment({
      tightness: 0,
      riskAppetite: 0,
      baseRate: 0,
      curveSlope: 0,
    });
    const currentAssessment = makeAssessment({
      tightness: 0,
      riskAppetite: 0.2,
      baseRate: 0,
      curveSlope: 0,
    });

    const reportDynamics = buildReportDynamics({
      current: currentAssessment,
      previous: previousAssessment,
    });

    assert.equal(reportDynamics.totalSignalChanges, 1);
    assert.equal(reportDynamics.changedSignals[0]?.key, "riskAppetite");
    assert.equal(reportDynamics.directionLabel, "improving");
  });

  it("marks opposite-polarity signal changes as mixed", () => {
    const previousAssessment = makeAssessment({
      tightness: 0,
      riskAppetite: 0,
      baseRate: 0,
      curveSlope: 0,
    });
    const currentAssessment = makeAssessment({
      tightness: 0.2,
      riskAppetite: 0.2,
      baseRate: 0,
      curveSlope: 0,
    });

    const reportDynamics = buildReportDynamics({
      current: currentAssessment,
      previous: previousAssessment,
    });

    assert.equal(reportDynamics.totalSignalChanges, 2);
    assert.equal(reportDynamics.directionLabel, "mixed");
  });
});
