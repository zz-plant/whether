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
    assert.match(state.text, /Funding pressure is 74, already above its change line at 70\./);
    assert.match(state.text, /Conditions have not changed yet/);
    assert.match(state.text, /waits on confirmation/);
    assert.match(state.text, /turn Cloudy once it holds/);
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
    // The watched boundary is picked on the tightness-equivalent scale, not a
    // raw point gap: tightness sits 14 points from its line while risk appetite
    // sits 12 points from its own, but the risk axis moves 4.5 points per
    // underlying slope point, so in the move the driver would have to make the
    // tightness line is by far the nearer one (a 0.08pp rate move against a
    // 0.30pp curve move). Crossing it from a willing-risk call names the
    // regime that crossing actually produces — Cloudy, the tight-willing
    // quadrant.
    assert.match(state.text, /Funding pressure rises from 56 to above 70\. Conditions then turn Cloudy\./);
    assert.equal(state.watch.dimension, "tightness");
  });

  it("keeps the future-conditional line when readings disagree with the call but no transition data exists", () => {
    // Hand-built fixtures can hold a state inconsistent with their readings;
    // without the machine's transition the truthful line stays conditional.
    const state = buildRegimeFlipState({
      regime: "EXPANSION",
      ...EXPANSION_READINGS,
    });

    assert.equal(state.pendingCandidate, null);
    assert.match(state.text, /Conditions then turn /);
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

    assert.match(state.text, /If risk appetite falls to or below 50, conditions would turn Freezing\./);
  });
});
