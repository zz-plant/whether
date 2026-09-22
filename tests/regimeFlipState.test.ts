import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildRegimeFlipState } from "../lib/report/regimeFlipState";

const EXPANSION_READINGS = {
  scores: { tightness: 74, riskAppetite: 56 },
  thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
};

describe("buildRegimeFlipState", () => {
  it("states a truthful pending change when the machine holds the call behind its gate", () => {
    const state = buildRegimeFlipState({
      regime: "EXPANSION",
      ...EXPANSION_READINGS,
      // The machine's own transition: the readings classify as DEFENSIVE while
      // the committed call holds, pending confirmation.
      regimeTransition: {
        nextState: "EXPANSION",
        candidateState: "DEFENSIVE",
        committed: false,
        pending: true,
        transitionReason: "Funding pressure crossed above 70.",
        transitionPendingCount: 1,
        snapshot: {
          committedState: "EXPANSION",
          pendingState: "DEFENSIVE",
          pendingCount: 1,
        },
      },
    });

    assert.equal(state.pendingCandidate, "DEFENSIVE");
    assert.match(state.text, /already above its 70 boundary/);
    assert.match(state.text, /has not flipped yet/);
    assert.match(state.text, /waits on confirmation/);
    assert.match(state.text, /flips to Cloudy once it holds/);
    // The watched line is the one that changes the flip target, not the one
    // already crossed.
    assert.equal(state.watch.dimension, "riskAppetite");
    assert.equal(state.watch.direction, "fallToOrBelow");
  });

  it("keeps the future-conditional line when the machine holds no pending change", () => {
    const state = buildRegimeFlipState({
      regime: "EXPANSION",
      scores: { tightness: 56, riskAppetite: 62 },
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    });

    assert.equal(state.pendingCandidate, null);
    // The nearest boundary is risk appetite, and crossing it from a willing-risk
    // call names the regime that crossing actually produces — Stormy, the
    // loose-unwilling quadrant — not the call's primary shift target.
    assert.match(state.text, /Risk appetite falls to or below 50 \(62 today\), which flips the call to Stormy\./);
    assert.equal(state.watch.dimension, "riskAppetite");
  });

  it("keeps the future-conditional line when readings disagree with the call but no transition data exists", () => {
    // Hand-built fixtures can hold a state inconsistent with their readings;
    // without the machine's transition the truthful line stays conditional.
    const state = buildRegimeFlipState({
      regime: "EXPANSION",
      ...EXPANSION_READINGS,
    });

    assert.equal(state.pendingCandidate, null);
    assert.match(state.text, /flips the call to/);
  });

  it("names the target change when the watched boundary would cross", () => {
    const state = buildRegimeFlipState({
      regime: "EXPANSION",
      ...EXPANSION_READINGS,
      regimeTransition: {
        nextState: "EXPANSION",
        candidateState: "DEFENSIVE",
        committed: false,
        pending: true,
        transitionReason: "Funding pressure crossed above 70.",
        transitionPendingCount: 1,
        snapshot: {
          committedState: "EXPANSION",
          pendingState: "DEFENSIVE",
          pendingCount: 1,
        },
      },
    });

    assert.match(state.text, /If risk appetite falls to or below 50, the call would change to Freezing\./);
  });
});
