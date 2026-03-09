import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSignalContributions } from "../lib/report/signalFormatting";

describe("normalizeSignalContributions", () => {
  it("normalizes contribution weights to percentages and sorts descending", () => {
    const normalized = normalizeSignalContributions([
      { key: "baseRate", label: "Base rate", influence: 2 },
      { key: "tightness", label: "Cash tightness", influence: 6 },
      { key: "riskAppetite", label: "Risk appetite", influence: 2 },
    ]);

    assert.deepEqual(
      normalized.map((item) => item.key),
      ["tightness", "baseRate", "riskAppetite"],
    );
    assert.equal(normalized[0]?.normalizedPercentLabel, "60%");
    assert.equal(normalized[1]?.normalizedPercentLabel, "20%");
    assert.equal(normalized[2]?.normalizedPercentLabel, "20%");
  });

  it("keeps unavailable signals stable and pushes them after available values", () => {
    const normalized = normalizeSignalContributions([
      { key: "baseRate", label: "Base rate", influence: null, unavailable: true },
      { key: "curveSlope", label: "Curve slope", influence: 1 },
      { key: "tightness", label: "Cash tightness", influence: 3 },
    ]);

    assert.deepEqual(
      normalized.map((item) => item.key),
      ["tightness", "curveSlope", "baseRate"],
    );
    assert.equal(normalized[2]?.normalized, 0);
    assert.equal(normalized[2]?.normalizedPercentLabel, "0%");
  });
});
