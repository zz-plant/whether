import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  computeReliabilityScore,
  formatBoldnessDeltaLabel,
  CONFIDENCE_COLOR,
  RELIABILITY_COLOR,
  RELIABILITY_BAR,
} from "../app/viewModel";

describe("formatBoldnessDeltaLabel", () => {
  it("returns 'no change vs last week' for zero delta", () => {
    assert.equal(formatBoldnessDeltaLabel(0), "no change vs last week");
    assert.equal(formatBoldnessDeltaLabel(-0), "no change vs last week");
  });

  it("prefixes positive deltas with +", () => {
    assert.equal(formatBoldnessDeltaLabel(5), "+5 vs last week");
    assert.equal(formatBoldnessDeltaLabel(12), "+12 vs last week");
  });

  it("keeps negative deltas with leading minus", () => {
    assert.equal(formatBoldnessDeltaLabel(-3), "-3 vs last week");
    assert.equal(formatBoldnessDeltaLabel(-7), "-7 vs last week");
  });

  it("rounds to integer via toFixed(0)", () => {
    assert.equal(formatBoldnessDeltaLabel(3.7), "+4 vs last week");
    assert.equal(formatBoldnessDeltaLabel(-2.3), "-2 vs last week");
  });
});

describe("computeReliabilityScore", () => {
  it("returns high score for HIGH confidence with no issues", () => {
    const score = computeReliabilityScore({
      confidenceLabel: "HIGH",
      showOfflineBadge: false,
      degradedCount: 0,
    });
    assert.ok(score >= 80, `expected >= 80, got ${score}`);
  });

  it("returns medium score for MED confidence with no issues", () => {
    const score = computeReliabilityScore({
      confidenceLabel: "MED",
      showOfflineBadge: false,
      degradedCount: 0,
    });
    assert.equal(score, 87);
  });

  it("returns low score for LOW confidence", () => {
    const score = computeReliabilityScore({
      confidenceLabel: "LOW",
      showOfflineBadge: false,
      degradedCount: 0,
    });
    assert.equal(score, 77);
  });

  it("penalizes offline badge", () => {
    const online = computeReliabilityScore({
      confidenceLabel: "HIGH",
      showOfflineBadge: false,
      degradedCount: 0,
    });
    const offline = computeReliabilityScore({
      confidenceLabel: "HIGH",
      showOfflineBadge: true,
      degradedCount: 0,
    });
    assert.ok(offline < online, `offline ${offline} should be < online ${online}`);
  });

  it("penalizes degraded source count", () => {
    const clean = computeReliabilityScore({
      confidenceLabel: "HIGH",
      showOfflineBadge: false,
      degradedCount: 0,
    });
    const degraded = computeReliabilityScore({
      confidenceLabel: "HIGH",
      showOfflineBadge: false,
      degradedCount: 3,
    });
    assert.ok(degraded < clean, `degraded ${degraded} should be < clean ${clean}`);
  });

  it("treats unknown confidence labels like LOW", () => {
    const score = computeReliabilityScore({
      confidenceLabel: "UNKNOWN",
      showOfflineBadge: false,
      degradedCount: 0,
    });
    assert.equal(score, 77);
  });
});

describe("CONFIDENCE_COLOR", () => {
  it("returns emerald for HIGH", () => {
    assert.equal(CONFIDENCE_COLOR("HIGH"), "text-emerald-300");
  });

  it("returns amber for MED", () => {
    assert.equal(CONFIDENCE_COLOR("MED"), "text-amber-300");
  });

  it("returns rose for anything else", () => {
    assert.equal(CONFIDENCE_COLOR("LOW"), "text-rose-300");
    assert.equal(CONFIDENCE_COLOR("UNKNOWN"), "text-rose-300");
  });
});

describe("RELIABILITY_COLOR", () => {
  it("returns emerald for scores >= 80", () => {
    assert.equal(RELIABILITY_COLOR(80), "text-emerald-300");
    assert.equal(RELIABILITY_COLOR(100), "text-emerald-300");
  });

  it("returns amber for mid-range scores", () => {
    assert.equal(RELIABILITY_COLOR(60), "text-amber-300");
    assert.equal(RELIABILITY_COLOR(79), "text-amber-300");
  });

  it("returns rose for scores below 60", () => {
    assert.equal(RELIABILITY_COLOR(59), "text-rose-300");
    assert.equal(RELIABILITY_COLOR(0), "text-rose-300");
  });
});

describe("RELIABILITY_BAR", () => {
  it("returns bg-emerald for scores >= 80", () => {
    assert.equal(RELIABILITY_BAR(85), "bg-emerald-400");
  });

  it("returns bg-amber for mid-range", () => {
    assert.equal(RELIABILITY_BAR(65), "bg-amber-400");
  });

  it("returns bg-rose for low scores", () => {
    assert.equal(RELIABILITY_BAR(30), "bg-rose-400");
  });
});
