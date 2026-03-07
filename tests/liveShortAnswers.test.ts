import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLiveShortAnswer, isExpansionRegime } from "../app/answers/liveShortAnswers";

const sampleAssessment = {
  regime: "SCARCITY" as const,
  thresholds: {
    riskAppetiteRegime: 50,
    tightnessRegime: 70,
  },
};

describe("live short answers", () => {
  it("uses expansion headline only in expansion regime", () => {
    const expansion = buildLiveShortAnswer(
      "is-it-risk-on-or-risk-off-for-startups",
      {
        ...sampleAssessment,
        regime: "EXPANSION",
      },
      "fallback"
    );
    const volatile = buildLiveShortAnswer(
      "is-it-risk-on-or-risk-off-for-startups",
      {
        ...sampleAssessment,
        regime: "VOLATILE",
      },
      "fallback"
    );

    assert.equal(expansion, "Current read is expansion with guardrails.");
    assert.equal(
      volatile,
      "Current posture is safety mode; tighten approval velocity and keep irreversible commitments paused until thresholds recover."
    );
  });

  it("falls back to static copy for unknown slugs", () => {
    assert.equal(buildLiveShortAnswer("unknown", sampleAssessment, "fallback"), "fallback");
  });

  it("uses slug-specific safety-mode copy for expansion-phrased decision pages", () => {
    const scarcity = buildLiveShortAnswer(
      "product-strategy-during-expansion",
      sampleAssessment,
      "fallback"
    );

    assert.equal(
      scarcity,
      "In safety mode, protect core retention and pause expansion roadmap work until both risk appetite and tightness recover."
    );
  });

  it("keeps category fallback for non-overridden pages in safety mode", () => {
    const scarcity = buildLiveShortAnswer(
      "startup-strategy-in-uncertain-markets",
      sampleAssessment,
      "fallback"
    );

    assert.equal(
      scarcity,
      "In safety mode, keep decisions reversible with named pause and resume triggers. Tighten if risk appetite < 50 or tightness > 70. Re-open expansion only after two consecutive supportive reads."
    );
  });

  it("derives expansion state from regime key", () => {
    assert.equal(isExpansionRegime("EXPANSION"), true);
    assert.equal(isExpansionRegime("DEFENSIVE"), false);
  });
});
