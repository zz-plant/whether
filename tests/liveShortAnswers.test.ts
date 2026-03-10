import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLiveDirectAnswer, buildLiveShortAnswer, isExpansionRegime } from "../app/answers/liveShortAnswers";

describe("live short answers", () => {
  it("returns payload current call for short answer", () => {
    const shortAnswer = buildLiveShortAnswer({
      payload: {
        currentCall: "Current read is expansion with guardrails.",
        immediateAction: "Move faster on reversible bets.",
        triggerThreshold: "Tighten if risk appetite < 50.",
        reversalCondition: "Reverse after two supportive reads.",
        evidence: [],
        freshness: "fresh",
        degraded: false,
        noindex: false,
        trustSummary: "trust",
        citationMeta: "citation",
      },
      fallback: "fallback",
    });

    assert.equal(shortAnswer, "Current read is expansion with guardrails.");
  });

  it("falls back when payload current call is empty", () => {
    const shortAnswer = buildLiveShortAnswer({
      payload: {
        currentCall: "   ",
        immediateAction: "Move faster on reversible bets.",
        triggerThreshold: "Tighten if risk appetite < 50.",
        reversalCondition: "Reverse after two supportive reads.",
        evidence: [],
        freshness: "fresh",
        degraded: false,
        noindex: false,
        trustSummary: "trust",
        citationMeta: "citation",
      },
      fallback: "fallback",
    });

    assert.equal(shortAnswer, "fallback");
  });

  it("builds direct answer from payload contract fields", () => {
    const directAnswer = buildLiveDirectAnswer({
      payload: {
        currentCall: "Primary call for Capital raising.",
        immediateAction: "Run financing decisions with term quality gates.",
        triggerThreshold: "Pause acceleration if risk appetite falls below 44.",
        reversalCondition: "Resume full process when risk appetite > 54.",
        evidence: [],
        freshness: "fresh",
        degraded: false,
        noindex: false,
        trustSummary: "trust",
        citationMeta: "citation",
      },
      fallback: "fallback direct answer",
    });

    assert.match(directAnswer, /Action:/);
    assert.match(directAnswer, /Trigger:/);
    assert.match(directAnswer, /Reverse:/);
  });

  it("derives expansion state from regime key", () => {
    assert.equal(isExpansionRegime("EXPANSION"), true);
    assert.equal(isExpansionRegime("DEFENSIVE"), false);
  });
});
