import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLiveShortAnswer, isExpansionRegime } from "../app/answers/liveShortAnswers";

describe("live short answers", () => {
  it("uses expansion headline only in expansion regime", () => {
    const expansion = buildLiveShortAnswer(
      "is-it-risk-on-or-risk-off-for-startups",
      "EXPANSION",
      "fallback"
    );
    const volatile = buildLiveShortAnswer(
      "is-it-risk-on-or-risk-off-for-startups",
      "VOLATILE",
      "fallback"
    );

    assert.equal(expansion, "Current read is expansion with guardrails.");
    assert.equal(volatile, "Current posture is safety mode; tighten approval velocity.");
  });

  it("falls back to static copy for unknown slugs", () => {
    assert.equal(buildLiveShortAnswer("unknown", "SCARCITY", "fallback"), "fallback");
  });

  it("uses slug-specific safety-mode copy for expansion-phrased decision pages", () => {
    const scarcity = buildLiveShortAnswer(
      "product-strategy-during-expansion",
      "SCARCITY",
      "fallback"
    );

    assert.equal(
      scarcity,
      "In safety mode, protect core retention and pause expansion roadmap work until thresholds recover."
    );
  });

  it("keeps category fallback for non-overridden pages in safety mode", () => {
    const scarcity = buildLiveShortAnswer(
      "startup-strategy-in-uncertain-markets",
      "SCARCITY",
      "fallback"
    );

    assert.equal(
      scarcity,
      "In safety mode, keep decisions reversible and enforce stricter spend and hiring gates."
    );
  });

  it("derives expansion state from regime key", () => {
    assert.equal(isExpansionRegime("EXPANSION"), true);
    assert.equal(isExpansionRegime("DEFENSIVE"), false);
  });
});
