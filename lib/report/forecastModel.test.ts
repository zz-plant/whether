import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { evaluateRegime } from "../regimeEngine";
import type { MacroSeriesReading, TreasuryData } from "../types";
import { buildReportDynamics } from "./reportData";
import { buildForecastModel } from "./forecastModel";

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
  Object.values(model.regimeProbabilities).reduce((sum, value) => sum + value, 0);

describe("buildForecastModel", () => {
  it("returns stable boundary pressure with low crossing risk for a stable regime", () => {
    const current = evaluateRegime(
      buildTreasury({ baseRate: 3.25, curveSlope: 1.1, recordDate: "2026-01-01" })
    );
    const previous = evaluateRegime(
      buildTreasury({ baseRate: 3.25, curveSlope: 1.1, recordDate: "2025-12-01" })
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
    assert.equal(model.signalTrajectory.tightness, "flat");
  });

  it("flags medium-to-high boundary crossing risk when mixed signals cluster near thresholds", () => {
    const current = evaluateRegime(
      buildTreasury({ baseRate: 5.38, curveSlope: 0.22, recordDate: "2026-02-01" })
    );
    const previous = evaluateRegime(
      buildTreasury({ baseRate: 5.42, curveSlope: 0.27, recordDate: "2026-01-01" })
    );
    const dynamics = buildReportDynamics({ current, previous });

    const model = buildForecastModel({
      assessment: current,
      reportDynamics: dynamics,
      macroSeries: [],
    });


    assert.equal(sumProbabilities(model), 100);
    assert.equal(dynamics.directionLabel, "mixed");
    assert.ok(model.boundaryPressure.crossingRisk === "medium" || model.boundaryPressure.crossingRisk === "high");
    assert.equal(model.signalTrajectory.tightness, "down");
    assert.equal(model.signalTrajectory.riskAppetite, "down");
  });

  it("marks momentum as toward-threshold when both dimensions drift closer to boundaries", () => {
    const assessment = evaluateRegime(
      buildTreasury({ baseRate: 5.4, curveSlope: 0.1, recordDate: "2026-04-01" })
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
    assert.equal(model.signalTrajectory.tightness, "down");
    assert.equal(model.signalTrajectory.riskAppetite, "up");
  });

  it("raises downside regime probability when trends deteriorate", () => {
    const current = evaluateRegime(
      buildTreasury({ baseRate: 5.3, curveSlope: 0.3, recordDate: "2026-03-01" })
    );
    const previous = evaluateRegime(
      buildTreasury({ baseRate: 4.9, curveSlope: 0.55, recordDate: "2026-02-01" })
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

    const downsideProbability = model.regimeProbabilities.Scarcity + model.regimeProbabilities.Defensive;
    const upsideProbability = model.regimeProbabilities.Expansion + model.regimeProbabilities.Mixed;

    assert.equal(sumProbabilities(model), 100);
    assert.equal(dynamics.directionLabel, "deteriorating");
    assert.ok(downsideProbability > upsideProbability);
    assert.equal(model.signalTrajectory.tightness, "up");
    assert.equal(model.signalTrajectory.riskAppetite, "down");
  });
});
