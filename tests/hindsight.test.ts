import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildHindsight } from "../lib/report/hindsight";

const thresholds = { tightnessRegime: 70, riskAppetiteRegime: 50 };

describe("buildHindsight", () => {
  it("reconstructs last week's readings from this week's deltas", () => {
    const hindsight = buildHindsight({
      regime: "EXPANSION",
      scores: { tightness: 52, riskAppetite: 56 },
      deltas: { tightness: 2, riskAppetite: -3 },
      thresholds,
      recordDateLabel: "Sep 4, 2026",
    });

    assert.deepEqual(hindsight.previous, { tightness: 50, riskAppetite: 59 });
    assert.equal(hindsight.anyCrossed, false);
    assert.equal(hindsight.quiet, false);
    assert.match(hindsight.headline, /The call held\. Still Sunny/);
    assert.match(hindsight.detail, /Funding pressure 50 → 52, Risk appetite 59 → 56/);
    assert.match(hindsight.detail, /Closest is risk appetite, 6 pts from its line/);
  });

  it("names the line that was crossed", () => {
    const hindsight = buildHindsight({
      regime: "DEFENSIVE",
      scores: { tightness: 72, riskAppetite: 56 },
      deltas: { tightness: 5, riskAppetite: 0 },
      thresholds,
      recordDateLabel: "Sep 4, 2026",
    });

    assert.equal(hindsight.anyCrossed, true);
    assert.equal(hindsight.lines[0].crossed, true);
    assert.equal(hindsight.lines[1].crossed, false);
    assert.match(hindsight.headline, /A line was crossed/);
    assert.match(hindsight.detail, /Funding pressure went above 70/);
  });

  it("says so when nothing moved, instead of grading a flat week", () => {
    const hindsight = buildHindsight({
      regime: "EXPANSION",
      scores: { tightness: 52, riskAppetite: 56 },
      deltas: {},
      thresholds,
      recordDateLabel: "Sep 4, 2026",
    });

    assert.equal(hindsight.quiet, true);
    assert.match(hindsight.headline, /Nothing moved/);
  });
});
