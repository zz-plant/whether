import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLiveShortAnswer, isExpansionRegime } from "../app/answers/liveShortAnswers";

describe("live short answers", () => {
  it("uses expansion headline only in expansion regime", () => {
    const expansion = buildLiveShortAnswer(
      "is-the-market-risk-on-or-risk-off-right-now",
      "EXPANSION",
      "fallback"
    );
    const volatile = buildLiveShortAnswer(
      "is-the-market-risk-on-or-risk-off-right-now",
      "VOLATILE",
      "fallback"
    );

    assert.equal(expansion, "Current posture is expansion with guardrails.");
    assert.equal(volatile, "Current posture is safety mode.");
  });

  it("falls back to static copy for unknown slugs", () => {
    assert.equal(buildLiveShortAnswer("unknown", "SCARCITY", "fallback"), "fallback");
  });

  it("derives expansion state from regime key", () => {
    assert.equal(isExpansionRegime("EXPANSION"), true);
    assert.equal(isExpansionRegime("DEFENSIVE"), false);
  });
});
