import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clipZScore,
  computeCompositeScore,
  computeVolatility,
  computeZScore,
  directionalNormalize,
} from "../lib/policy/transforms";

describe("policy transforms", () => {
  it("computes z-score and directional normalization", () => {
    const z = computeZScore(6, { mean: 4, stdDev: 2 });
    assert.equal(z, 1);
    assert.equal(directionalNormalize(z, "HIGHER_IS_TIGHTER"), 1);
    assert.equal(directionalNormalize(z, "HIGHER_IS_LOOSER"), -1);
  });

  it("clips z-scores to bounds", () => {
    assert.equal(clipZScore(4.5, 3), 3);
    assert.equal(clipZScore(-7, 3), -3);
    assert.equal(clipZScore(1.2, 3), 1.2);
  });

  it("builds composite and volatility", () => {
    assert.equal(computeCompositeScore(2, 0.5, -1, 0.5), 0.5);
    assert.ok(computeVolatility([0, 1, -1, 0.5]) > 0);
  });
});
