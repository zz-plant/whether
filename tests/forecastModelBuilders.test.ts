import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import { evaluateRegime } from "../lib/regimeEngine";
import rawArchive from "../data/summary_archive.json";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import { buildReportDynamics } from "../lib/report/reportData";
import {
  buildFallbackForecastModel,
  buildForecastModel,
  buildTransitionVelocityEstimateFromDurations,
  classifyBoundaryMomentum,
  classifyCrossingRisk,
  toMonthlyRegimePoints,
} from "../lib/report/forecastModel";

const buildTreasury = ({
  baseRate,
  curveSlope,
  recordDate,
}: {
  baseRate: number;
  curveSlope: number;
  recordDate: string;
}): TreasuryData => ({
  source: "https://example.com",
  record_date: recordDate,
  fetched_at: `${recordDate}T00:00:00.000Z`,
  isLive: true,
  yields: {
    oneMonth: baseRate,
    threeMonth: baseRate,
    twoYear: 4,
    tenYear: 4 + curveSlope,
  },
});

const sumProbabilities = (values: Record<string, number>) =>
  Object.values(values).reduce((sum, value) => sum + value, 0);

describe("buildForecastModel", () => {
  it("returns stable boundary pressure with low crossing risk for a stable regime", () => {
    const current = evaluateRegime(
      buildTreasury({
        baseRate: 3.25,
        curveSlope: 1.1,
        recordDate: "2026-01-01",
      }),
    );
    const previous = evaluateRegime(
      buildTreasury({
        baseRate: 3.25,
        curveSlope: 1.1,
        recordDate: "2025-12-01",
      }),
    );
    const dynamics = buildReportDynamics({ current, previous });

    const model = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: [],
    });

    assert.equal(sumProbabilities(model.next90DayProbabilities), 100);
    assert.equal(sumProbabilities(model.next4WeekProbabilities), 100);
    assert.equal(model.boundaryPressure.crossingRisk, "low");
    assert.equal(model.boundaryPressure.momentum, "stable");
    assert.equal(model.signalTrajectory.tightness, "stable");
  });

  it("flags medium-to-high boundary crossing risk when mixed signals cluster near thresholds", () => {
    const current = evaluateRegime(
      buildTreasury({
        baseRate: 5.38,
        curveSlope: 0.22,
        recordDate: "2026-02-01",
      }),
    );
    const previous = evaluateRegime(
      buildTreasury({
        baseRate: 5.42,
        curveSlope: 0.27,
        recordDate: "2026-01-01",
      }),
    );
    const dynamics = buildReportDynamics({ current, previous });

    const model = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: [],
    });

    assert.equal(sumProbabilities(model.next90DayProbabilities), 100);
    assert.equal(sumProbabilities(model.next4WeekProbabilities), 100);
    /* Funding pressure holds at its ceiling and risk appetite falls 2: the one
       score that moved got worse. This read "mixed" while the base rate's
       easing, which the held score does not show, counted as a vote. */
    assert.equal(dynamics.directionLabel, "deteriorating");
    assert.ok(
      model.boundaryPressure.crossingRisk === "medium" ||
        model.boundaryPressure.crossingRisk === "high",
    );
    assert.equal(model.signalTrajectory.tightness, "improving");
    assert.equal(model.signalTrajectory.riskAppetite, "deteriorating");
  });

  it("marks momentum as toward-threshold when both dimensions drift closer to boundaries", () => {
    const assessment = evaluateRegime(
      buildTreasury({
        baseRate: 5.4,
        curveSlope: 0.1,
        recordDate: "2026-04-01",
      }),
    );
    const dynamics = {
      changedSignals: [
        { key: "tightness" as const, label: "Funding pressure", delta: -4.5 },
        { key: "riskAppetite" as const, label: "Risk appetite", delta: 5.2 },
        { key: "curveSlope" as const, label: "Curve slope", delta: 0.08 },
      ],
      anomalySignals: [],
      totalSignalChanges: 3,
      regimeChanged: false,
      directionLabel: "mixed" as const,
    };

    const model = buildForecastModel({
      assessment,
      reportDynamics: dynamics,
      macroSeries: [],
    });

    assert.equal(sumProbabilities(model.next90DayProbabilities), 100);
    assert.equal(sumProbabilities(model.next4WeekProbabilities), 100);
    assert.equal(model.boundaryPressure.momentum, "toward-threshold");
    assert.equal(model.signalTrajectory.tightness, "improving");
    assert.equal(model.signalTrajectory.riskAppetite, "improving");
  });

  it("raises downside regime probability when trends deteriorate", () => {
    const current = evaluateRegime(
      buildTreasury({
        baseRate: 5.3,
        curveSlope: 0.3,
        recordDate: "2026-03-01",
      }),
    );
    const previous = evaluateRegime(
      buildTreasury({
        baseRate: 4.9,
        curveSlope: 0.55,
        recordDate: "2026-02-01",
      }),
    );
    const dynamics = buildReportDynamics({ current, previous });

    const macroSeries: MacroSeriesReading[] = [
      {
        id: "HY_CREDIT_SPREAD",
        label: "HY spread",
        value: 5.2,
        unit: "%",
        explanation: "",
        sourceLabel: "test",
        sourceUrl: "https://example.com",
        formulaUrl: "https://example.com",
        record_date: "2026-03-01",
        fetched_at: "2026-03-01T00:00:00.000Z",
        isLive: true,
        history: [
          { date: "2026-03-01", value: 5.2 },
          { date: "2026-02-01", value: 4.8 },
        ],
      },
      {
        id: "VIX_INDEX",
        label: "VIX",
        value: 24,
        unit: "index",
        explanation: "",
        sourceLabel: "test",
        sourceUrl: "https://example.com",
        formulaUrl: "https://example.com",
        record_date: "2026-03-01",
        fetched_at: "2026-03-01T00:00:00.000Z",
        isLive: true,
        history: [
          { date: "2026-03-01", value: 24 },
          { date: "2026-02-01", value: 19 },
        ],
      },
    ];

    const model = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries,
    });

    const downsideProbability =
      model.next90DayProbabilities.Scarcity +
      model.next90DayProbabilities.Defensive;
    const upsideProbability =
      model.next90DayProbabilities.Expansion +
      model.next90DayProbabilities.Mixed;

    assert.equal(sumProbabilities(model.next90DayProbabilities), 100);
    assert.equal(sumProbabilities(model.next4WeekProbabilities), 100);
    assert.equal(dynamics.directionLabel, "deteriorating");
    assert.ok(downsideProbability > upsideProbability);
    assert.equal(model.signalTrajectory.tightness, "deteriorating");
    assert.equal(model.signalTrajectory.riskAppetite, "deteriorating");
  });

  it("uses the latest macro move rather than the oldest history edge", () => {
    const current = evaluateRegime(
      buildTreasury({
        baseRate: 5.3,
        curveSlope: 0.3,
        recordDate: "2026-03-01",
      }),
    );
    const previous = evaluateRegime(
      buildTreasury({
        baseRate: 4.9,
        curveSlope: 0.55,
        recordDate: "2026-02-01",
      }),
    );
    const dynamics = buildReportDynamics({ current, previous });

    const worseningLatestMove: MacroSeriesReading[] = [
      {
        id: "HY_CREDIT_SPREAD",
        label: "HY spread",
        value: 5.2,
        unit: "%",
        explanation: "",
        sourceLabel: "test",
        sourceUrl: "https://example.com",
        formulaUrl: "https://example.com",
        record_date: "2026-03-01",
        fetched_at: "2026-03-01T00:00:00.000Z",
        isLive: true,
        history: [
          { date: "2025-12-01", value: 6.0 },
          { date: "2026-01-01", value: 5.5 },
          { date: "2026-02-01", value: 4.8 },
          { date: "2026-03-01", value: 5.2 },
        ],
      },
    ];
    const improvingLatestMove: MacroSeriesReading[] = [
      {
        id: "HY_CREDIT_SPREAD",
        label: "HY spread",
        value: 4.8,
        unit: "%",
        explanation: "",
        sourceLabel: "test",
        sourceUrl: "https://example.com",
        formulaUrl: "https://example.com",
        record_date: "2026-03-01",
        fetched_at: "2026-03-01T00:00:00.000Z",
        isLive: true,
        history: [
          { date: "2025-12-01", value: 6.0 },
          { date: "2026-01-01", value: 5.5 },
          { date: "2026-02-01", value: 5.2 },
          { date: "2026-03-01", value: 4.8 },
        ],
      },
    ];

    const worseningModel = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: worseningLatestMove,
    });
    const improvingModel = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: improvingLatestMove,
    });

    const worseningDownside =
      worseningModel.next4WeekProbabilities.Scarcity +
      worseningModel.next4WeekProbabilities.Defensive;
    const improvingDownside =
      improvingModel.next4WeekProbabilities.Scarcity +
      improvingModel.next4WeekProbabilities.Defensive;

    assert.ok(worseningDownside > improvingDownside);
  });

  it("separates the 4-week and 90-day regime distributions when pressure persists", () => {
    const current = evaluateRegime(
      buildTreasury({
        baseRate: 5.05,
        curveSlope: 0.48,
        recordDate: "2026-03-01",
      }),
    );
    const previous = evaluateRegime(
      buildTreasury({
        baseRate: 5,
        curveSlope: 0.52,
        recordDate: "2026-02-01",
      }),
    );
    const dynamics = buildReportDynamics({ current, previous });

    const model = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: [
        {
          id: "HY_CREDIT_SPREAD",
          label: "HY spread",
          value: 5.2,
          unit: "%",
          explanation: "",
          sourceLabel: "test",
          sourceUrl: "https://example.com",
          formulaUrl: "https://example.com",
          record_date: "2026-03-01",
          fetched_at: "2026-03-01T00:00:00.000Z",
          isLive: true,
          history: [
            { date: "2026-01-01", value: 4.6 },
            { date: "2026-02-01", value: 4.7 },
            { date: "2026-03-01", value: 5.2 },
          ],
        },
        {
          id: "VIX_INDEX",
          label: "VIX",
          value: 24,
          unit: "index",
          explanation: "",
          sourceLabel: "test",
          sourceUrl: "https://example.com",
          formulaUrl: "https://example.com",
          record_date: "2026-03-01",
          fetched_at: "2026-03-01T00:00:00.000Z",
          isLive: true,
          history: [
            { date: "2026-01-01", value: 17 },
            { date: "2026-02-01", value: 18 },
            { date: "2026-03-01", value: 24 },
          ],
        },
      ],
    });

    assert.equal(sumProbabilities(model.next4WeekProbabilities), 100);
    assert.equal(sumProbabilities(model.next90DayProbabilities), 100);
    assert.notDeepEqual(model.next4WeekProbabilities, model.next90DayProbabilities);
  });

  it("returns deterministic probabilities for identical inputs", () => {
    const current = evaluateRegime(
      buildTreasury({
        baseRate: 5.1,
        curveSlope: 0.4,
        recordDate: "2026-05-01",
      }),
    );
    const previous = evaluateRegime(
      buildTreasury({
        baseRate: 5.0,
        curveSlope: 0.45,
        recordDate: "2026-04-01",
      }),
    );
    const dynamics = buildReportDynamics({ current, previous });

    const first = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: [],
    });
    const second = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: [],
    });

    assert.deepEqual(first.next4WeekProbabilities, second.next4WeekProbabilities);
    assert.deepEqual(first.next90DayProbabilities, second.next90DayProbabilities);
  });

  it("keeps bounded distributions when the regime sits near thresholds", () => {
    const current = evaluateRegime(
      buildTreasury({
        baseRate: 5.35,
        curveSlope: 0.21,
        recordDate: "2026-06-01",
      }),
    );
    const previous = evaluateRegime(
      buildTreasury({
        baseRate: 5.34,
        curveSlope: 0.22,
        recordDate: "2026-05-01",
      }),
    );
    const dynamics = buildReportDynamics({ current, previous });

    const model = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: [],
    });

    assert.equal(sumProbabilities(model.next4WeekProbabilities), 100);
    assert.ok(model.next4WeekProbabilities.Scarcity >= 0);
    assert.ok(model.next4WeekProbabilities.Mixed >= 0);
    assert.ok(model.next4WeekProbabilities.Defensive >= 0);
    assert.ok(model.next4WeekProbabilities.Expansion >= 0);
  });

});

