import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateRegime } from "../lib/regimeEngine";
import {
  buildLastYearComparison,
  buildReportDynamics,
  buildSnapshotFallbackTreasury,
  buildHistoricalAnalogs,
  buildFlipThreshold,
  buildReportEvidenceItems,
  buildWeeklyConfidenceSeries,
  classifyConfidenceTrend,
} from "../lib/report/reportData";
import type { TreasuryData } from "../lib/types";
import { resolveSectorKey } from "../lib/report/sectorSensitivity";

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

  it("orders changed signals by largest absolute movement", () => {
    const previous = makeAssessment({ tightness: 50, riskAppetite: 50, baseRate: 4, curveSlope: 0.1 });
    const current = makeAssessment({ tightness: 50.2, riskAppetite: 60, baseRate: 4.5, curveSlope: 0.15 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.deepEqual(
      dynamics.changedSignals.map((signal) => signal.key),
      ["riskAppetite", "baseRate", "tightness", "curveSlope"],
    );
  });

  it("flags extreme weekly shifts as anomalies instead of normal deltas", () => {
    const previous = makeAssessment({ tightness: 94, riskAppetite: 61, baseRate: 4, curveSlope: 0.2 });
    const current = makeAssessment({ tightness: 0, riskAppetite: 60, baseRate: 4.05, curveSlope: 0.21 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.equal(dynamics.changedSignals.some((signal) => signal.key === "tightness"), false);
    assert.equal(dynamics.anomalySignals.length, 1);
    assert.equal(dynamics.anomalySignals[0]?.key, "tightness");
    assert.match(dynamics.anomalySignals[0]?.reason ?? "", /sanity threshold/i);
  });
});

describe("buildReportEvidenceItems", () => {
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
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores: { tightness, riskAppetite, baseRate, curveSlope },
    }) as ReturnType<typeof evaluateRegime>;

  it("uses improving polarity for positive curve-slope deltas", () => {
    const reportDynamics = {
      changedSignals: [{ key: "curveSlope" as const, label: "Curve slope", delta: 0.3 }],
    } as ReturnType<typeof buildReportDynamics>;

    const items = buildReportEvidenceItems({
      reportDynamics,
      assessment: makeAssessment({ tightness: 45, riskAppetite: 55, baseRate: 4.5, curveSlope: 0.2 }),
      lastUpdated: "2025-02-01",
    });

    const curveSlopeItem = items.find((item) => item.key === "curveSlope");

    assert.match(curveSlopeItem?.immediateImplication ?? "", /incrementally safer/i);
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


describe("sector overlay key resolution", () => {
  it("maps supported sector query values", () => {
    assert.equal(resolveSectorKey("b2b-saas"), "b2b-saas");
    assert.equal(resolveSectorKey("consumer"), "consumer");
    assert.equal(resolveSectorKey("infrastructure"), "infrastructure");
    assert.equal(resolveSectorKey("fintech"), "fintech");
    assert.equal(resolveSectorKey("healthcare"), "healthcare");
    assert.equal(resolveSectorKey("ai-platforms"), "ai-platforms");
  });

  it("falls back to b2b-saas for unknown or empty sector values", () => {
    assert.equal(resolveSectorKey(undefined), "b2b-saas");
    assert.equal(resolveSectorKey(""), "b2b-saas");
    assert.equal(resolveSectorKey("unknown-sector"), "b2b-saas");
  });
});


describe("buildHistoricalAnalogs", () => {
  const makeSnapshot = (recordDate: string, oneMonth: number, twoYear: number, tenYear: number): TreasuryData => ({
    source: "US Treasury",
    record_date: recordDate,
    fetched_at: `${recordDate}T12:00:00Z`,
    isLive: false,
    yields: { oneMonth, twoYear, tenYear },
  });

  it("returns empty list when there is no historical window", () => {
    const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
    const current = evaluateRegime(makeSnapshot("2026-03-01", 4.2, 4.0, 4.3), thresholds);

    const analogs = buildHistoricalAnalogs({
      current,
      snapshots: [makeSnapshot("2026-03-01", 4.2, 4.0, 4.3)],
      thresholds,
      currentTrendDirection: "stable",
    });

    assert.deepEqual(analogs, []);
  });

  it("breaks score ties by most recent record date", () => {
    const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
    const snapshots = [
      makeSnapshot("2025-01-31", 4.3, 4.2, 4.4),
      makeSnapshot("2025-02-28", 4.3, 4.2, 4.4),
      makeSnapshot("2025-03-31", 4.3, 4.2, 4.4),
    ];
    const current = evaluateRegime(snapshots[2], thresholds);

    const analogs = buildHistoricalAnalogs({
      current,
      snapshots,
      thresholds,
      currentTrendDirection: "stable",
    });

    assert.equal(analogs[0]?.recordDate, "2025-02-28");
    assert.equal(analogs[1]?.recordDate, "2025-01-31");
  });

  it("keeps deterministic ordering across equivalent runs", () => {
    const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
    const snapshots = [
      makeSnapshot("2024-12-31", 4.5, 4.3, 4.5),
      makeSnapshot("2025-01-31", 4.4, 4.2, 4.4),
      makeSnapshot("2025-02-28", 4.3, 4.1, 4.3),
      makeSnapshot("2025-03-31", 4.2, 4.0, 4.2),
    ];
    const current = evaluateRegime(snapshots[3], thresholds);

    const first = buildHistoricalAnalogs({
      current,
      snapshots,
      thresholds,
      currentTrendDirection: "stable",
    }).map((item) => item.recordDate);
    const second = buildHistoricalAnalogs({
      current,
      snapshots,
      thresholds,
      currentTrendDirection: "stable",
    }).map((item) => item.recordDate);

    assert.deepEqual(first, second);
  });
});



describe("weekly confidence history", () => {
  const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };

  it("includes the current report snapshot when it is newer than cached history", () => {
    const snapshots = [
      makeTreasury("2025-01-03", 5.2, 4.8, 4.4),
      makeTreasury("2025-01-10", 5.1, 4.7, 4.4),
      makeTreasury("2025-01-17", 5.0, 4.6, 4.4),
    ];

    const series = buildWeeklyConfidenceSeries({
      snapshots,
      currentSnapshot: makeTreasury("2025-01-24", 4.8, 4.4, 4.4),
      thresholds,
      asOf: "2025-01-24",
      window: 8,
    });

    assert.equal(series.at(-1)?.recordDate, "2025-01-24");
    assert.equal(series.at(-1)?.isMissing, false);
  });

  it("returns the last eight weekly points and injects missing-week markers", () => {
    const snapshots = [
      makeTreasury("2025-01-03", 5.2, 4.8, 4.4),
      makeTreasury("2025-01-10", 5.1, 4.7, 4.4),
      makeTreasury("2025-01-31", 5.0, 4.6, 4.4),
      makeTreasury("2025-02-07", 4.9, 4.5, 4.4),
      makeTreasury("2025-02-14", 4.8, 4.4, 4.4),
      makeTreasury("2025-02-21", 4.7, 4.3, 4.4),
      makeTreasury("2025-02-28", 4.6, 4.2, 4.4),
      makeTreasury("2025-03-07", 4.5, 4.1, 4.4),
      makeTreasury("2025-03-14", 4.4, 4.0, 4.4),
    ];

    const series = buildWeeklyConfidenceSeries({
      snapshots,
      thresholds,
      asOf: "2025-03-14",
      window: 8,
    });

    assert.equal(series.length, 8);
    assert.equal(series.at(-1)?.recordDate, "2025-03-14");
    assert.equal(series.some((point) => point.recordDate === "2025-02-07"), true);

    const withGap = buildWeeklyConfidenceSeries({
      snapshots: [
        makeTreasury("2025-01-03", 5.2, 4.8, 4.4),
        makeTreasury("2025-01-24", 5.1, 4.7, 4.4),
        makeTreasury("2025-01-31", 5.0, 4.6, 4.4),
      ],
      thresholds,
      asOf: "2025-01-31",
      window: 8,
    });

    assert.equal(withGap.some((point) => point.isMissing), true);
    const missing = withGap.find((point) => point.isMissing);
    assert.equal(missing?.confidencePercent, null);
  });

  it("classifies confidence trend from slope and volatility", () => {
    assert.equal(
      classifyConfidenceTrend([
        { recordDate: "2025-01-03", confidencePercent: 55, isMissing: false },
        { recordDate: "2025-01-10", confidencePercent: 59, isMissing: false },
        { recordDate: "2025-01-17", confidencePercent: 63, isMissing: false },
      ]),
      "strengthening",
    );

    assert.equal(
      classifyConfidenceTrend([
        { recordDate: "2025-01-03", confidencePercent: 68, isMissing: false },
        { recordDate: "2025-01-10", confidencePercent: 62, isMissing: false },
        { recordDate: "2025-01-17", confidencePercent: 56, isMissing: false },
      ]),
      "weakening",
    );

    assert.equal(
      classifyConfidenceTrend([
        { recordDate: "2025-01-03", confidencePercent: 55, isMissing: false },
        { recordDate: "2025-01-10", confidencePercent: 72, isMissing: false },
        { recordDate: "2025-01-17", confidencePercent: 57, isMissing: false },
      ]),
      "unstable",
    );
  });
});
describe("buildFlipThreshold", () => {
  const makeAssessment = (
    regime: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION",
  ) =>
    ({
      regime,
      thresholds: {
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
      scores: {
        tightness: 76,
        riskAppetite: 45,
      },
    }) as ReturnType<typeof evaluateRegime>;

  it("returns a future crossing for scarcity regimes", () => {
    assert.match(buildFlipThreshold(makeAssessment("SCARCITY")), /flip condition is (already tripped|tripped yet)/);
    assert.match(buildFlipThreshold(makeAssessment("SCARCITY")), /already in the flip zone|flips this call if it/i);
  });

  it("returns a future crossing for defensive regimes", () => {
    assert.match(buildFlipThreshold(makeAssessment("DEFENSIVE")), /flip condition is (already tripped|tripped yet)/);
    assert.match(buildFlipThreshold(makeAssessment("DEFENSIVE")), /already in the flip zone|flips this call if it/i);
  });

  it("returns a future crossing for volatile regimes", () => {
    assert.match(buildFlipThreshold(makeAssessment("VOLATILE")), /flip condition is (already tripped|tripped yet)/);
    assert.match(buildFlipThreshold(makeAssessment("VOLATILE")), /already in the flip zone|flips this call if it/i);
  });

  it("returns a future crossing for expansion regimes", () => {
    assert.match(buildFlipThreshold(makeAssessment("EXPANSION")), /flip condition is (already tripped|tripped yet)/);
    assert.match(buildFlipThreshold(makeAssessment("EXPANSION")), /already in the flip zone|flips this call if it/i);
  });
});
