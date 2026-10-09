import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { buildV2HeroSignalData } from "../app/viewModel";

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

  it("states the record date and the source once, in the strip under the call", () => {
    /* The hero's metadata row became the trust strip on 2026-09-22: as-of,
       sources, confidence, whether the call could change. The rule is the same
       one this case has always held — each fact prints once, in one place. */
    const { createElement } = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { TrustStrip } = require("../app/components/trustStrip");
    const html = renderToStaticMarkup(
      createElement(TrustStrip, {
        recordDateLabel: "Sep 18, 2026",
        sourcesLive: true,
        sourcesLabel: "Live",
        confidenceLabel: "HIGH",
        couldChangeNextWeek: false,
        basis: { key: "record", value: "The record's inputs", warning: null },
      }),
    );

    assert.match(html, /Sep 18, 2026/);
    assert.match(html, /Live/);
    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");
    assert.ok(!heroSource.includes("{recordDate}"), "the hero does not restate the record date beside the strip");
    assert.ok(!heroSource.includes("dataStatus"), "freshness is the strip's, not a second chip in the card");
  });

  it("keeps the route from inventing macro values", () => {
    const source = readFileSync("app/page.tsx", "utf8");

    // The hero takes no signal data at all now — the changed-signals table
    // reads the indicator model — so the rule is simply that no literal
    // reading is typed into the route.
    const heroCall = source.match(/<DecisionHero[\s\S]*?\/>/)?.[0] ?? "";
    assert.doesNotMatch(heroCall, /signalData=/);
    assert.doesNotMatch(source, /baseRate:\s*4\.33/);
    assert.doesNotMatch(source, /baseRateUsed:\s*["']FED["']/);
    assert.match(source, /buildV2HeroSignalData\(reportData\)/, "what it does read is derived from the reading");
  });
});
