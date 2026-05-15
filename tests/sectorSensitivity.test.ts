import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { deriveSectorAdjustedPosture, resolveSectorKey } from "../lib/report/sectorSensitivity";

describe("deriveSectorAdjustedPosture", () => {
  it("adds upside tilt for high-sensitivity upside sectors", () => {
    const output = deriveSectorAdjustedPosture(
      {
        regime: "EXPANSION",
        scores: { tightness: 30, riskAppetite: 70 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      "b2b-saas",
    );

    assert.equal(output.basePostureLabel, "Expansion");
    assert.match(output.adjustedPostureLabel, /Expansion\+/);
    assert.match(output.adjustmentStrength, /light|moderate|strong/);
    assert.equal(output.actionBias, "loosen");
    assert.ok(output.adjustmentDelta > 0);
  });

  it("adds downside tilt for tighter sectors", () => {
    const output = deriveSectorAdjustedPosture(
      {
        regime: "DEFENSIVE",
        scores: { tightness: 72, riskAppetite: 48 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      "infrastructure",
    );

    assert.equal(output.basePostureLabel, "Defensive");
    assert.match(output.adjustedPostureLabel, /Defensive-/);
    assert.equal(output.actionBias, "tighten");
    assert.match(output.reversalCondition, /Reverse overlay bias/);
    assert.ok(output.adjustmentDelta < 0);
  });

  it("dampens overlays near boundaries", () => {
    const nearBoundary = deriveSectorAdjustedPosture(
      {
        regime: "VOLATILE",
        scores: { tightness: 69.4, riskAppetite: 49.3 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      "b2b-saas",
    );

    const farFromBoundary = deriveSectorAdjustedPosture(
      {
        regime: "VOLATILE",
        scores: { tightness: 55, riskAppetite: 70 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      "b2b-saas",
    );

    assert.ok(nearBoundary.boundaryGap < farFromBoundary.boundaryGap);
    assert.ok(nearBoundary.dampingFactor < farFromBoundary.dampingFactor);
    assert.ok(Math.abs(nearBoundary.adjustmentDelta) < Math.abs(farFromBoundary.adjustmentDelta));
  });


  it("resolves unknown sectors to canonical fallback", () => {
    assert.equal(resolveSectorKey("fintech"), "fintech");
    assert.equal(resolveSectorKey("healthcare"), "healthcare");
    assert.equal(resolveSectorKey("ai-platforms"), "ai-platforms");
    assert.equal(resolveSectorKey("unknown-sector"), "b2b-saas");
  });

  it("keeps damping stable across tiny near-threshold moves", () => {
    const first = deriveSectorAdjustedPosture(
      {
        regime: "VOLATILE",
        scores: { tightness: 69.9, riskAppetite: 49.9 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      "ai-platforms",
    );

    const second = deriveSectorAdjustedPosture(
      {
        regime: "VOLATILE",
        scores: { tightness: 69.8, riskAppetite: 49.8 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      "ai-platforms",
    );

    assert.ok(Math.abs(first.adjustmentDelta - second.adjustmentDelta) < 0.03);
    assert.equal(first.actionBias, "hold");
    assert.equal(second.actionBias, "hold");
  });
  it("keeps neutral sector in hold mode at thresholds", () => {
    const output = deriveSectorAdjustedPosture(
      {
        regime: "VOLATILE",
        scores: { tightness: 70, riskAppetite: 50 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      "consumer",
    );

    assert.equal(output.adjustedPostureLabel, "Mixed (neutral)");
    assert.equal(output.adjustmentStrength, "none");
    assert.equal(output.actionBias, "hold");
    assert.equal(output.postureVariant, "stable");
  });
});
