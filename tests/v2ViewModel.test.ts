import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { formatBoldnessDeltaLabel, CONFIDENCE_COLOR } from "../app/viewModel";

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
