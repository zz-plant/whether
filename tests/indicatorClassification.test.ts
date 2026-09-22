import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { indicatorKindLabel, indicatorTypeBySignal } from "../lib/indicatorClassification";

describe("indicator classification", () => {
  it("classifies the score drivers as leading or lagging, and the base rate as neither", () => {
    assert.equal(indicatorTypeBySignal.tightness, "lagging");
    assert.equal(indicatorTypeBySignal.riskAppetite, "leading");
    assert.equal(indicatorTypeBySignal.curveSlope, "leading");
    assert.equal(indicatorKindLabel("baseRate"), null);
    assert.equal(indicatorKindLabel("curveSlope"), "Leading (predictive)");
  });
});
