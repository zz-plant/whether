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
      pointsToFlipNormalized: 3,
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
      pointsToFlipNormalized: 6,
      thresholdDirection: "fallToOrBelow",
    });

    assert.equal(state.urgencyLabel, "Medium");
    assert.ok(state.triggerLabel.includes("to or below"));
  });

  it("measures urgency on the scale the published margin cuts at, not raw points", () => {
    // A risk-appetite gap of 3 raw points is 13.5 tightness-equivalent — the
    // margin rightly calls that clear, so the meter must not call it urgent.
    const state = buildFlipRiskMeterState({
      dimensionLabel: "Risk appetite",
      dimensionKey: "riskAppetite",
      currentValue: 53,
      thresholdValue: 50,
      pointsToFlip: 3,
      pointsToFlipNormalized: 13.5,
      thresholdDirection: "fallToOrBelow",
    });

    assert.equal(state.urgencyLabel, "Low");
  });
});
