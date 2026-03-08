import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRunwayPlan } from "../lib/report/runwayPlanner";

describe("runway planner", () => {
  it("keeps short-runway expansion in an immediate raise window with bounded risk score", () => {
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

    assert.equal(output.runwayRisk.level, "low");
    assert.equal(output.raiseTimingWindow.startMonth, 1);
    assert.equal(output.raiseTimingWindow.endMonth, 4);
    assert.match(output.raiseTimingWindow.summary, /Flip to later window/i);
  });

  it("keeps mixed conditions with healthy runway in a later measured raise range", () => {
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

    assert.equal(output.runwayRisk.level, "low");
    assert.equal(output.raiseTimingWindow.startMonth, 4);
    assert.equal(output.raiseTimingWindow.endMonth, 8);
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

  it("tightens recommendations as posture moves from risk-on to safety mode", () => {
    const riskOn = buildRunwayPlan({
      runwayMonths: 12,
      monthlyBurn: 850000,
      monthlyRevenue: 620000,
      growthRate: 14,
      sector: "b2b-saas",
      stage: "growth",
      regime: "VOLATILE",
      posture: "RISK_ON",
    });

    const safety = buildRunwayPlan({
      runwayMonths: 12,
      monthlyBurn: 850000,
      monthlyRevenue: 620000,
      growthRate: 14,
      sector: "b2b-saas",
      stage: "growth",
      regime: "VOLATILE",
      posture: "SAFETY_MODE",
    });

    assert.ok(safety.runwayRisk.score > riskOn.runwayRisk.score);
    assert.equal(safety.burnAdjustmentRange.minPercent, riskOn.burnAdjustmentRange.minPercent);
  });

  it("shifts raise timing later when the same company flips from defensive to expansion regime", () => {
    const defensive = buildRunwayPlan({
      runwayMonths: 16,
      monthlyBurn: 700000,
      monthlyRevenue: 640000,
      growthRate: 12,
      sector: "consumer",
      stage: "growth",
      regime: "DEFENSIVE",
      posture: "TRANSITION",
    });

    const expansion = buildRunwayPlan({
      runwayMonths: 16,
      monthlyBurn: 700000,
      monthlyRevenue: 640000,
      growthRate: 12,
      sector: "consumer",
      stage: "growth",
      regime: "EXPANSION",
      posture: "TRANSITION",
    });

    assert.ok(expansion.raiseTimingWindow.startMonth >= defensive.raiseTimingWindow.startMonth);
    assert.ok(expansion.safeRunwayBand.minMonths <= defensive.safeRunwayBand.minMonths);
    assert.ok(expansion.burnAdjustmentRange.minPercent > defensive.burnAdjustmentRange.minPercent);
    assert.match(expansion.raiseTimingWindow.summary, /Flip to later window/i);
  });

});
