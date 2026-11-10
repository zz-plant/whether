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
import { buildActionStripItems, buildRoleAwareOperatingTemplates } from "../lib/report/operatingCalls";

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
  assert.match(templates[0]?.doNow ?? "", /Hire selectively|Increase product tempo/i);
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
  assert.match(hiringTriplet.action, /replace people who leave|critical hires/i);
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

it("keeps the pause line nearest the reading and the restart line holding the area back", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "DEFENSIVE",
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores: { tightness: 72, riskAppetite: 48 },
  });

  const items = buildActionStripItems(rules, { tightness: 72, riskAppetite: 48 });
  const hiringItem = items.find((item) => item.lever === "hiring-stance");
  assert.ok(hiringItem);
  assert.ok(hiringItem.nearestPause, "the pause side knows how far its line is");
  assert.ok(hiringItem.bindingResume, "the resume side knows how far its line is");
  /* A resume needs every line, so the one shown is the furthest still unmet. */
  const unmet = (hiringItem.resumeConditions ?? [])
    .map((condition) => Math.abs(condition.value - (condition.metric === "tightness" ? 72 : 48)))
    .filter((points) => points > 0);
  assert.equal(hiringItem.bindingResume?.pointsToLine, Math.max(...unmet));
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


it("watches each stage's published pause line, never today's distance from the change line", () => {
  /* The stage lines read "tighten if funding pressure moves within 20.0 points of the
     line", with today's gap as the number: true the moment it printed. */
  const freezing = { thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 }, scores: { tightness: 90, riskAppetite: 48 } };
  const seed = buildScopedVariantDecisionAdjustment({ mode: "seed", ...freezing });
  assert.equal(seed.watchAdjustments[0], "Runway: tighten if funding pressure is above 76 for 2 readings in a row. Funding pressure is 90 now.");
  const seriesA = buildScopedVariantDecisionAdjustment({ mode: "series-a", ...freezing });
  assert.equal(seriesA.watchAdjustments[0], "Payback trigger: revisit the plan if risk appetite falls below 44.");
  const bootstrapped = buildScopedVariantDecisionAdjustment({ mode: "bootstrapped", ...freezing });
  assert.match(bootstrapped.watchAdjustments[0] ?? "", /funding pressure is above 76 or risk appetite falls below 44\. Funding pressure is 90 now\./);
  for (const mode of ["seed", "series-a", "series-b", "growth", "public", "bootstrapped"] as const) {
    const line = buildScopedVariantDecisionAdjustment({ mode, ...freezing }).watchAdjustments[0] ?? "";
    assert.doesNotMatch(line, /moves within|comes within|points of (the|its) line/, mode);
    assert.match(line, /\b(76|44)\b/, mode);
  }
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
