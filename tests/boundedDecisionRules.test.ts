import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { buildRoleAwareOperatingTemplates } from "../lib/report/operatingCalls";

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


it("threads bounded decision rules into role templates", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "EXPANSION",
    thresholds: { tightnessRegime: 42, riskAppetiteRegime: 58 },
    scores: { tightness: 38, riskAppetite: 61 },
  });

  const templates = buildRoleAwareOperatingTemplates(rules);
  assert.match(templates[0]?.doNow ?? "", /Selective hiring|Increase product tempo/i);
  assert.doesNotMatch(templates[0]?.avoidNow ?? "", /^Pause/i);
  assert.doesNotMatch(templates[0]?.flipTrigger ?? "", /^Resume/i);
});
