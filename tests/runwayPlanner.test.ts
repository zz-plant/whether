import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRunwayPlan } from "../lib/report/runwayPlanner";

describe("runway planner", () => {
  it("flags expansion with high growth and short runway as high urgency", () => {
    const output = buildRunwayPlan({
      runwayMonths: 7,
      monthlyBurn: 900000,
      monthlyRevenue: 500000,
      growthRate: 24,
      sector: "consumer",
      stage: "series-a",
      regime: "EXPANSION",
      posture: "RISK_ON",
    });

    assert.match(output.runwayRisk.level, /high|critical/);
    assert.equal(output.raiseTimingWindow.startMonth, 0);
    assert.equal(output.raiseTimingWindow.endMonth, 2);
    assert.match(output.raiseTimingWindow.summary, /Flip to later window/i);
  });

  it("keeps mixed conditions with moderate runway in a measured range", () => {
    const output = buildRunwayPlan({
      runwayMonths: 14,
      monthlyBurn: 700000,
      monthlyRevenue: 520000,
      growthRate: 10,
      sector: "b2b-saas",
      stage: "growth",
      regime: "VOLATILE",
      posture: "TRANSITION",
    });

    assert.equal(output.runwayRisk.level, "moderate");
    assert.equal(output.raiseTimingWindow.startMonth, 2);
    assert.equal(output.raiseTimingWindow.endMonth, 5);
    assert.equal(output.safeRunwayBand.minMonths, 12);
    assert.match(output.burnAdjustmentRange.summary, /Reverse only after two weekly reads stabilize/i);
  });

  it("pushes scarcity with aggressive burn toward deeper cuts", () => {
    const output = buildRunwayPlan({
      runwayMonths: 10,
      monthlyBurn: 1200000,
      monthlyRevenue: 350000,
      growthRate: 6,
      sector: "infrastructure",
      stage: "seed",
      regime: "SCARCITY",
      posture: "SAFETY_MODE",
    });

    assert.equal(output.runwayRisk.level, "critical");
    assert.ok(output.burnAdjustmentRange.minPercent <= -35);
    assert.equal(output.raiseTimingWindow.startMonth, 0);
    assert.match(output.boundedRules.burnDiscipline, /Pause discretionary burn expansion/i);
    assert.match(output.boundedRules.capitalRaising, /Playbook start:/i);
  });
});
