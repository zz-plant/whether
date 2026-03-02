import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreWhetherToShipChecklist } from "../lib/whetherToShipChecklist";
import type { RegimeAssessment } from "../lib/regimeEngine";

const assessment: RegimeAssessment = {
  regime: "SCARCITY",
  scores: {
    tightness: 90,
    riskAppetite: 35,
    baseRateUsed: "1M",
    baseRate: 5.6,
    curveSlope: -0.4,
  },
  diagnostics: {
    tightnessDelta: 0,
    riskAppetiteDelta: 0,
    nearestThresholdDelta: 0,
    confidence: "LOW",
    transitionWatch: false,
    intensity: "MILD",
  },
  description: "",
  constraints: [],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  thresholds: {
    baseRateTightness: 5,
    tightnessRegime: 70,
    riskAppetiteRegime: 50,
  },
  inputs: [],
};

describe("whether-to-ship checklist", () => {
  it("returns kill for weak inputs in scarcity", () => {
    const result = scoreWhetherToShipChecklist(
      {
        evidenceStrength: "low",
        reversibility: "hard",
        blastRadius: "large",
        strategicAlignment: "low",
      },
      assessment,
    );

    assert.equal(result.verdict, "kill");
  });

  it("returns go for strong inputs despite scarcity penalty", () => {
    const result = scoreWhetherToShipChecklist(
      {
        evidenceStrength: "high",
        reversibility: "easy",
        blastRadius: "small",
        strategicAlignment: "high",
      },
      assessment,
    );

    assert.equal(result.verdict, "go");
    assert.ok(result.reversalTrigger.length > 0);
  });
});
