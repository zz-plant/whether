import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { buildActionStripItems, buildRoleAwareOperatingTemplates } from "../lib/report/operatingCalls";

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


it("ensures every operating lever item includes bounded decision fields", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "DEFENSIVE",
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores: { tightness: 72, riskAppetite: 48 },
  });

  const items = buildActionStripItems(rules);
  assert.equal(items.length, 5);
  const salesItem = items.find((item) => item.lever === "sales-posture");
  assert.ok(salesItem);
  assert.match(salesItem?.actionNow ?? "", /GTM|pipeline|conversion|sales/i);
  assert.doesNotMatch(salesItem?.actionNow ?? "", /raise|fundraising|investor/i);
  for (const item of items) {
    assert.ok(item.label.trim().length > 0);
    assert.ok(item.actionNow.trim().length > 0);
    assert.ok(item.triggerThreshold.trim().length > 0);
    assert.ok(item.reversalCondition.trim().length > 0);
  }
});
