import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indicatorTypeByScoreLabel } from "../lib/indicatorClassification";

describe("indicator classification", () => {
  it("classifies all score drivers as leading or lagging", () => {
    assert.equal(indicatorTypeByScoreLabel.Tightness, "lagging");
    assert.equal(indicatorTypeByScoreLabel["Risk appetite"], "leading");
    assert.equal(indicatorTypeByScoreLabel["Curve slope"], "leading");
  });
});
