import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildRunwayPlan, describeRunwayPlanInYourNumbers, formatRunwayPlanCompactBlock } from "../lib/report/runwayPlanner";

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
    assert.match(output.boundedRules.burnDiscipline, /Pause new discretionary spend/i);
  });
});

describe("runway planner in dates and dollars", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const request = {
    runway: 10,
    burn: 300_000,
    revenue: 100_000,
    growthRate: 2,
    sector: "b2b-saas" as const,
    stage: "seed" as const,
  };
  const plan = buildRunwayPlan({ ...request, regime: "DEFENSIVE", posture: "SAFETY_MODE" });
  const numbers = describeRunwayPlanInYourNumbers(plan, request, now);

  it("counts the raise window and the cash-out month forward from today", () => {
    assert.equal(numbers.runsOut, "Cash runs out around Aug 2027 at today's net burn.");
    assert.match(numbers.raiseWindow, /^Start the raise (now|between [A-Z][a-z]{2} \d{4} and [A-Z][a-z]{2} \d{4})/);
  });

  it("states the burn change as dollars of spend and the runway it buys, holding cash constant", () => {
    const pct = plan.burnAdjustmentRange.recommendedDeltaPercent;
    assert.ok(pct < 0, "a defensive plan at 10 months cuts");
    const cut = (300_000 * -pct) / 100;
    const runwayAfter = Math.round(((10 * 200_000) / (200_000 - cut)) * 10) / 10;
    assert.ok(numbers.burnChange?.startsWith("About $"));
    assert.ok(numbers.burnChange?.includes(`runway goes from 10 to ${runwayAfter} months`), numbers.burnChange ?? "");
  });

  it("prices the gap to the safe band's floor in cash and in net burn", () => {
    const floor = plan.safeRunwayBand.minMonths;
    assert.ok(floor > 10);
    assert.match(numbers.floorGap ?? "", new RegExp(`under the ${floor}-month floor`));
    assert.match(numbers.floorGap ?? "", /more cash closes it at today's net burn, or net burn of \$\d+k a month/);
  });

  it("drops the floor gap at or above the floor, and the cash-out month when nothing is spent down", () => {
    const comfortable = { ...request, runway: 40 };
    const comfortablePlan = buildRunwayPlan({ ...comfortable, regime: "EXPANSION", posture: "RISK_ON" });
    assert.equal(describeRunwayPlanInYourNumbers(comfortablePlan, comfortable, now).floorGap, null);

    const covered = { ...request, revenue: 300_000 };
    const coveredPlan = buildRunwayPlan({ ...covered, regime: "DEFENSIVE", posture: "SAFETY_MODE" });
    const coveredNumbers = describeRunwayPlanInYourNumbers(coveredPlan, covered, now);
    assert.equal(coveredNumbers.runsOut, null);
    assert.equal(coveredNumbers.floorGap, null);
  });

  it("adds the dated lines to the copy block only when it has them", () => {
    assert.doesNotMatch(formatRunwayPlanCompactBlock(plan), /In dates and dollars/);
    const block = formatRunwayPlanCompactBlock(plan, numbers);
    assert.match(block, /In dates and dollars:\n• Cash runs out around Aug 2027/);
  });
});
