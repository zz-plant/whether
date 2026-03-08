import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { evaluateRegime } from "../regimeEngine";
import type { MacroSeriesReading, TreasuryData } from "../types";
import { buildReportDynamics } from "./reportData";
import {
  buildFallbackForecastModel,
  buildForecastModel,
  classifyBoundaryMomentum,
  classifyCrossingRisk,
} from "./forecastModel";

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

const sumProbabilities = (model: ReturnType<typeof buildForecastModel>) =>
  Object.values(model.next90DayProbabilities).reduce(
    (sum, value) => sum + value,
    0,
  );

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

    assert.equal(sumProbabilities(model), 100);
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

    assert.equal(sumProbabilities(model), 100);
    assert.equal(dynamics.directionLabel, "mixed");
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
        { key: "tightness" as const, label: "Cash availability", delta: -4.5 },
        { key: "riskAppetite" as const, label: "Risk appetite", delta: 5.2 },
        { key: "curveSlope" as const, label: "Curve slope", delta: 0.08 },
      ],
      totalSignalChanges: 3,
      regimeChanged: false,
      directionLabel: "mixed" as const,
    };

    const model = buildForecastModel({
      assessment,
      reportDynamics: dynamics,
      macroSeries: [],
    });

    assert.equal(sumProbabilities(model), 100);
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

    assert.equal(sumProbabilities(model), 100);
    assert.equal(dynamics.directionLabel, "deteriorating");
    assert.ok(downsideProbability > upsideProbability);
    assert.equal(model.signalTrajectory.tightness, "deteriorating");
    assert.equal(model.signalTrajectory.riskAppetite, "deteriorating");
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

    assert.deepEqual(Object.keys(fallback.next90DayProbabilities).sort(), [
      "Defensive",
      "Expansion",
      "Mixed",
      "Scarcity",
    ]);
    assert.equal(
      Object.values(fallback.next90DayProbabilities).reduce(
        (sum, value) => sum + value,
        0,
      ),
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