describe("forecast classification helpers", () => {
  it("classifies crossing risk boundaries", () => {
    assert.equal(
      classifyCrossingRisk({
        crossingProbability: 0.5,
        distance: 12,
        momentum: "stable",
      }),
      "high",
    );
    assert.equal(
      classifyCrossingRisk({
        crossingProbability: 0.25,
        distance: 12,
        momentum: "stable",
      }),
      "medium",
    );
    assert.equal(
      classifyCrossingRisk({
        crossingProbability: 0.1,
        distance: 2,
        momentum: "toward-threshold",
      }),
      "high",
    );
    assert.equal(
      classifyCrossingRisk({
        crossingProbability: 0.1,
        distance: 7,
        momentum: "mixed",
      }),
      "medium",
    );
    assert.equal(
      classifyCrossingRisk({
        crossingProbability: 0.1,
        distance: 12,
        momentum: "away-from-threshold",
      }),
      "low",
    );
  });

  it("classifies mixed and stable momentum states", () => {
    assert.equal(
      classifyBoundaryMomentum({
        tightnessGap: -6,
        riskGap: 6,
        tightnessDrift: -2,
        riskDrift: -2,
      }),
      "mixed",
    );

    assert.equal(
      classifyBoundaryMomentum({
        tightnessGap: -6,
        riskGap: 6,
        tightnessDrift: 0,
        riskDrift: 0,
      }),
      "stable",
    );
  });
});

