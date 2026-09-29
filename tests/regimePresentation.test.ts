import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isValidElement, type ReactNode } from "react";
import { buildScoreReadings } from "../lib/export/scoreReference";
import { renderBriefImage } from "../lib/image/briefImageTemplate";
import { getRegimeDisplayLabel, getRegimePublicLabel, getRegimeWeatherRationale, getOrderedRegimeLegend } from "../lib/regimePresentation";

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
      readings: buildScoreReadings({ scores: { tightness: 64, riskAppetite: 48 } }),
      confidenceLabel: "MED",
      recordDate: "June 7, 2026",
    });
    const text = collectText(image);

    assert.equal(getRegimePublicLabel("VOLATILE"), "Stormy");
    /* The stamp names the weather once; it used to print it twice ("Stormy · Stormy — Mid"). */
    assert.equal(text.match(/stormy/gi)?.length, 1);
    assert.match(text, /STORMY/);
    assert.doesNotMatch(text, /Uncertain/i);
  });


  it("associates each regime with a weather type", () => {
    assert.equal(getRegimePublicLabel("SCARCITY"), "Freezing");
    assert.equal(getRegimePublicLabel("DEFENSIVE"), "Cloudy");
    assert.equal(getRegimePublicLabel("VOLATILE"), "Stormy");
    assert.equal(getRegimePublicLabel("EXPANSION"), "Sunny");
  });

  it("includes weather labels in the ordered legend", () => {
    const legend = getOrderedRegimeLegend();
    assert.equal(legend[0]?.weather, "Freezing");
    assert.equal(legend[1]?.weather, "Cloudy");
    assert.equal(legend[2]?.weather, "Stormy");
    assert.equal(legend[3]?.weather, "Sunny");
  });

  it("gives each weather word one fact about money — the condition, never the instruction", () => {
    assert.match(getRegimeWeatherRationale("SCARCITY"), /expensive and hard to raise/i);
    assert.match(getRegimeWeatherRationale("DEFENSIVE"), /available but pricey/i);
    assert.match(getRegimeWeatherRationale("VOLATILE"), /changing week to week/i);
    assert.match(getRegimeWeatherRationale("EXPANSION"), /cheap and available/i);
    // The instruction half ("Move faster", "Conserve cash") moved to the call
    // alone: beside a cautionary call it read as two recommendations
    // disagreeing, when the truth is one condition and one constraint.
    for (const { weatherRationale, ariaLabel, weather } of getOrderedRegimeLegend()) {
      assert.doesNotMatch(weatherRationale, /heat|shelter|footing|layers|visibility|windows/i, "the metaphor is cashed out, not extended");
      assert.doesNotMatch(weatherRationale, /\b(move faster|conserve cash|fund what|hold the rest|commit|pause line)\b/i, "the rationale states conditions, not advice");
      assert.ok(ariaLabel.startsWith(`${weather}: `), "the legend's screen-reader label leads with the weather word");
      assert.ok(ariaLabel.endsWith(weatherRationale), "and carries the same sentence");
    }
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
