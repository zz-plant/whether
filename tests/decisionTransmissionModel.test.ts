import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildDecisionTransmission } from "../lib/report/homeBriefModel";

const buildBaseInput = () => ({
  fetchedAtLabel: "2026-04-01T12:00:00.000Z",
  assessment: {
    regime: "DEFENSIVE" as const,
    thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
    scores: { tightness: 55, riskAppetite: 45 },
  },
  regimeAlert: null,
  stopItems: ["Guardrail"],
  reportDynamics: {
    directionLabel: "deteriorating" as const,
    changedSignals: [{ key: "tightness" as const, delta: 2 }],
    anomalySignals: [],
  },
});

describe("buildDecisionTransmission", () => {
  it("builds the decision transmission contract from report inputs (happy path)", () => {
    const transmission = buildDecisionTransmission({
      ...buildBaseInput(),
      treasury: { fetched_at: "2026-04-01T12:00:00.000Z" },
      treasuryProvenance: {
        sourceLabel: "Federal Reserve Economic Data (FRED)",
        sourceUrl: "https://fred.stlouisfed.org/",
      },
      macroProvenance: {
        sourceLabel: "FRED & US Treasury",
        sourceUrl: "https://home.treasury.gov/",
      },
    }, { now: new Date("2026-04-01T18:00:00.000Z"), staleAfterHours: 24 });

    assert.ok(transmission.whatChanged.length > 0);
    assert.ok(transmission.postureNow.length > 0);
    assert.ok(transmission.boundedRules.length > 0);
    assert.equal(transmission.boundedRules.some((rule) => rule.manualReviewRequired), false);
    assert.ok(transmission.flipConditions.length > 0);
    assert.equal(transmission.freshness.stalenessLabel, "fresh");
    assert.match(transmission.confidence, /high|medium|low|unknown/);
    assert.equal(transmission.provenance[0]?.isFallback, false);
  });

  it("emits explicit provenance fallback markers when source metadata is absent", () => {
    const transmission = buildDecisionTransmission(buildBaseInput());

    assert.equal(transmission.provenance.length, 1);
    assert.equal(transmission.provenance[0]?.sourceLabel, "Sources unavailable");
    assert.equal(transmission.provenance[0]?.reference, "fallback:manual-source-review-required");
    assert.equal(transmission.provenance[0]?.isFallback, true);
  });

  it("emits a bounded-rule manual review placeholder when thresholds are unavailable", () => {
    const transmission = buildDecisionTransmission({
      ...buildBaseInput(),
      actionStripItems: [
        {
          lever: "hiring-stance",
          label: "Hiring",
          actionNow: "Hold net-new hiring.",
          triggerThreshold: " ",
          reversalCondition: "",
        },
      ],
    });

    assert.equal(transmission.boundedRules.length, 1);
    assert.equal(transmission.boundedRules[0]?.manualReviewRequired, true);
    assert.match(transmission.boundedRules[0]?.triggerThreshold ?? "", /review thresholds manually/i);
    assert.match(transmission.boundedRules[0]?.reversalCondition ?? "", /review reversal conditions manually/i);
  });

  it("labels stale data when fetched timestamp exceeds freshness window", () => {
    const transmission = buildDecisionTransmission({
      ...buildBaseInput(),
      treasury: { fetched_at: "2026-03-25T00:00:00.000Z" },
    }, { now: new Date("2026-04-02T00:00:00.000Z"), staleAfterHours: 24 });

    assert.equal(transmission.freshness.stalenessLabel, "stale");
  });
});
