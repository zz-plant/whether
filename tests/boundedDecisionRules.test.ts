import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCanonicalBoundedDecisionRules,
  buildScopedVariantDecisionAdjustment,
  extractCompactClause,
  formatBoundedDecisionReverse,
  formatBoundedDecisionTriplet,
  formatSharedFlipCorridor,
} from "../lib/report/boundedDecisionRules";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";
import type { ActionStripItem } from "../lib/report/operatingCalls";
import { buildWipGuidance } from "../lib/report/wipPolicy";
import { buildActionStripItems, buildPullPolicyBlocks, buildRoleAwareOperatingTemplates } from "../lib/report/operatingCalls";

describe("bounded decision rule formatting", () => {
  it("preserves decimals for low-magnitude score displays", () => {
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 0.4, riskAppetiteRegime: 50 },
      scores: { tightness: 0.9, riskAppetite: 56 },
    });

    assert.match(rules[0].scope, /current funding pressure 0\.9 and risk appetite 56\.?0?/i);
    assert.match(rules[0].pauseTrigger, /funding pressure rises above 6\.4/i);
  });

  it("keeps decimal thresholds intact when compacting reversal copy", () => {
    assert.equal(
      extractCompactClause(
        "Funding pressure < 0.0 and Risk appetite > 54. Resume staged approvals next refresh.",
        "fallback",
      ),
      "Funding pressure < 0.0 and Risk appetite > 54",
    );

    const rules = buildCanonicalBoundedDecisionRules({
      regime: "DEFENSIVE",
      thresholds: { tightnessRegime: 0.0, riskAppetiteRegime: 50 },
      scores: { tightness: 8.0, riskAppetite: 44 },
    });

    assert.equal(
      formatBoundedDecisionReverse(rules[0]!),
      "Funding pressure falls below 0 and risk appetite is above 54",
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
    assert.ok(item.areaActionNow.trim().length > 0);
    assert.ok(item.triggerThreshold.trim().length > 0);
    assert.ok(item.reversalCondition.trim().length > 0);
  }
});

it("keeps caution and reopen distances available with crossing/above-below threshold wording", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "DEFENSIVE",
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores: { tightness: 72, riskAppetite: 48 },
  });

  const items = buildActionStripItems(rules, { tightness: 72, riskAppetite: 48 });
  const hiringItem = items.find((item) => item.lever === "hiring-stance");
  assert.ok(hiringItem);
  assert.doesNotMatch(hiringItem.tightenDistanceLabel ?? "", /unavailable/i);
  assert.doesNotMatch(hiringItem.reopenDistanceLabel ?? "", /unavailable/i);
  assert.match(hiringItem.reopenDistanceLabel ?? "", /funding pressure|risk appetite/i);
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

  assert.match(seedAdjustment.watchAdjustments[0] ?? "", /already at the line that changes the call/i);
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
  assert.match(growthAdjustment.thresholdEmphasis, /acquisition cost payback/i);

  const publicAdjustment = buildScopedVariantDecisionAdjustment({
    mode: "public",
    thresholds: { tightnessRegime: 62, riskAppetiteRegime: 48 },
    scores: { tightness: 64, riskAppetite: 52 },
  });

  assert.equal(publicAdjustment.mode, "public");
  assert.match(publicAdjustment.thresholdEmphasis, /earnings durability/i);
});

describe("shared flip corridor", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "EXPANSION",
    thresholds: { tightnessRegime: 62, riskAppetiteRegime: 48 },
    scores: { tightness: 60, riskAppetite: 52 },
  });

  it("states the corridor once when every lever clears on the same lines", () => {
    const corridor = formatSharedFlipCorridor(rules);

    // Every area's flipConditions are built from the same tightnessResume /
    // riskResume pair, so the whole ledger collapses to two lines.
    assert.ok(corridor, "expected a corridor when the rules share their clear conditions");
    assert.equal(corridor?.split(" · ").length, 2);
    assert.match(corridor ?? "", /Funding pressure </);
    assert.match(corridor ?? "", /Risk appetite >/);
  });

  it("declines to claim a shared corridor when the rules diverge", () => {
    // One distinct condition per rule is not a shared corridor; saying otherwise
    // would invent a relationship the model does not actually encode.
    const diverging: BoundedDecisionRule[] = rules.slice(0, 2).map((rule, index) => ({
      ...rule,
      flipConditions: [
        {
          metric: "tightness",
          operator: "<",
          value: 10 + index,
          label: `Funding pressure < ${10 + index}`,
        },
      ],
    }));

    assert.equal(formatSharedFlipCorridor(diverging), null);
  });

  it("returns null when there are too few rules to share anything", () => {
    assert.equal(formatSharedFlipCorridor(rules.slice(0, 1)), null);
  });
});

