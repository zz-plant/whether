import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FossilRecordSection } from "../app/signals/components/fossilRecordSection";
import { ScenarioStudioSimulator } from "../app/operate/components/scenarioStudioSimulator";
import { ScenarioDeltas } from "../app/operate/components/scenarioDeltas";
import { buildScenarioBriefText, buildSimulatedTreasury, invertScoresToScenario } from "../lib/report/scenarioStudio";
import { getPlaybookGuidance } from "../lib/playbook";
import type { TreasuryData } from "../lib/types";
import { evaluateRegime } from "../lib/regimeEngine";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;

/* The simulator reads the app router's search params; renderToStaticMarkup
   mounts none. Installed here so the file answers for its own dependencies
   rather than passing on another suite's ordering luck. The value is mutable
   so a test can open the studio on a scenario the URL carries. */
let currentSearchParams = new URLSearchParams();

mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/signals",
  useSearchParams: () => currentSearchParams,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

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
    assert.match(html, /Short-term borrowing rate 2\.00%, recession warning gauge \+1\.2%/);
    assert.match(html, /Short-term borrowing rate 6\.25%, recession warning gauge -0\.6%/);
    assert.match(html, /Short-term borrowing rate 5\.25%, recession warning gauge -1\.25%/);
    assert.match(html, /Short-term borrowing rate 3\.25%, recession warning gauge \+0\.85%/);
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
    assert.match(html, /What to stop in this scenario/);
    assert.match(html, /What to start in this scenario/);
  });

  afterEach(() => {
    currentSearchParams = new URLSearchParams();
  });

  it("names the scenario the URL carries, above the map, without repeating the deltas verdict", () => {
    const assessment = evaluateRegime(mockTreasury);
    currentSearchParams = new URLSearchParams("rate=2.00&slope=1.20");
    const html = renderToStaticMarkup(
      <ScenarioStudioSimulator liveTreasury={mockTreasury} liveAssessment={assessment} />,
    );

    assert.match(html, /Active scenario/);
    assert.match(html, /Short rate 2\.00%/);
    assert.match(html, /Gauge 1\.20%/);
    assert.match(html, /Active scenario[\s\S]{0,400}Sunny/, "the strip names the regime the scenario lands in");
    // The verdict belongs to the deltas panel, which has the transition to show it.
    assert.equal((html.match(/Conditions would change/g) ?? []).length, 1);

    // At this week's values there is no scenario to name.
    currentSearchParams = new URLSearchParams();
    const atBaseline = renderToStaticMarkup(
      <ScenarioStudioSimulator liveTreasury={mockTreasury} liveAssessment={assessment} />,
    );
    assert.doesNotMatch(atBaseline, /Active scenario/);
  });

  it("steps a slider a quarter point and jumps to a named milestone", () => {
    const html = renderToStaticMarkup(
      <ScenarioStudioSimulator liveTreasury={mockTreasury} liveAssessment={evaluateRegime(mockTreasury)} />,
    );

    for (const label of [
      "Decrease short-term borrowing rate by 25 basis points",
      "Increase short-term borrowing rate by 25 basis points",
      "Decrease recession warning gauge by 25 basis points",
      "Increase recession warning gauge by 25 basis points",
    ]) {
      assert.ok(html.includes(`aria-label="${label}"`), `offers ${label}`);
    }
    // The labelled ends of each rail are keys that set the value, not captions.
    for (const milestone of [
      "0.00% (zero rates)",
      "2.50% (neutral)",
      "5.00% (tight)",
      "8.00% (extreme)",
      "-1.50% (deeply inverted)",
      "0.00% (flat)",
      "+1.00% (normal)",
      "+2.50% (steep)",
    ]) {
      assert.ok(html.includes(`>${milestone}</button>`), `${milestone} sets the slider`);
    }
  });

  it("inverts scrubbed map or ladder scores back into rate and slope slider values across all four quadrants", () => {
    const quadrants = [
      { targetTightness: 30, targetRiskAppetite: 76, expectedRegime: "EXPANSION" },
      { targetTightness: 85, targetRiskAppetite: 72, expectedRegime: "DEFENSIVE" },
      { targetTightness: 35, targetRiskAppetite: 28, expectedRegime: "VOLATILE" },
      { targetTightness: 88, targetRiskAppetite: 24, expectedRegime: "SCARCITY" },
    ] as const;

    for (const { targetTightness, targetRiskAppetite, expectedRegime } of quadrants) {
      const { rate, slope } = invertScoresToScenario(targetTightness, targetRiskAppetite);
      const simulated = evaluateRegime(buildSimulatedTreasury(mockTreasury, rate, slope));
      assert.equal(simulated.regime, expectedRegime);
      assert.ok(Math.abs(simulated.scores.riskAppetite - targetRiskAppetite) <= 2);
      assert.ok(Math.abs(simulated.scores.tightness - targetTightness) <= 9);
    }
  });

  it("renders operating runbook comparison diffs with flipped rule indicators and owner roles when scenario diverges", () => {
    const liveAssessment = evaluateRegime(mockTreasury); // SCARCITY (Freezing)
    const simulatedTreasury = buildSimulatedTreasury(mockTreasury, 2.0, 1.2); // EXPANSION (Sunny)
    const simulatedAssessment = evaluateRegime(simulatedTreasury);

    const livePlaybook = getPlaybookGuidance(liveAssessment.regime, {
      scores: liveAssessment.scores,
      thresholds: liveAssessment.thresholds,
    });
    const simulatedPlaybook = getPlaybookGuidance(simulatedAssessment.regime, {
      scores: simulatedAssessment.scores,
      thresholds: simulatedAssessment.thresholds,
    });

    const html = renderToStaticMarkup(
      <ScenarioDeltas
        liveAssessment={liveAssessment}
        simulatedAssessment={simulatedAssessment}
        simulatedPlaybook={simulatedPlaybook}
        livePlaybook={livePlaybook}
        tightnessDelta={simulatedAssessment.scores.tightness - liveAssessment.scores.tightness}
        riskAppetiteDelta={simulatedAssessment.scores.riskAppetite - liveAssessment.scores.riskAppetite}
      />,
    );

    // Shows regime shift
    assert.match(html, /Conditions would change/);
    assert.match(html, /Freezing/);
    assert.match(html, /Sunny/);

    // Shows stop/start diff tags
    assert.match(html, /Unblocks in scenario/);

    // Shows rule flip indicators and owner roles
    assert.match(html, /Rule flips/);
    assert.match(html, /This week:/);
    assert.match(html, /VP Eng/);
    assert.match(html, /CEO/);
    assert.match(html, /VP Product/);
    assert.match(html, /Show restart lines/);

    // Verifies brief text includes action flips
    const briefText = buildScenarioBriefText({
      simulatedBaseRate: 2.0,
      simulatedCurveSlope: 1.2,
      baseRateDelta: -3.25,
      curveSlopeDelta: 2.25,
      tightnessDelta: -50,
      riskAppetiteDelta: 40,
      liveAssessment,
      simulatedAssessment,
      simulatedPlaybook,
      livePlaybook,
      shareUrl: "https://whether.work/operate/scenarios",
    });

    assert.match(briefText, /\[ACTION FLIPPED\]/);
    assert.match(briefText, /\[This week:/);
  });
});
