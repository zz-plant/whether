import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRegimeDisplayLabel } from "../lib/regimePresentation";

describe("regime presentation labels", () => {
  it("keeps contraction mapping for defensive/scarcity regimes", () => {
    assert.equal(getRegimeDisplayLabel({ regime: "DEFENSIVE" }).label, "Contraction");
    assert.equal(getRegimeDisplayLabel({ regime: "SCARCITY" }).label, "Contraction");
  });

  it("maps volatile to transitional mixed", () => {
    const presentation = getRegimeDisplayLabel({ regime: "VOLATILE" });
    assert.equal(presentation.label, "Transitional Mixed");
    assert.equal(presentation.canonicalRegime, "VOLATILE");
  });

  it("adds guarded modifier to expansion when diagnostics are fragile", () => {
    const guarded = getRegimeDisplayLabel({
      regime: "EXPANSION",
      momentum: "deteriorating",
      confidence: "LOW",
      transitionWatch: true,
    });

    assert.equal(guarded.label, "Guarded Expansion");
    assert.equal(guarded.canonicalRegime, "EXPANSION");
  });
});
