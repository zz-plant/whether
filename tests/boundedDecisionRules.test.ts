import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCanonicalBoundedDecisionRules,
  buildScopedVariantDecisionAdjustment,
  extractCompactClause,
  formatBoundedDecisionReverse,
  formatBoundedDecisionTriplet,
} from "../lib/report/boundedDecisionRules";
import { buildActionStripItems, buildRoleAwareOperatingTemplates } from "../lib/report/operatingCalls";

describe("bounded decision rule formatting", () => {
  it("preserves decimals for low-magnitude score displays", () => {
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 0.4, riskAppetiteRegime: 50 },
      scores: { tightness: 0.9, riskAppetite: 56 },
    });

    assert.match(rules[0].scope, /current tightness 0\.9 and risk appetite 56\.?0?/i);
    assert.match(rules[0].pauseTrigger, /tightness crosses above 6\.4/i);
  });

  it("keeps decimal thresholds intact when compacting reversal copy", () => {
    assert.equal(
      extractCompactClause(
        "Tightness < 0.0 and Risk appetite > 54. Resume staged approvals next refresh.",
        "fallback",
      ),
      "Tightness < 0.0 and Risk appetite > 54",
    );

    const rules = buildCanonicalBoundedDecisionRules({
      regime: "DEFENSIVE",
      thresholds: { tightnessRegime: 0.0, riskAppetiteRegime: 50 },
      scores: { tightness: 8.0, riskAppetite: 44 },
    });

    assert.equal(
      formatBoundedDecisionReverse(rules[0]!),
      "staged approvals only after recovery reads show tightness below 0.0 and risk appetite above 54",
    );
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


it("formats bounded decision triplets for scan-time surfaces", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "DEFENSIVE",
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores: { tightness: 72, riskAppetite: 48 },
  });

  const hiringTriplet = formatBoundedDecisionTriplet(rules[0]!);
  assert.match(hiringTriplet.action, /backfills|mission-critical/i);
  assert.doesNotMatch(hiringTriplet.threshold, /^Pause/i);
  assert.doesNotMatch(hiringTriplet.reverse, /^Resume/i);
});


it("ensures every operating lever item includes bounded decision fields", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "DEFENSIVE",
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores: { tightness: 72, riskAppetite: 48 },
  });

  const items = buildActionStripItems(rules);
  assert.equal(items.length, 5);
  for (const item of items) {
    assert.ok(item.label.trim().length > 0);
    assert.ok(item.actionNow.trim().length > 0);
    assert.ok(item.triggerThreshold.trim().length > 0);
    assert.ok(item.reversalCondition.trim().length > 0);
  }
});


it("builds scoped variant adjustments with reversal discipline", () => {
  const adjustment = buildScopedVariantDecisionAdjustment({
    mode: "bootstrapped",
    thresholds: { tightnessRegime: 62, riskAppetiteRegime: 48 },
    scores: { tightness: 66, riskAppetite: 45 },
  });

  assert.equal(adjustment.mode, "bootstrapped");
  assert.ok(adjustment.doNowAdjustments.length > 0);
  assert.ok(adjustment.avoidAdjustments.length > 0);
  assert.ok(adjustment.watchAdjustments.length > 0);
  assert.match(adjustment.reversalTriggerDiscipline, /Reverse/i);
});


it("avoids zero-distance watch copy at regime boundaries", () => {
  const seedAdjustment = buildScopedVariantDecisionAdjustment({
    mode: "seed",
    thresholds: { tightnessRegime: 62, riskAppetiteRegime: 48 },
    scores: { tightness: 62.01, riskAppetite: 55 },
  });

  assert.match(seedAdjustment.watchAdjustments[0] ?? "", /already at the regime boundary/i);
  assert.doesNotMatch(seedAdjustment.watchAdjustments[0] ?? "", /0\.0 points/i);

  const bootstrappedAdjustment = buildScopedVariantDecisionAdjustment({
    mode: "bootstrapped",
    thresholds: { tightnessRegime: 62, riskAppetiteRegime: 48 },
    scores: { tightness: 62.02, riskAppetite: 48.01 },
  });

  assert.match(bootstrappedAdjustment.watchAdjustments[0] ?? "", /tighten spend now/i);
  assert.doesNotMatch(bootstrappedAdjustment.watchAdjustments[0] ?? "", /0\.0 points/i);
});


it("builds growth and public stage adjustments", () => {
  const growthAdjustment = buildScopedVariantDecisionAdjustment({
    mode: "growth",
    thresholds: { tightnessRegime: 62, riskAppetiteRegime: 48 },
    scores: { tightness: 60, riskAppetite: 52 },
  });

  assert.equal(growthAdjustment.mode, "growth");
  assert.match(growthAdjustment.thresholdEmphasis, /CAC payback/i);

  const publicAdjustment = buildScopedVariantDecisionAdjustment({
    mode: "public",
    thresholds: { tightnessRegime: 62, riskAppetiteRegime: 48 },
    scores: { tightness: 64, riskAppetite: 52 },
  });

  assert.equal(publicAdjustment.mode, "public");
  assert.match(publicAdjustment.thresholdEmphasis, /earnings durability/i);
});
