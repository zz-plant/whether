import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { GET as getDecisionMemoryRoute, POST as postDecisionMemoryRoute } from "../app/api/decision-memory/route";
import {
  buildDecisionFollowUpRecord,
  parseDecisionFollowUpPayload,
  parseDecisionFollowUpRecord,
  type DecisionFollowUpPayload,
} from "../lib/decisionFollowUp";
import { type DecisionMemoryPayload } from "../lib/decisionMemory";
import { resetDecisionMemoryRepository } from "../lib/storage/decisionMemoryRepository";

/**
 * The review response the loop's second half records: what the operator did
 * when a decision's conditions moved. The staleness engine says *that* the
 * conditions moved; this records *what was then done* — continued, changed, or
 * deferred — against the reading the response was made against, so the review
 * trail is a time series of its own.
 */

const decisionPayload: DecisionMemoryPayload = {
  clientId: "browser-1",
  recordDate: "2026-09-14",
  decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
  outcome: { verdict: "SAFE", summary: "Hire the two open roles.", guardrail: "Pause above 85.", reversalTrigger: "Re-open below 65." },
  assessment: {
    regime: "EXPANSION",
    scores: { tightness: 40, tightnessPressure: 40, tightnessSaturated: false, riskAppetite: 60, baseRate: 3.2, baseRateUsed: "1M", curveSlope: 0.4 },
    thresholds: { baseRateTightness: 3.5, tightnessRegime: 70, riskAppetiteRegime: 50 },
    inputs: [],
  },
};

const followUpPayload = (overrides: Partial<DecisionFollowUpPayload> = {}): DecisionFollowUpPayload => ({
  recordDate: "2026-09-21",
  entryId: "decision-1",
  response: "continued",
  note: "Still on track.",
  conditions: { tightness: 55, riskAppetite: 45 },
  ...overrides,
});

const ownerHeaders = { "x-whether-client-id": "browser-1", "content-type": "application/json" };

describe("decision follow-up record", () => {
  it("builds a record the parser reads back with the owner and reading it was made against", () => {
    const record = buildDecisionFollowUpRecord({ ...followUpPayload(), clientId: "browser-1" });
    const parsed = parseDecisionFollowUpRecord(record);
    assert.ok(parsed, "the route's answer must be a shape the client parser accepts");
    assert.equal(parsed.context.clientId, "browser-1");
    assert.equal(parsed.context.recordDate, "2026-09-21");
    assert.equal(parsed.entryId, "decision-1");
    assert.equal(parsed.response, "continued");
    assert.equal(parsed.note, "Still on track.");
    assert.deepEqual(parsed.conditions, { tightness: 55, riskAppetite: 45 });
  });

  it("refuses a response outside the vocabulary", () => {
    const record = { ...buildDecisionFollowUpRecord({ ...followUpPayload(), clientId: "browser-1" }), response: "kept" };
    assert.equal(parseDecisionFollowUpRecord(record), null);
  });

  it("refuses a note longer than the record's bound", () => {
    const record = buildDecisionFollowUpRecord({ ...followUpPayload(), clientId: "browser-1", note: "x".repeat(501) });
    assert.equal(parseDecisionFollowUpRecord(record), null);
  });

  it("refuses conditions that are not 0–100 scores", () => {
    const record = buildDecisionFollowUpRecord({
      ...followUpPayload(),
      clientId: "browser-1",
      conditions: { tightness: 101, riskAppetite: 45 },
    });
    assert.equal(parseDecisionFollowUpRecord(record), null);
  });

  it("accepts the route payload without a fabricated kind", () => {
    assert.ok(parseDecisionFollowUpPayload(followUpPayload()), "the response is identified by its shape, not by a kind field");
    assert.equal(parseDecisionFollowUpPayload({ ...followUpPayload(), response: "renewed" }), null);
    assert.equal(parseDecisionFollowUpPayload({ ...followUpPayload(), entryId: undefined }), null);
    assert.equal(parseDecisionFollowUpPayload({ ...followUpPayload(), conditions: { tightness: "high", riskAppetite: 45 } }), null);
  });
});

describe("decision follow-up through the route", () => {
  beforeEach(() => {
    resetDecisionMemoryRepository();
  });

  const recordDecision = async (): Promise<string> => {
    const response = await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify(decisionPayload),
    }));
    assert.equal(response.status, 200);
    const body: { entry?: { id?: string } } = await response.json();
    return body.entry?.id ?? "";
  };

  it("records a review against one of the browser's own decisions", async () => {
    const entryId = await recordDecision();
    const response = await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ ...followUpPayload({ entryId }), clientId: "browser-1" }),
    }));
    assert.equal(response.status, 200);
    const body: { created?: boolean; followUp?: unknown } = await response.json();
    assert.equal(body.created, true);
    const record = parseDecisionFollowUpRecord(body.followUp);
    assert.ok(record, "the route answers with a follow-up the client parser accepts");
    assert.equal(record.entryId, entryId);
    assert.equal(record.response, "continued");
    assert.equal(record.context.clientId, "browser-1");
  });

  it("refuses a follow-up that names no decision on this browser's record", async () => {
    await recordDecision();
    const response = await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ ...followUpPayload({ entryId: "not-on-record" }), clientId: "browser-1" }),
    }));
    assert.equal(response.status, 400);
    const body: { error?: string } = await response.json();
    assert.equal(body.error, "unknown-entry", "an orphan follow-up would never render, so it must not be stored");
  });

  it("lists the review trail beside the record", async () => {
    const entryId = await recordDecision();
    await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ ...followUpPayload({ entryId, response: "deferred", note: undefined }), clientId: "browser-1" }),
    }));

    const response = await getDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      headers: { "x-whether-client-id": "browser-1" },
    }));
    assert.equal(response.status, 200);
    const body: { entries?: unknown[]; followUps?: unknown[] } = await response.json();
    assert.equal(body.entries?.length, 1);
    assert.equal(body.followUps?.length, 1);
    const record = parseDecisionFollowUpRecord(body.followUps?.[0]);
    assert.ok(record);
    assert.equal(record.response, "deferred");
    assert.equal(record.note, undefined);
  });

  it("dedupes a retried decision write on its idempotency key", async () => {
    const withWriteId = { ...decisionPayload, writeId: "decision-write-1" };
    const first = await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify(withWriteId),
    }));
    assert.equal(first.status, 200);

    // The retry (or the service worker's replay) carries the same writeId.
    const second = await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify(withWriteId),
    }));
    assert.equal(second.status, 200);
    const secondBody: { created?: boolean; duplicate?: boolean } = await second.json();
    assert.equal(secondBody.created, false, "the write was not appended again");
    assert.equal(secondBody.duplicate, true, "the route names it a duplicate");

    const list = await getDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      headers: { "x-whether-client-id": "browser-1" },
    }));
    const listBody: { entries?: unknown[] } = await list.json();
    assert.equal(listBody.entries?.length, 1, "one decision, not two");
  });
});