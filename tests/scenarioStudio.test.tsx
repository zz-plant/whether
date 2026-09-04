import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FossilRecordSection } from "../app/signals/components/fossilRecordSection";
import { ScenarioStudioSimulator } from "../app/operate/components/scenarioStudioSimulator";
import type { TreasuryData } from "../lib/types";
import { evaluateRegime } from "../lib/regimeEngine";

const mockTreasury: TreasuryData = {
  source: "FRED",
  record_date: "2026-09-01",
  fetched_at: "2026-09-01T12:00:00Z",
  isLive: true,
  yields: {
    fedFunds: 5.25,
    oneMonth: 5.25,
    threeMonth: 5.2,
    twoYear: 4.8,
    tenYear: 4.2,
  },
};

describe("FossilRecordSection", () => {
  it("renders the fossil record comparison table with economic insights", () => {
    const html = renderToStaticMarkup(<FossilRecordSection regime="SCARCITY" />);

    assert.match(html, /The Fossil Record/);
    assert.match(html, /Architecture &amp; UX as economic indicators/);
    assert.match(html, /Infrastructure/);
    assert.match(html, /Microservices sprawl/);
    assert.match(html, /Consolidated monoliths/);
    assert.match(html, /Support/);
    assert.match(html, /Self-serve help centers/);
    assert.match(html, /Pricing/);
    assert.match(html, /Reverse trials/);
    assert.match(html, /SCARCITY CLIMATE/);
  });
});

describe("ScenarioStudioSimulator", () => {
  it("renders the interactive counterfactual simulation controls and guardrails", () => {
    const assessment = evaluateRegime(mockTreasury);
    const html = renderToStaticMarkup(
      <ScenarioStudioSimulator
        liveTreasury={mockTreasury}
        liveAssessment={assessment}
      />,
    );

    // Guardrail banner
    assert.match(html, /Simulated Scenario/);
    assert.match(html, /Interactive Counterfactual Model/);
    assert.match(html, /Assumptions active/);

    // Presets
    assert.match(html, /Scenario Presets Library/);
    assert.match(html, /Aggressive Easing/);
    assert.match(html, /Stagflation Trap/);
    assert.match(html, /Deep Inversion/);
    assert.match(html, /Soft Landing/);

    // Sliders
    assert.match(html, /Counterfactual Parameter Sliders/);
    assert.match(html, /Policy Base Rate/);
    assert.match(html, /10Y − 2Y Yield Curve Slope/);

    // Then-vs-now comparisons
    assert.match(html, /Then vs\. Now/);
    assert.match(html, /Macro Regime/);
    assert.match(html, /Funding Pressure/);
    assert.match(html, /Risk Appetite/);

    // Playbook
    assert.match(html, /Counterfactual Operating Posture &amp; Playbook/);
    assert.match(html, /What to STOP in this scenario/);
    assert.match(html, /What to START in this scenario/);
  });
});
