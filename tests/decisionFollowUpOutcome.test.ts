import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildDecisionFollowUpRecord,
  isOutcomeReviewDue,
  OUTCOME_OPTIONS,
  parseDecisionFollowUpPayload,
  parseDecisionFollowUpRecord,
} from "../lib/decisionFollowUp";

const base = {
  recordDate: "2026-07-01",
  entryId: "e1",
  response: "continued" as const,
  conditions: { tightness: 80, riskAppetite: 50 },
};

describe("the outcome half of a review", () => {
  it("is only due once the decision is old enough to answer", () => {
    assert.equal(isOutcomeReviewDue("2026-07-01", new Date("2026-09-01T00:00:00Z")), false);
    assert.equal(isOutcomeReviewDue("2026-07-01", new Date("2026-10-01T00:00:00Z")), true);
    assert.equal(isOutcomeReviewDue("not-a-date"), false);
  });

  it("records what happened beside what was done", () => {
    const payload = parseDecisionFollowUpPayload({ ...base, outcome: "partly" });
    assert.ok(payload);
    const record = buildDecisionFollowUpRecord(payload);
    assert.equal(record.outcome, "partly");
    assert.equal(record.response, "continued");
    assert.deepEqual(parseDecisionFollowUpRecord(record), record, "the record round-trips");
  });

  it("still accepts a review with no outcome, and rejects one that is not an answer", () => {
    assert.ok(parseDecisionFollowUpPayload({ ...base }), "the response alone is still a valid review");
    assert.equal(parseDecisionFollowUpPayload({ ...base, outcome: "great" }), null);
    assert.equal(parseDecisionFollowUpPayload({ ...base, outcome: "worked" })?.outcome, "worked");
  });

  it("offers one word per answer", () => {
    assert.deepEqual(OUTCOME_OPTIONS.map((option) => option.value), ["worked", "partly", "did-not", "too-early"]);
  });
});
