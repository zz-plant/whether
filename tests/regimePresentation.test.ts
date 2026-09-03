import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isValidElement, type ReactNode } from "react";
import { REGIME_DISPLAY } from "../app/viewModel";
import { renderBriefImage } from "../lib/image/briefImageTemplate";
import { getRegimeDisplayLabel, getRegimePublicLabel, getRegimeWeatherLabel, getRegimeWeatherRationale, getOrderedRegimeLegend } from "../lib/regimePresentation";

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
  it("names defensive/scarcity regimes by their weather label", () => {
    assert.equal(getRegimeDisplayLabel({ regime: "DEFENSIVE" }).label, "Cloudy");
    assert.equal(getRegimeDisplayLabel({ regime: "SCARCITY" }).label, "Freezing");
  });

  it("names volatile Stormy and keeps the transitional modifier as data", () => {
    const presentation = getRegimeDisplayLabel({ regime: "VOLATILE" });
    assert.equal(presentation.label, "Stormy");
    assert.equal(presentation.modifier, "Transitional");
    assert.equal(presentation.canonicalRegime, "VOLATILE");
  });

  it("centralizes public volatile labels across homepage and image export paths", () => {
    const image = renderBriefImage({
      decision: "Hold reversible bets",
      regime: "VOLATILE",
      postureLabel: "Stormy — Mid",
      tightness: 64,
      tightnessDelta: 0,
      confidenceLabel: "MED",
      recordDate: "June 7, 2026",
    });

    assert.equal(getRegimePublicLabel("VOLATILE"), "Stormy");
    assert.equal(REGIME_DISPLAY.VOLATILE, getRegimePublicLabel("VOLATILE"));
    assert.match(collectText(image), /Stormy · Stormy — Mid/);
    assert.doesNotMatch(collectText(image), /Uncertain · Stormy/);
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

  it("keeps the guarded modifier as data without renaming the regime", () => {
    const guarded = getRegimeDisplayLabel({
      regime: "EXPANSION",
      momentum: "deteriorating",
      confidence: "LOW",
      transitionWatch: true,
    });

    assert.equal(guarded.label, "Sunny");
    assert.equal(guarded.modifier, "Guarded");
    assert.equal(guarded.canonicalRegime, "EXPANSION");
  });
});
