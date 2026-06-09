import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";
import { buildForecastModel } from "../lib/report/forecastModel";
import { buildReportDynamics } from "../lib/report/reportData";

const makeTreasury = ({
  baseRate,
  curveSlope,
  recordDate,
}: {
  baseRate: number;
  curveSlope: number;
  recordDate: string;
}): TreasuryData => ({
  source: "test",
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

const probabilitySum = (model: ReturnType<typeof buildForecastModel>) =>
  Object.values(model.next90DayProbabilities).reduce((sum, value) => sum + value, 0);

const topProbability = (model: ReturnType<typeof buildForecastModel>) =>
  Object.entries(model.next90DayProbabilities).sort((a, b) => b[1] - a[1])[0];

describe("forecast model probabilities and risk bounds", () => {
  it("normalizes regime probabilities to 100 and keeps each probability bounded", () => {
    const current = evaluateRegime(makeTreasury({ baseRate: 4.3, curveSlope: 0.45, recordDate: "2026-03-01" }));
    const previous = evaluateRegime(makeTreasury({ baseRate: 4.6, curveSlope: 0.2, recordDate: "2026-02-01" }));
    const model = buildForecastModel({
      assessment: current,
      reportDynamics: buildReportDynamics({ current, previous }),
      macroSeries: [],
    });

    assert.equal(probabilitySum(model), 100);
    for (const probability of Object.values(model.next90DayProbabilities)) {
      assert.ok(probability >= 0 && probability <= 100);
    }
  });

  it("orders top probability around the current regime under stable conditions", () => {
    const current = evaluateRegime(makeTreasury({ baseRate: 2.2, curveSlope: 1.1, recordDate: "2026-04-01" }));
    const previous = evaluateRegime(makeTreasury({ baseRate: 2.2, curveSlope: 1.1, recordDate: "2026-03-01" }));
    const model = buildForecastModel({
      assessment: current,
      reportDynamics: buildReportDynamics({ current, previous }),
      macroSeries: [],
    });

    const [label, percent] = topProbability(model);
    assert.equal(label, "Expansion");
    assert.ok(percent >= model.next90DayProbabilities.Mixed);
    assert.ok(percent >= model.next90DayProbabilities.Defensive);
  });

  it("keeps crossing risk low when far from boundaries and motion is away", () => {
    const current = evaluateRegime(makeTreasury({ baseRate: 2.4, curveSlope: 1.2, recordDate: "2026-05-01" }));
    const previous = evaluateRegime(makeTreasury({ baseRate: 2.2, curveSlope: 1.25, recordDate: "2026-04-01" }));

    const model = buildForecastModel({
      assessment: current,
      reportDynamics: buildReportDynamics({ current, previous }),
      macroSeries: [],
    });

    assert.ok(model.boundaryPressure.distance > 8);
    assert.equal(model.boundaryPressure.crossingRisk, "low");
  });

  it("raises crossing risk to high when nearest distance is inside boundary band", () => {
    const current = evaluateRegime(makeTreasury({ baseRate: 3.93, curveSlope: 0.19, recordDate: "2026-06-01" }));
    const previous = evaluateRegime(makeTreasury({ baseRate: 3.99, curveSlope: 0.25, recordDate: "2026-05-01" }));

    const model = buildForecastModel({
      assessment: current,
      reportDynamics: buildReportDynamics({ current, previous }),
      macroSeries: [],
    });

    assert.ok(model.boundaryPressure.distance <= 3);
    assert.equal(model.boundaryPressure.crossingRisk, "high");
  });
});