describe("buildFallbackForecastModel", () => {
  it("returns canonical fallback shape", () => {
    const fallback = buildFallbackForecastModel();

    assert.deepEqual(Object.keys(fallback.next4WeekProbabilities).sort(), [
      "Defensive",
      "Expansion",
      "Mixed",
      "Scarcity",
    ]);
    assert.equal(
      sumProbabilities(fallback.next4WeekProbabilities),
      100,
    );
    assert.deepEqual(Object.keys(fallback.next90DayProbabilities).sort(), [
      "Defensive",
      "Expansion",
      "Mixed",
      "Scarcity",
    ]);
    assert.equal(
      sumProbabilities(fallback.next90DayProbabilities),
      100,
    );
    assert.deepEqual(fallback.boundaryPressure, {
      distance: 0,
      momentum: "stable",
      crossingRisk: "medium",
    });
    assert.deepEqual(fallback.signalTrajectory, {
      riskAppetite: "stable",
      tightness: "stable",
      yieldCurveProxy: "stable",
    });
  });
});


describe("monthly regime history derivation", () => {
  it("preserves the canonical full-archive monthly points after moving to the smaller history artifact", () => {
    const regimeLabels = {
      EXPANSION: "Expansion",
      VOLATILE: "Mixed",
      SCARCITY: "Scarcity",
      DEFENSIVE: "Defensive",
    } as const;

    const parseDate = (value: string) => new Date(value).getTime();

    const archivePoints = rawArchive
      .filter((entry) => entry.cadence === "monthly")
      .map((entry) => ({
        timestamp: parseDate(entry.record_date),
        regime: regimeLabels[entry.summary.regime as keyof typeof regimeLabels],
      }));

    const timeMachinePoints = getTimeMachineRegimeSeries(240).map((entry) => ({
      timestamp: parseDate(entry.recordDate),
      regime: regimeLabels[entry.regime as keyof typeof regimeLabels],
    }));

    const byMonth = new Map<string, { timestamp: number; regime: (typeof archivePoints)[number]["regime"] }>();
    [...archivePoints, ...timeMachinePoints].forEach((point) => {
      const monthKey = new Date(point.timestamp).toISOString().slice(0, 7);
      const existing = byMonth.get(monthKey);
      if (!existing || point.timestamp > existing.timestamp) {
        byMonth.set(monthKey, point);
      }
    });

    const expected = Array.from(byMonth.values()).sort((left, right) => left.timestamp - right.timestamp);

    assert.deepEqual(toMonthlyRegimePoints(), expected);
  });
});

describe("transition velocity estimates", () => {
  it("bins durations into a typical month range", () => {
    const estimate = buildTransitionVelocityEstimateFromDurations({
      from: "Expansion",
      to: "Mixed",
      durationsDays: [72, 95, 130, 176],
    });

    assert.equal(estimate.status, "ok");
    if (estimate.status === "ok") {
      assert.equal(estimate.lowerBoundMonths, 3);
      assert.equal(estimate.upperBoundMonths, 5);
      assert.match(estimate.displayLabel, /typically 3–5 months/);
    }
  });

  it("returns explicit insufficient history marker for low-sample transitions", () => {
    const estimate = buildTransitionVelocityEstimateFromDurations({
      from: "Defensive",
      to: "Scarcity",
      durationsDays: [88],
    });

    assert.equal(estimate.status, "insufficient_history");
    assert.equal(estimate.sampleSize, 1);
    assert.match(estimate.displayLabel, /insufficient history/i);
  });
});
