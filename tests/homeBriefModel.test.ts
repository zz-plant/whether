import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadReportData } from "../lib/report/reportData";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";

describe("buildHomeBriefModel", () => {
  it("derives stable labels and decision rules from report data", { timeout: 15000 }, async () => {
    const data = await loadReportData();
    const model = buildHomeBriefModel(data);

    assert.match(model.confidenceLabel, /LOW|MED|HIGH/);
    assert.equal(typeof model.confidencePercent, "number");
    assert.match(model.trendLabel, /Improving|Deteriorating|Mixed|Stable/);
    assert.match(model.transitionWatch, /ON|OFF/);
    assert.equal(typeof model.guardrail, "string");
    assert.equal(typeof model.reversalTrigger, "string");
    assert.equal(model.decisionRules.length, 5);
    assert.equal(typeof model.revisitDecisions, "boolean");
    assert.ok(model.memoryRail.length > 0);
    assert.equal(model.whyThisCall.length, 3);
    assert.ok(model.primaryDrivers.length >= 2);
    assert.ok(model.startupClimateIndex.score >= 0 && model.startupClimateIndex.score <= 100);
    assert.equal(model.startupClimateIndex.breakdown.length, 4);
    assert.match(model.whyThisCall[0].detail, /threshold|range|outside/i);
    assert.match(model.decisionRules[0].pauseTrigger, /\d/);
  });

  it("returns no-change decision summary when there are no deltas", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 50, riskAppetite: 50 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
      },
    });

    assert.match(model.decisionShiftSummary, /Changed: no material signal shift\./);
    assert.match(model.decisionShiftSummary, /Do now:/);
    assert.match(model.decisionShiftSummary, /Flip:/);
    assert.equal(model.decisionRules.length, 5);
    assert.equal(typeof model.confidencePercent, "number");
    assert.match(model.trendLabel, /Improving|Deteriorating|Mixed|Stable/);
    assert.equal(typeof model.revisitDecisions, "boolean");
    assert.ok(model.memoryRail.length > 0);
    assert.equal(model.whyThisCall.length, 3);
    assert.ok(model.primaryDrivers.length >= 2);
    assert.ok(model.startupClimateIndex.score >= 0 && model.startupClimateIndex.score <= 100);
    assert.equal(model.startupClimateIndex.breakdown.length, 4);
    assert.match(model.whyThisCall[0].detail, /threshold|range|outside/i);
    assert.match(model.decisionRules[0].pauseTrigger, /\d/);
  });
});
