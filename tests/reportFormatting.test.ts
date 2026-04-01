import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCompactFreshnessMeta,
  formatDecisionTriplet,
  formatRegimeSignalValue,
  formatTrendArrow,
} from "../lib/report/reportFormatting";

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
      now: new Date("2026-03-12T12:20:00.000Z"),
    });
    assert.equal(live.maxAge, "fresh");
    assert.match(live.line, /live/);
    assert.match(live.line, /<1h old/);

    const degraded = buildCompactFreshnessMeta({
      updatedAtLabel: "",
      confidenceLabel: "LOW",
      isFallbackSnapshot: true,
      now: new Date("2026-03-12T12:20:00.000Z"),
    });
    assert.equal(degraded.updatedAtLabel, "Unavailable");
    assert.equal(degraded.maxAge, "stale");
    assert.match(degraded.line, /degraded/);
  });


  it("marks stale when update age breaches freshness SLA", () => {
    const stale = buildCompactFreshnessMeta({
      updatedAtLabel: "2026-03-12T00:00:00.000Z",
      confidenceLabel: "HIGH",
      isFallbackSnapshot: false,
      now: new Date("2026-03-12T12:20:00.000Z"),
      staleAfterHours: 6,
    });

    assert.equal(stale.maxAge, "stale");
    assert.match(stale.line, /12h old/);
    assert.match(stale.line, /degraded/);
  });

  it("keeps canonical action-threshold-reversal formatting compact and prefix-safe", () => {
    const formatted = formatDecisionTriplet({
      action: "Prioritize revenue-linked hiring lanes. Keep approvals staged weekly.",
      threshold: "Pause net-new hiring if tightness > 76 or risk appetite < 44.",
      reversal: "Resume staged approvals when tightness < 66 and risk appetite > 54.",
    });

    assert.deepEqual(formatted, {
      action: "Prioritize revenue-linked hiring lanes",
      threshold: "net-new hiring if tightness > 76 or risk appetite < 44",
      reversal: "staged approvals when tightness < 66 and risk appetite > 54",
    });
  });

});
