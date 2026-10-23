import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildCounterevidenceAudit, buildCounterevidencePacket, summarizeCounterevidencePacket } from "../lib/jev/counterevidence";
import type { JevResult } from "../lib/jev/jevClient";

/**
 * The counterevidence review packet: the weekly call's operating implication,
 * judged for what could weaken it. Clef answers three questions per candidate —
 * relevance, whether the excerpt supports the claim, and whether the claim
 * would weaken the call — and the packet is assembled deterministically, with
 * no generated claims.
 */

const canonical = {
  recordDate: "2026-10-15", engineVersion: "test-engine", readingId: "reading-1",
  guidance: "Hold net-new hiring.", action: "Hold net-new hiring.",
  pauseLine: "Funding pressure above 70", resumeLine: "Funding pressure below 66",
  changeLine: "Risk appetite above 50", sourceUrl: "https://fred.stlouisfed.org/series/DGS1MO",
};

const input = {
  canonical,
  candidates: [
    { id: "rates", claim: "Funding costs increased.", excerpt: "Funding costs increased this week.", sourceUrl: canonical.sourceUrl, observedAt: canonical.recordDate, side: "support" as const },
    { id: "layoffs", claim: "A competitor's layoff wave signals the market is tightening.", excerpt: "The firm announced layoffs citing funding conditions.", sourceUrl: "https://example.com/layoffs", observedAt: canonical.recordDate, side: "challenge" as const },
    { id: "office", claim: "A new office opened.", excerpt: "A new office opened.", sourceUrl: "https://example.com/release", observedAt: canonical.recordDate },
  ],
};

type NoulAnswer = { type: "noul"; noul: number };
type ScoreAnswer = { type: "score"; score: number; confidence: number; probabilities: Record<string, number>; legend: Record<string, string> };
type FixtureAnswer = NoulAnswer | ScoreAnswer;

const answers = (overrides: Partial<Record<string, FixtureAnswer>> = {}): Record<string, FixtureAnswer> => ({
  relevance_0: { type: "score", score: 2, confidence: 1, probabilities: { 0: 0, 1: 0, 2: 1 }, legend: { 0: "Unrelated", 1: "Context", 2: "Action" } },
  supported_0: { type: "noul", noul: 0.99 },
  challenges_0: { type: "noul", noul: 0.1 },
  relevance_1: { type: "score", score: 2, confidence: 1, probabilities: { 0: 0, 1: 0, 2: 1 }, legend: { 0: "Unrelated", 1: "Context", 2: "Action" } },
  supported_1: { type: "noul", noul: 0.98 },
  challenges_1: { type: "noul", noul: 0.95 },
  relevance_2: { type: "score", score: 0, confidence: 1, probabilities: { 0: 1, 1: 0, 2: 0 }, legend: { 0: "Unrelated", 1: "Context", 2: "Action" } },
  supported_2: { type: "noul", noul: 0.99 },
  challenges_2: { type: "noul", noul: 0.2 },
  ...overrides,
});

const result = (overrides: Partial<Record<string, FixtureAnswer>> = {}): JevResult => ({
  ok: true, model: "fixture", answers: answers(overrides),
});

describe("counterevidence review request", () => {
  it("asks relevance, support and the challenge direction per candidate", () => {
    const request = buildCounterevidenceAudit(input);
    assert.equal(Object.keys(request.questions).length, 9);
    assert.ok(request.questions.relevance_0);
    assert.ok(request.questions.supported_0);
    assert.ok(request.questions.challenges_0, "the third question is what separates counterevidence from the evidence mode");
    assert.equal(request.questions.challenges_1?.type, "noul");
    assert.throws(() => buildCounterevidenceAudit({ canonical, candidates: [input.candidates[0], input.candidates[0]] }), /unique/);
    assert.throws(() => buildCounterevidenceAudit({ canonical, candidates: [{ ...input.candidates[0], sourceUrl: "javascript:alert(1)" }] }));
  });

  it("splits the pool into what backs the call and what could weaken it", () => {
    const packet = buildCounterevidencePacket(input, result(), 0.8);
    assert.deepEqual(packet.supporting.map((item) => item.id), ["rates"]);
    assert.deepEqual(packet.challenges.map((item) => item.id), ["layoffs"]);
    assert.deepEqual(packet.review, ["office"], "an irrelevant passage the pool sent is review noise, not support");
    assert.equal(packet.challenges[0]?.side, "challenge", "the finding keeps what the pool said, so retrieval and judgment can be compared");
    assert.equal(packet.reconsideration, canonical.changeLine, "the reconsideration line is the engine's printed change line");
  });

  it("does not list a challenge the excerpt does not support", () => {
    const packet = buildCounterevidencePacket(input, result({
      supported_1: { type: "noul", noul: 0.3 },
    }), 0.8);
    assert.deepEqual(packet.challenges, [], "an unsupported challenge is a false alarm and goes to review");
    assert.deepEqual(packet.review, ["layoffs", "office"]);
  });

  it("keeps a failed call out of the packet and sends every candidate to review", () => {
    const packet = buildCounterevidencePacket(input, { ok: false, reason: "offline" }, 0.8);
    assert.deepEqual(packet.supporting, []);
    assert.deepEqual(packet.challenges, []);
    assert.deepEqual(packet.review, ["rates", "layoffs", "office"]);
    assert.equal(packet.reconsideration, canonical.changeLine);
  });

  it("puts an unresolved challenge judgment in review rather than reading it as a clear", () => {
    const packet = buildCounterevidencePacket(input, result({
      challenges_1: { type: "noul", noul: 0.55 },
    }), 0.8);
    assert.deepEqual(packet.challenges, []);
    assert.ok(packet.review.includes("layoffs"), "a 0.55 is neither a challenge nor a clear at threshold 0.8");
  });

  it("says the review ran and names an empty challenge list as a finding, not silence", () => {
    const packet = buildCounterevidencePacket(input, result(), 0.8);
    assert.equal(packet.ran, true);
    assert.match(summarizeCounterevidencePacket(packet), /1 sourced challenge/);

    const noChallenges = buildCounterevidencePacket(input, result({
      challenges_1: { type: "noul", noul: 0.1 },
    }), 0.8);
    assert.equal(noChallenges.ran, true);
    assert.match(summarizeCounterevidencePacket(noChallenges), /no sourced challenge this week/, "an empty result that ran is a positive trust claim");

    const failed = buildCounterevidencePacket(input, { ok: false, reason: "offline" }, 0.8);
    assert.equal(failed.ran, false);
    assert.match(summarizeCounterevidencePacket(failed), /could not run/, "a run that never completed must not read as a clean bill of health");
  });
});