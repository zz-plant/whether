import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRegimeDisplayLabel, getRegimeWeatherIcon, getRegimeWeatherLabel, getOrderedRegimeLegend } from "../lib/regimePresentation";

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


  it("associates each regime with a weather type", () => {
    assert.equal(getRegimeWeatherLabel("SCARCITY"), "Hard Freeze");
    assert.equal(getRegimeWeatherLabel("DEFENSIVE"), "Overcast");
    assert.equal(getRegimeWeatherLabel("VOLATILE"), "Squall Line");
    assert.equal(getRegimeWeatherLabel("EXPANSION"), "Clear Skies");
  });

  it("includes weather labels in the ordered legend", () => {
    const legend = getOrderedRegimeLegend();
    assert.equal(legend[0]?.weather, "Hard Freeze");
    assert.equal(legend[1]?.weather, "Overcast");
    assert.equal(legend[2]?.weather, "Squall Line");
    assert.equal(legend[3]?.weather, "Clear Skies");
  });

  it("maps each regime to a weather icon key", () => {
    assert.equal(getRegimeWeatherIcon("SCARCITY"), "snowflake");
    assert.equal(getRegimeWeatherIcon("DEFENSIVE"), "cloud");
    assert.equal(getRegimeWeatherIcon("VOLATILE"), "storm");
    assert.equal(getRegimeWeatherIcon("EXPANSION"), "sun");

    const legend = getOrderedRegimeLegend();
    assert.equal(legend[0]?.weatherIcon, "snowflake");
    assert.equal(legend[1]?.weatherIcon, "cloud");
    assert.equal(legend[2]?.weatherIcon, "storm");
    assert.equal(legend[3]?.weatherIcon, "sun");
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
