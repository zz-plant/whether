import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCompactFreshnessMeta, formatRegimeSignalValue, formatTrendArrow } from "../lib/report/reportFormatting";

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

  it("builds compact freshness line with degraded marker and confidence cue", () => {
    const live = buildCompactFreshnessMeta({
      updatedAtLabel: "2026-03-12T12:00:00.000Z",
      confidenceLabel: "HIGH",
      isFallbackSnapshot: false,
    });
    assert.equal(live.maxAge, "fresh");
    assert.match(live.line, /live/);

    const degraded = buildCompactFreshnessMeta({
      updatedAtLabel: "",
      confidenceLabel: "LOW",
      isFallbackSnapshot: true,
    });
    assert.equal(degraded.updatedAtLabel, "Unavailable");
    assert.equal(degraded.maxAge, "stale");
    assert.match(degraded.line, /degraded/);
  });

});
