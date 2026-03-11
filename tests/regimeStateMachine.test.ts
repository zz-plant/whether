import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegimeStateMachine } from "../lib/report/regimeStateMachine";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";

describe("regime state machine", () => {
  it("transitions across explicit threshold rules", () => {
    const first = evaluateRegimeStateMachine({
      scores: { tightness: 80, riskAppetite: 40 },
      thresholds: DEFAULT_THRESHOLDS,
      asOf: "2026-01-01",
      confidence: "HIGH",
    });

    const next = evaluateRegimeStateMachine({
      previousState: first.state,
      scores: { tightness: 62, riskAppetite: 65 },
      thresholds: DEFAULT_THRESHOLDS,
      asOf: "2026-01-02",
      confidence: "MEDIUM",
    });

    assert.equal(first.state.regime, "SCARCITY");
    assert.equal(next.state.regime, "EXPANSION");
    assert.equal(next.transition?.from, "SCARCITY");
    assert.equal(next.transition?.to, "EXPANSION");
  });
});
