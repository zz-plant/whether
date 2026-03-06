import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegime } from "../lib/regimeEngine";
import {
  buildLastYearComparison,
  buildReportDynamics,
  buildSnapshotFallbackTreasury,
} from "../lib/report/reportData";
import type { TreasuryData } from "../lib/types";

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
      scores: { tightness, riskAppetite, baseRate, curveSlope },
    }) as ReturnType<typeof evaluateRegime>;

  it("marks improving when favorable signal directions dominate", () => {
    const previous = makeAssessment({ tightness: 60, riskAppetite: 45, baseRate: 5, curveSlope: -0.5 });
    const current = makeAssessment({ tightness: 50, riskAppetite: 55, baseRate: 4, curveSlope: -0.2 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.equal(dynamics.directionLabel, "improving");
  });

  it("marks deteriorating when unfavorable signal directions dominate", () => {
    const previous = makeAssessment({ tightness: 40, riskAppetite: 55, baseRate: 4, curveSlope: 0.2 });
    const current = makeAssessment({ tightness: 55, riskAppetite: 40, baseRate: 5, curveSlope: -0.4 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.equal(dynamics.directionLabel, "deteriorating");
  });

  it("marks mixed when improvements and deteriorations are both present", () => {
    const previous = makeAssessment({ tightness: 50, riskAppetite: 50, baseRate: 4, curveSlope: 0.1 });
    const current = makeAssessment({ tightness: 45, riskAppetite: 40, baseRate: 4.5, curveSlope: 0.2 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.equal(dynamics.directionLabel, "mixed");
  });
});

describe("buildSnapshotFallbackTreasury", () => {
  it("adds fallback markers when snapshot payload has none", () => {
    const snapshot = makeTreasury("2025-01-31", 4.4, 4.2, 4.1);
    const now = new Date("2026-01-15T12:00:00.000Z");

    const fallback = buildSnapshotFallbackTreasury(snapshot, now);

    assert.equal(fallback.fallback_at, "2026-01-15T12:00:00.000Z");
    assert.equal(
      fallback.fallback_reason,
      "Report dependency outage: serving cached treasury snapshot.",
    );
  });

  it("preserves existing fallback markers from upstream payload", () => {
    const snapshot: TreasuryData = {
      ...makeTreasury("2025-01-31", 4.4, 4.2, 4.1),
      fallback_at: "2025-01-31T13:00:00.000Z",
      fallback_reason: "Upstream treasury timeout.",
    };

    const fallback = buildSnapshotFallbackTreasury(snapshot, new Date("2026-01-15T12:00:00.000Z"));

    assert.equal(fallback.fallback_at, "2025-01-31T13:00:00.000Z");
    assert.equal(fallback.fallback_reason, "Upstream treasury timeout.");
  });
});
