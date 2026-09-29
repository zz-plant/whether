import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildBoldnessScore,
  buildWeeklyLeadershipBriefModel,
  getNetDeltaLabel,
  getWindowState,
  toTrendLabel,
} from "../lib/report/weeklyLeadershipBrief";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { evaluateRegime } from "../lib/regimeEngine";
import { snapshotData } from "../lib/snapshot";

describe("weeklyLeadershipBrief helpers", () => {
  it("buildBoldnessScore clamps between 0 and 100", () => {
    assert.equal(buildBoldnessScore(100, 100), 70);
    assert.equal(buildBoldnessScore(0, 100), 100);
    assert.equal(buildBoldnessScore(100, 0), 0);
  });

  it("trend and window labels are deterministic", () => {
    assert.equal(toTrendLabel(3), "Strengthening");
    assert.equal(toTrendLabel(-3), "Cooling");
    assert.equal(toTrendLabel(0), "Flat");

    assert.equal(getWindowState(80, { open: 38, strong: 64 }), "Strong");
    assert.equal(getWindowState(40, { open: 38, strong: 64 }), "Open");
    assert.equal(getWindowState(20, { open: 38, strong: 64 }), "Constrained");
  });

  it("buildWeeklyLeadershipBriefModel returns expected shape", () => {
    const assessment = evaluateRegime(snapshotData);
    const model = buildWeeklyLeadershipBriefModel({
      assessment,
      previousAssessment: null,
      last4Boldness: [58, 61, 59, 63],
      hiringTrendDelta: 4,
      stabilityWeeks: 3,
    });

    assert.equal(typeof model.boldnessScore, "number");
    assert.equal(typeof model.boldnessDelta, "number");
    assert.equal(model.stabilityWeeks, 3);
    assert.equal(model.hiringTrend, "Strengthening");
    assert.equal(model.inputsComplete, true);
    assert.equal(getNetDeltaLabel(2), "Slightly more aggressive than last week.");
  });

  it("names the earlier reading by its date when the week records one", () => {
    const aug31 = comparisonBasis({ label: "Aug 31" });

    assert.equal(getNetDeltaLabel(-17, aug31), "Materially more defensive since Aug 31.");
    assert.equal(getNetDeltaLabel(5, aug31), "More aggressive since Aug 31.");
    assert.equal(getNetDeltaLabel(0, aug31), "The guidance is holding where it was on Aug 31.");
    // Without a date the sentences are the ones the site always printed.
    assert.equal(getNetDeltaLabel(-17), "Materially more defensive than last week.");
    assert.equal(getNetDeltaLabel(0), "The guidance is holding where it was last week.");
  });
});
