import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";

describe("bounded decision rule formatting", () => {
  it("preserves decimals for low-magnitude score displays", () => {
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 0.4, riskAppetiteRegime: 50 },
      scores: { tightness: 0.9, riskAppetite: 56 },
    });

    assert.match(rules[0].scope, /current tightness 0\.9 and risk appetite 56\.?0?/i);
    assert.match(rules[0].pauseTrigger, /tightness > 6\.4/i);
  });
});
