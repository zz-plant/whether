import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRegimeSignalValue, formatTrendArrow } from "../lib/report/reportFormatting";

describe("reportFormatting regime signal helpers", () => {
  it("formats regime signal values with score vs decimal precision", () => {
    assert.equal(formatRegimeSignalValue(63.7, "tightness"), "64");
    assert.equal(formatRegimeSignalValue(48.2, "riskAppetite"), "48");
    assert.equal(formatRegimeSignalValue(5.26, "baseRate"), "5.3");
    assert.equal(formatRegimeSignalValue(-0.44, "curveSlope"), "-0.4");
    assert.equal(formatRegimeSignalValue(null, "curveSlope"), "—");
  });

  it("maps delta sign to trend arrows", () => {
    assert.equal(formatTrendArrow(1.2), "↑");
    assert.equal(formatTrendArrow(-0.6), "↓");
    assert.equal(formatTrendArrow(0), "→");
    assert.equal(formatTrendArrow(null), "→");
  });
});
