import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { buildV2HeroSignalData } from "../app/v2/viewModel";

describe("v2 hero signal data", () => {
  it("builds hero macro inputs from assembled report data", () => {
    const signalData = buildV2HeroSignalData({
      assessment: {
        scores: {
          baseRate: 4.91,
          baseRateUsed: "1M",
          curveSlope: -0.27,
        },
        thresholds: {
          tightnessRegime: 68,
        },
      },
      reportDynamics: {
        signalContributions: [
          { label: "Curve slope", normalizedPercentLabel: "42%" },
          { label: "Base rate", normalized: 0.31 },
          { label: "Missing signal", normalizedPercentLabel: "9%", unavailable: true },
        ],
      },
    });

    assert.deepEqual(signalData, {
      baseRate: 4.91,
      baseRateUsed: "1M",
      curveSlope: -0.27,
      macroContributors: ["Curve slope 42%", "Base rate 31%"],
      tightnessThreshold: 68,
    });
  });

  it("keeps the v2 hero metadata compact and spaced", () => {
    const source = readFileSync("app/v2/components/DecisionHero.tsx", "utf8");

    assert.match(source, /\{provenanceLabel\}/);
    assert.match(source, /\{dataStatus\}/);
    assert.doesNotMatch(source, /<p className="text-white\/40">\{recordDate\}<\/p>/);
    assert.doesNotMatch(source, /\{stageLabel \? <p>\{stageLabel\}<\/p> : null\}/);
    assert.doesNotMatch(source, /\{tightnessDeltaLabel\}\s*\{isUnusual/);
  });

  it("keeps the route from passing literal macro values into DecisionHero", () => {
    const source = readFileSync("app/v2/page.tsx", "utf8");
    const heroCall = source.match(/<DecisionHero[\s\S]*?\/>/)?.[0] ?? "";

    assert.match(heroCall, /signalData=\{v2HeroSignalData\}/);
    assert.doesNotMatch(heroCall, /signalData=\{\{[\s\S]*?(baseRate|baseRateUsed|curveSlope|tightnessThreshold)/);
    assert.doesNotMatch(source, /baseRate:\s*4\.33/);
    assert.doesNotMatch(source, /baseRateUsed:\s*["']FED["']/);
  });
});
