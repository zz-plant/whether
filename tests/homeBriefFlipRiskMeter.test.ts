import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildFlipRiskMeterState } from "../lib/report/homeBriefModel";

describe("buildFlipRiskMeterState", () => {
  it("marks near-boundary distances as high urgency", () => {
    const state = buildFlipRiskMeterState({
      dimensionLabel: "Tightness",
      dimensionKey: "tightness",
      currentValue: 67,
      thresholdValue: 70,
      pointsToFlip: 3,
      thresholdDirection: "riseAbove",
    });

    assert.equal(state.urgencyLabel, "High");
    assert.ok(state.progressPercent > 70);
  });

  it("marks medium distances as medium urgency", () => {
    const state = buildFlipRiskMeterState({
      dimensionLabel: "Risk appetite",
      dimensionKey: "riskAppetite",
      currentValue: 56,
      thresholdValue: 50,
      pointsToFlip: 6,
      thresholdDirection: "fallToOrBelow",
    });

    assert.equal(state.urgencyLabel, "Medium");
    assert.ok(state.triggerLabel.includes("to or below"));
  });
});
