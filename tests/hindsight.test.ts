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

  it("says the call is held when the machine has not confirmed the crossing", () => {
    // 2026-09-15: both lines crossed (63 → 77, 56 → 42) while the state machine
    // held Sunny at 1/2 on its confirmation gate. The headline read "A line was
    // crossed. The call is Sunny now." — a crossing is not a flip under governance.
    const hindsight = buildHindsight({
      regime: "EXPANSION",
      scores: { tightness: 77, riskAppetite: 42 },
      deltas: { tightness: 14, riskAppetite: -14 },
      thresholds,
      recordDateLabel: "Sep 11, 2026",
      regimeTransition: { pending: true, candidateState: "SCARCITY", transitionPendingCount: 1 },
    });

    assert.equal(hindsight.anyCrossed, true);
    assert.equal(hindsight.pendingLabel, "Freezing");
    assert.equal(hindsight.headline, "A line was crossed. The call holds at Sunny until the next read confirms Freezing.");
    assert.match(hindsight.detail, /Funding pressure went above 70; Risk appetite went below 50\. The flip to Freezing is waiting on a confirming read\.$/);
  });

  it("names low confidence when a pending flip has waited more than one read", () => {
    // Sep 10-14: DEFENSIVE pending 4/2, never committed because the LOW band blocks
    // the gate. Four reads in, "waiting on a confirming read" would be untrue.
    const hindsight = buildHindsight({
      regime: "EXPANSION",
      scores: { tightness: 74, riskAppetite: 56 },
      deltas: { tightness: 0, riskAppetite: 0.4 },
      thresholds,
      recordDateLabel: "Sep 10, 2026",
      regimeTransition: { pending: true, candidateState: "DEFENSIVE", transitionPendingCount: 4 },
    });

    assert.equal(hindsight.anyCrossed, false);
    assert.equal(hindsight.headline, "The call held at Sunny. The readings still say Cloudy.");
    assert.match(hindsight.detail, /has waited 4 reads for confidence to clear\.$/);
  });

  it("keeps the flip wording when the crossing committed", () => {
    const hindsight = buildHindsight({
      regime: "SCARCITY",
      scores: { tightness: 77, riskAppetite: 42 },
      deltas: { tightness: 14, riskAppetite: -14 },
      thresholds,
      recordDateLabel: "Sep 11, 2026",
      regimeTransition: { pending: false, candidateState: "SCARCITY", transitionPendingCount: 2 },
    });

    assert.equal(hindsight.pendingLabel, null);
    assert.equal(hindsight.headline, "A line was crossed. The call is Freezing now.");
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
