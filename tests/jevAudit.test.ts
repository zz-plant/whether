import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildArtifactAudit, buildScreenshotAudit, buildEvidenceAudit, selectEvidence, summarizeEvaluation } from "../lib/jev/auditRequests";
import type { JevResult } from "../lib/jev/jevClient";

const canonical = {
  recordDate: "2026-10-15", engineVersion: "test-engine", readingId: "reading-1", guidance: "Hold net-new hiring.",
  action: "Hold net-new hiring.", pauseLine: "Funding pressure above 70", resumeLine: "Funding pressure below 66",
  changeLine: "Risk appetite above 50", sourceUrl: "https://fred.stlouisfed.org/series/DGS1MO",
};
const bundle = { canonical, artifact: { recordDate: canonical.recordDate, engineVersion: canonical.engineVersion, readingId: canonical.readingId, text: "Keep hiring paused until funding pressure falls below 66." } };
const candidates = [
  { id: "rates", claim: "Funding costs increased.", excerpt: "Funding costs increased this week.", sourceUrl: canonical.sourceUrl, observedAt: canonical.recordDate },
  { id: "unrelated", claim: "A new office opened.", excerpt: "A new office opened.", sourceUrl: "https://example.com/release", observedAt: canonical.recordDate },
];

describe("advisory audit requests", () => {
  it("compares the exact reading and refuses another date or engine before inference", () => {
    const request = buildArtifactAudit(bundle);
    assert.ok(request.questions.contradicts_call);
    assert.ok(request.questions.weakens_pause_line);
    assert.ok(request.questions.unsupported_claim);
    assert.deepEqual(request.state, bundle);
    assert.throws(() => buildArtifactAudit({ ...bundle, artifact: { ...bundle.artifact, recordDate: "2026-10-14" } }), /same reading/);
    assert.throws(() => buildArtifactAudit({ ...bundle, artifact: { ...bundle.artifact, engineVersion: "old" } }), /same reading/);
    assert.throws(() => buildArtifactAudit({ ...bundle, artifact: { ...bundle.artifact, readingId: "another-read-on-the-same-day" } }), /same reading/);
  });

  it("reviews the actual image with expected guidance and independent visual questions", () => {
    const image = "data:image/png;base64,YQ==";
    const request = buildScreenshotAudit(bundle, image);
    assert.deepEqual(request.images, [image]);
    assert.ok(request.questions.clipped);
    assert.ok(request.questions.wrong_reading);
    assert.ok(request.questions.error_state);
  });

  it("retains source-backed candidate text and gives each candidate comparable questions", () => {
    const request = buildEvidenceAudit({ canonical, candidates });
    assert.equal(Object.keys(request.questions).length, 4);
    assert.ok(request.questions.relevance_0);
    assert.throws(() => buildEvidenceAudit({ canonical, candidates: [candidates[0], candidates[0]] }), /unique/);
    assert.throws(() => buildEvidenceAudit({ canonical, candidates: [{ ...candidates[0], sourceUrl: "javascript:alert(1)" }] }));
  });

  it("does not let relevance compensate for unsupported evidence or failed inference", () => {
    const input = { canonical, candidates };
    const result: JevResult = { ok: true, model: "fixture", answers: {
      relevance_0: { type: "score", score: 1, confidence: 1, probabilities: { 0: 0, 1: 1, 2: 0 }, legend: { 0: "Unrelated", 1: "Context", 2: "Action" } },
      supported_0: { type: "noul", noul: 0.99 },
      relevance_1: { type: "score", score: 2, confidence: 1, probabilities: { 0: 0, 1: 0, 2: 1 }, legend: { 0: "Unrelated", 1: "Context", 2: "Action" } },
      supported_1: { type: "noul", noul: 0.2 },
    } };
    const selection = selectEvidence(input, result, 0.8);
    assert.deepEqual(selection.ranked.map((item) => item.id), ["rates"]);
    assert.equal(selection.ranked.at(0)?.claim, "Funding costs increased.");
    assert.deepEqual(selection.review, ["unrelated"]);
    assert.deepEqual(selectEvidence(input, { ok: false, reason: "offline" }, 0.8).ranked, []);
  });

  it("excludes an explicitly unrelated candidate even when confident and supported", () => {
    const input = { canonical, candidates };
    const result: JevResult = { ok: true, model: "fixture", answers: {
      relevance_0: { type: "score", score: 0, confidence: 1, probabilities: { 0: 1, 1: 0, 2: 0 }, legend: { 0: "Unrelated", 1: "Context", 2: "Action" } },
      supported_0: { type: "noul", noul: 0.99 },
      relevance_1: { type: "score", score: 2, confidence: 1, probabilities: { 0: 0, 1: 0, 2: 1 }, legend: { 0: "Unrelated", 1: "Context", 2: "Action" } },
      supported_1: { type: "noul", noul: 0.9 },
    } };
    const selection = selectEvidence(input, result, 0.8);
    assert.deepEqual(selection.ranked.map((item) => item.id), ["unrelated"], "score 0 means unrelated, so it is not ranked despite support");
    assert.deepEqual(selection.review, ["rates"], "the unrelated-but-supported candidate is the one a person should see");
  });

  it("counts failures and ambiguity explicitly rather than calling them clean negatives", () => {
    const samples = [
      { expected: true, key: "bad", result: { ok: true as const, model: "fixture", answers: { bad: { type: "noul" as const, noul: 0.9 } } } },
      { expected: false, key: "bad", result: { ok: true as const, model: "fixture", answers: { bad: { type: "noul" as const, noul: 0.5 } } } },
      { expected: false, key: "bad", result: { ok: false as const, reason: "timeout" } },
    ];
    const summary = summarizeEvaluation(samples, 0.8);
    assert.equal(summary.total, 3);
    assert.equal(summary.truePositive, 1);
    assert.equal(summary.unresolved, 1);
    assert.equal(summary.failed, 1);
    assert.ok(summary.brier !== null && Math.abs(summary.brier - 0.13) < 0.00001);
  });
});