describe("kanban pull-policy blocks", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "DEFENSIVE",
    thresholds: { tightnessRegime: 42, riskAppetiteRegime: 58 },
    scores: { tightness: 52, riskAppetite: 46 },
  });
  const items = buildActionStripItems(rules, { tightness: 52, riskAppetite: 46 });

  it("states stop/resume lines from the same conditions the pause/resume lines carry", () => {
    const blocks = buildPullPolicyBlocks(items);

    assert.equal(blocks.length, items.length);
    for (const [index, block] of blocks.entries()) {
      const item = items[index];
      for (const condition of item.pauseConditions ?? []) {
        assert.ok(
          block.stopPullingWhen.includes(condition.label),
          `${block.label} stop line must carry the pause condition "${condition.label}"`,
        );
      }
      for (const condition of item.resumeConditions ?? []) {
        assert.ok(
          block.resumeWhen.includes(condition.label),
          `${block.label} resume line must carry the resume condition "${condition.label}"`,
        );
      }
      assert.ok(block.stopPullingWhen.length > 0, "a pull policy without a stop line is not a policy");
      assert.ok(block.resumeWhen.length > 0, "a pull policy without a resume line is not a policy");
    }
  });

  it("falls back to the item's printed threshold and reversal when no numeric lines exist", () => {
    const fallback: ActionStripItem[] = [{
      lever: "product-priorities",
      label: "Product priorities",
      areaActionNow: "Keep the roadmap reversible.",
      triggerThreshold: "Pause speculative builds above 60.",
      reversalCondition: "Resume when funding pressure drops below 50.",
    }];

    const [block] = buildPullPolicyBlocks(fallback);

    assert.ok(block);
    assert.equal(block.stopPullingWhen, "Pause speculative builds above 60.");
    assert.equal(block.resumeWhen, "Resume when funding pressure drops below 50.");
    assert.match(block.markdown, /Pull policy — Product priorities/);
    assert.match(block.markdown, /Pull: Keep the roadmap reversible\./);
  });
});

describe("regime-derived WIP caps", () => {
  it("caps tighter regimes lower and expansion higher", () => {
    const defensive = buildWipGuidance({ regime: "DEFENSIVE" });
    const expansion = buildWipGuidance({ regime: "EXPANSION" });

    assert.equal(defensive.cap, 1);
    assert.equal(expansion.cap, 3);
    assert.ok(defensive.cap < expansion.cap);
    assert.match(defensive.sentence, /Cap parallel bets at 1/);
    assert.match(expansion.sentence, /Cap parallel bets at 3/);
  });

  it("scales the cap by the runway band, floored at one", () => {
    const critical = buildWipGuidance({ regime: "EXPANSION", runwayBand: "critical" });
    const abundant = buildWipGuidance({ regime: "DEFENSIVE", runwayBand: "abundant" });
    const scarcest = buildWipGuidance({ regime: "SCARCITY", runwayBand: "critical" });

    assert.equal(critical.cap, 2, "expansion with critical runway is one lower");
    assert.equal(abundant.cap, 2, "defensive with abundant runway is one higher");
    assert.equal(scarcest.cap, 1, "the cap never reads as a freeze");
    assert.match(critical.sentence, /given .* runway/);
  });

  it("carries the cap as a copyable block", () => {
    const guidance = buildWipGuidance({ regime: "VOLATILE", runwayBand: "tight" });

    assert.match(guidance.markdown, /WIP policy — VOLATILE/);
    assert.match(guidance.markdown, /Parallel bets: 2/);
    assert.match(guidance.markdown, /finish one before pulling the next/);
  });
});
