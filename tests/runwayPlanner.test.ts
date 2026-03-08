import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRunwayPlan } from "../lib/report/runwayPlanner";

describe("runway planner", () => {
  it("computes actionable financial outputs for expansion with short runway", () => {
    const output = buildRunwayPlan({
      runway: 7,
      burn: 900000,
      revenue: 500000,
      growthRate: 24,
      sector: "consumer",
      stage: "series-a",
      regime: "EXPANSION",
      posture: "RISK_ON",
    });

    assert.equal(output.runwayRisk.level, "low");
    assert.ok(output.runwayRisk.macroRiskDownsideFlip > output.runwayRisk.macroRiskBase);
    assert.equal(output.raiseTimingWindow.startMonth, 1);
    assert.equal(output.raiseTimingWindow.endMonth, 4);
    assert.ok(output.burnAdjustmentRange.recommendedDeltaPercent <= output.burnAdjustmentRange.ceilingPercent);
    assert.ok(output.burnAdjustmentRange.recommendedDeltaPercent >= output.burnAdjustmentRange.floorPercent);
  });

  it("handles regime changes from expansion to mixed to scarcity with tighter risk and earlier raise windows", () => {
    const expansion = buildRunwayPlan({
      runway: 14,
      burn: 760000,
      revenue: 620000,
      growthRate: 15,
      sector: "b2b-saas",
      stage: "growth",
      regime: "EXPANSION",
      posture: "TRANSITION",
    });

    const mixed = buildRunwayPlan({
      runway: 14,
      burn: 760000,
      revenue: 620000,
      growthRate: 15,
      sector: "b2b-saas",
      stage: "growth",
      regime: "VOLATILE",
      posture: "TRANSITION",
    });

    const scarcity = buildRunwayPlan({
      runway: 14,
      burn: 760000,
      revenue: 620000,
      growthRate: 15,
      sector: "b2b-saas",
      stage: "growth",
      regime: "SCARCITY",
      posture: "SAFETY_MODE",
    });

    assert.ok(expansion.safeRunwayBand.minMonths < mixed.safeRunwayBand.minMonths);
    assert.ok(mixed.safeRunwayBand.minMonths < scarcity.safeRunwayBand.minMonths);
    assert.ok(expansion.raiseTimingWindow.startMonth >= mixed.raiseTimingWindow.startMonth);
    assert.ok(mixed.raiseTimingWindow.startMonth >= scarcity.raiseTimingWindow.startMonth);
    assert.ok(scarcity.runwayRisk.score >= mixed.runwayRisk.score);
    assert.ok(mixed.runwayRisk.score >= expansion.runwayRisk.score);
  });

  it("reflects stage and sector sensitivity in safe runway bands", () => {
    const seedInfrastructure = buildRunwayPlan({
      runway: 16,
      burn: 650000,
      revenue: 500000,
      growthRate: 11,
      sector: "infrastructure",
      stage: "seed",
      regime: "VOLATILE",
      posture: "TRANSITION",
    });

    const publicConsumer = buildRunwayPlan({
      runway: 16,
      burn: 650000,
      revenue: 500000,
      growthRate: 11,
      sector: "consumer",
      stage: "public",
      regime: "VOLATILE",
      posture: "TRANSITION",
    });

    assert.ok(seedInfrastructure.safeRunwayBand.minMonths > publicConsumer.safeRunwayBand.minMonths);
    assert.ok(seedInfrastructure.safeRunwayBand.maxMonths > publicConsumer.safeRunwayBand.maxMonths);
  });

  it("pushes scarcity with aggressive burn toward deeper cuts", () => {
    const output = buildRunwayPlan({
      runway: 10,
      burn: 1200000,
      revenue: 350000,
      growthRate: 6,
      sector: "infrastructure",
      stage: "seed",
      regime: "SCARCITY",
      posture: "SAFETY_MODE",
    });

    assert.equal(output.runwayRisk.level, "critical");
    assert.ok(output.burnAdjustmentRange.floorPercent <= -35);
    assert.equal(output.raiseTimingWindow.startMonth, 0);
    assert.match(output.boundedRules.burnDiscipline, /Pause discretionary burn expansion/i);
  });
});
