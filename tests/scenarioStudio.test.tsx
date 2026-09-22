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
    assert.match(html, /What a product&#x27;s shape says about the money it was built with/);
    assert.match(html, /Infrastructure/);
    assert.match(html, /Microservices sprawl/);
    assert.match(html, /Consolidated monoliths/);
    assert.match(html, /Support/);
    assert.match(html, /Self-serve help centers/);
    assert.match(html, /Pricing/);
    assert.match(html, /Reverse trials/);
    // The "Now: Freezing" chip restated the shell's status line and the
    // footer cited the product to itself; neither renders any more.
    assert.doesNotMatch(html, /Now: |Whether Insight Database/);
    assert.doesNotMatch(html, /SCARCITY|CLIMATE/);
  });
});

describe("ScenarioStudioSimulator", () => {
  it("renders the scenario controls in the reader's words", () => {
    const assessment = evaluateRegime(mockTreasury);
    const html = renderToStaticMarkup(
      <ScenarioStudioSimulator
        liveTreasury={mockTreasury}
        liveAssessment={assessment}
      />,
    );

    // One tag beside the sliders says the data is not this week's; the page
    // intro already says what the studio is, so there is no banner repeating it.
    assert.doesNotMatch(html, /Simulated Scenario|role="alert"/);
    assert.equal((html.match(/Not this week&#x27;s data/g) ?? []).length, 1);
    assert.match(html, /weather-tag-amber[^>]*>Not this week&#x27;s data/);

    // At this week's values there is nothing to reset to, so no reset control.
    assert.doesNotMatch(html, /Reset to this week/);
    // Presets carry their state on the button, not as a badge inside it.
    assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 4);
    assert.doesNotMatch(html, />Active<|shadow-\[0_0_/);
    // Copy actions are the shared clipboard control at the 44px floor.
    assert.match(html, /Copy link/);
    assert.match(html, /Copy this scenario/);
    assert.doesNotMatch(html, /font-mono/);

    // Presets say what they set, not a scenario name
    assert.match(html, /Four preset scenarios/);
    assert.match(html, /Rate 2\.00%, curve \+1\.2%/);
    assert.match(html, /Rate 6\.25%, curve -0\.6%/);
    assert.match(html, /Rate 5\.25%, curve -1\.25%/);
    assert.match(html, /Rate 3\.25%, curve \+0\.85%/);
    assert.doesNotMatch(html, /Stagflation|Liquidity freeze|archetype/);

    // Sliders carry the reader's names and expand the abbreviation
    assert.match(html, /Short-term borrowing rate/);
    assert.match(html, /Recession warning gauge \(10-year minus 2-year rate\)/);
    assert.match(html, /zero rates/);
    assert.doesNotMatch(html, /ZIRP|Fed Funds|1M Yield|10Y|Counterfactual|counterfactual/);

    // This week against the scenario
    assert.match(html, /This week vs\. this scenario/);
    assert.match(html, /Conditions/);
    assert.match(html, /Funding pressure/);
    assert.match(html, /Risk appetite/);
    // "posture" is not asserted here: the per-area lever labels ("Hiring posture") come from
    // lib/playbook.ts, which this component renders as given.
    /* Visible text only: the score ladders take their hue from the
       `--regime-accent` / `--regime-ink` tokens, so the word appears in a style
       attribute. What the reader sees is what this rule is about. */
    const visible = html.replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(visible, /SCARCITY|DEFENSIVE|VOLATILE|EXPANSION|regime|Live baseline/);

    // Playbook
    assert.match(html, /What you&#x27;d stop and start in this scenario/);
    assert.match(html, /What to STOP in this scenario/);
    assert.match(html, /What to START in this scenario/);
  });
});
