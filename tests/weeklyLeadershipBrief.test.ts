import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildBoldnessScore,
  buildWeeklyLeadershipBriefModel,
  getNetDeltaLabel,
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

  it("trend labels are deterministic", () => {
    assert.equal(toTrendLabel(3), "Strengthening");
    assert.equal(toTrendLabel(-3), "Cooling");
    assert.equal(toTrendLabel(0), "Flat");
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
    assert.equal(getNetDeltaLabel(2), "Operating latitude up slightly since last week.");
  });

  it("names the earlier reading by its date when the week records one", () => {
    const aug31 = comparisonBasis({ label: "Aug 31" });

    assert.equal(getNetDeltaLabel(-17, aug31), "Operating latitude down sharply since Aug 31.");
    assert.equal(getNetDeltaLabel(5, aug31), "Operating latitude up since Aug 31.");
    assert.equal(getNetDeltaLabel(0, aug31), "Operating latitude unchanged since Aug 31.");
    assert.equal(getNetDeltaLabel(-17), "Operating latitude down sharply since last week.");
    assert.equal(getNetDeltaLabel(0), "Operating latitude unchanged since last week.");
  });

  /* The latitude is a blend of the two scores, so it can stay flat on a week the
     guidance changed. Its sentence said "The guidance is holding where it was on
     Aug 31." on a zero move; it speaks about the number now, and never about the
     guidance, at any size of move. */
  it("never says anything about the guidance", () => {
    for (const delta of [-17, -5, -1, 0, 1, 5, 17]) {
      assert.doesNotMatch(getNetDeltaLabel(delta), /guidance|aggressive|defensive/i);
    }
  });
});
