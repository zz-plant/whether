import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { getHistoricalAnalogPlaybook } from "../lib/analogPlaybook";
import type { RegimeAssessment } from "../lib/regimeEngine";

const createMockAssessment = (overrides: Partial<RegimeAssessment> = {}): RegimeAssessment =>
  ({
    regime: "DEFENSIVE",
    scores: {
      baseRate: 5.25,
      baseRateUsed: "FED",
      curveSlope: -0.30,
      tightness: 72,
      riskAppetite: 42,
    },
    thresholds: {
      baseRateTightness: 4.0,
      tightnessRegime: 60,
      riskAppetiteRegime: 50,
    },
    diagnostics: {
      tightnessDelta: 0,
      riskAppetiteDelta: 0,
      nearestThresholdDelta: 10,
      confidence: "HIGH",
      transitionWatch: false,
      intensity: "STANDARD",
      boundaryContributors: [],
      weakReadCount: 0,
      twoWeakReadsWarning: false,
    },
    description: "Defensive conditions",
    constraints: [],
    tightnessExplanation: "",
    riskAppetiteExplanation: "",
    dataWarnings: [],
    inputs: [],
    policyAssessment: {} as any,
    ...overrides,
  } as RegimeAssessment);

describe("analogPlaybook", () => {
  it("matches defensive late-cycle macro conditions to Q3 2007 analog", () => {
    const playbook = getHistoricalAnalogPlaybook(createMockAssessment());

    assert.equal(playbook.analogPeriod, "Q3 2007");
    // A nearness score, not a correlation: 100 is an exact coordinate match and
    // there is no floor, so a poor match is free to score low.
    assert.ok(playbook.matchScore > 0 && playbook.matchScore <= 100);
    assert.equal(playbook.referenceCycleCount, 4);
    assert.deepEqual(
      playbook.matchBasis.map((item) => item.key),
      ["baseRate", "curveSlope", "tightness", "riskAppetite"],
    );
    assert.equal(playbook.matchBasis[0]?.live, 5.25);
    assert.doesNotMatch(playbook.consensusTrap, /^What peer startups got wrong/);
    assert.match(playbook.consensusTrap, /Hired enterprise sales ahead of a fourth-quarter rebound/);
    // Editorial notes say what was done, not a measured result: no unsourced
    // percentage of a cash buffer, no "while competitors stalled".
    for (const note of [playbook.consensusTrap, playbook.winningMove]) {
      assert.doesNotMatch(note, /\d+% of the cash|competitors stalled/);
    }
    assert.ok(playbook.reversalMarker.includes("recession warning gauge"));
  });

  /* Rendered on /signals beside the reader's own numbers, so the cycles are
     told in plain words: no desk shorthand, no acronyms, no engine names. */
  it("tells every reference cycle without desk shorthand", () => {
    // One reading placed on each of the four reference cycles, so every cycle's copy is read.
    const readings = [
      { baseRate: 5.25, curveSlope: -0.25, tightness: 70, riskAppetite: 40 },
      { baseRate: 2.5, curveSlope: 0.15, tightness: 62, riskAppetite: 35 },
      { baseRate: 3.5, curveSlope: -0.4, tightness: 78, riskAppetite: 28 },
      { baseRate: 0.25, curveSlope: 1.2, tightness: 25, riskAppetite: 85 },
    ];
    const periods = new Set<string>();
    for (const reading of readings) {
      const base = createMockAssessment();
      const playbook = getHistoricalAnalogPlaybook({ ...base, scores: { ...base.scores, ...reading } });
      periods.add(playbook.analogPeriod);
      const text = [
        playbook.regimeType,
        playbook.consensusTrap,
        playbook.winningMove,
        playbook.reversalMarker,
        ...playbook.matchBasis.map((item) => item.label),
      ].join(" ");
      assert.doesNotMatch(text, /\bGTM\b|\bZIRP\b|\bFed\b|10Y|2Y|tightness|down-round|reqs|closed-won|Late-Cycle/);
    }
    assert.equal(periods.size, 4, "each reading lands on a different cycle");
  });
});
