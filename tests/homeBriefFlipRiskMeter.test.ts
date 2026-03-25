import { describe, expect, test } from "bun:test";
import { buildFlipRiskMeterState } from "../lib/report/homeBriefModel";

describe("buildFlipRiskMeterState", () => {
  test("marks near-boundary distances as high urgency", () => {
    const state = buildFlipRiskMeterState({
      dimensionLabel: "Tightness",
      dimensionKey: "tightness",
      currentValue: 67,
      thresholdValue: 70,
      pointsToFlip: 3,
      thresholdDirection: "riseAbove",
    });

    expect(state.urgencyLabel).toBe("High");
    expect(state.progressPercent).toBeGreaterThan(70);
  });

  test("marks medium distances as medium urgency", () => {
    const state = buildFlipRiskMeterState({
      dimensionLabel: "Risk appetite",
      dimensionKey: "riskAppetite",
      currentValue: 56,
      thresholdValue: 50,
      pointsToFlip: 6,
      thresholdDirection: "fallToOrBelow",
    });

    expect(state.urgencyLabel).toBe("Medium");
    expect(state.triggerLabel).toContain("to or below");
  });
});
