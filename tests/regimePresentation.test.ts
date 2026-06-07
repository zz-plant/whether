import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isValidElement, type ReactNode } from "react";
import { REGIME_DISPLAY } from "../app/v2/viewModel";
import { renderBriefImage } from "../lib/image/briefImageTemplate";
import { getRegimeDisplayLabel, getRegimePublicLabel, getRegimeWeatherIcon, getRegimeWeatherLabel, getRegimeWeatherRationale, getOrderedRegimeLegend } from "../lib/regimePresentation";

const collectText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(collectText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return collectText(node.props.children);
  }

  return "";
};

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

  it("centralizes public volatile labels across homepage and image export paths", () => {
    const image = renderBriefImage({
      decision: "Hold reversible bets",
      regime: "VOLATILE",
      postureLabel: "Transitional Mixed",
      tightness: 64,
      tightnessDelta: 0,
      confidenceLabel: "MED",
      recordDate: "June 7, 2026",
    });

    assert.equal(getRegimePublicLabel("VOLATILE"), "Uncertain");
    assert.equal(REGIME_DISPLAY.VOLATILE, getRegimePublicLabel("VOLATILE"));
    assert.match(collectText(image), /Uncertain · Transitional Mixed/);
    assert.doesNotMatch(collectText(image), /Volatile · Transitional Mixed/);
  });


  it("associates each regime with a weather type", () => {
    assert.equal(getRegimeWeatherLabel("SCARCITY"), "Freezing");
    assert.equal(getRegimeWeatherLabel("DEFENSIVE"), "Cloudy");
    assert.equal(getRegimeWeatherLabel("VOLATILE"), "Stormy");
    assert.equal(getRegimeWeatherLabel("EXPANSION"), "Sunny");
  });

  it("includes weather labels in the ordered legend", () => {
    const legend = getOrderedRegimeLegend();
    assert.equal(legend[0]?.weather, "Freezing");
    assert.equal(legend[1]?.weather, "Cloudy");
    assert.equal(legend[2]?.weather, "Stormy");
    assert.equal(legend[3]?.weather, "Sunny");
  });

  it("gives each weather mapping a rationale that explains the posture", () => {
    assert.match(getRegimeWeatherRationale("SCARCITY"), /costs more to move/i);
    assert.match(getRegimeWeatherRationale("DEFENSIVE"), /stay selective/i);
    assert.match(getRegimeWeatherRationale("VOLATILE"), /windows open and close quickly/i);
    assert.match(getRegimeWeatherRationale("EXPANSION"), /move faster/i);
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
