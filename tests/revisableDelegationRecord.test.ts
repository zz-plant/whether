import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import type { DecisionMemoryEntry } from "../lib/decisionMemory";
import {
  canonicalizeRecord,
  hashRecord,
  toRevisableDelegationNdjson,
  toRevisableDelegationRecords,
} from "../lib/export/revisableDelegationRecord";

const decisionEntry: DecisionMemoryEntry = {
  id: "dm-2",
  createdAt: "2026-02-16T12:00:00.000Z",
  kind: "decision",
  owner: "kj",
  context: { clientId: "client-a", recordDate: "2026-02-16" },
  decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
  outcome: {
    verdict: "RISKY",
    summary: "Hiring remains constrained.",
    guardrail: "Require revenue-backed roles first.",
    reversalTrigger: "tightness drops below 70",
  },
  regime: { label: "DEFENSIVE", scores: { tightness: 72, riskAppetite: 52 } },
  sources: ["https://fred.stlouisfed.org/series/DGS1MO"],
  assumptions: { tightness: 72, riskAppetite: 52, tightnessThreshold: 70, riskAppetiteThreshold: 50 },
};

const snapshotEntry: DecisionMemoryEntry = {
  id: "dm-1",
  createdAt: "2026-02-09T12:00:00.000Z",
  kind: "posture-snapshot",
  context: { clientId: "client-a", recordDate: "2026-02-09" },
  outcome: { summary: "Stage decisions; avoid fixed-cost commitments.", guardrail: "", reversalTrigger: "" },
  regime: { label: "DEFENSIVE", scores: { tightness: 71 } },
  sources: [],
};

describe("STD-07 export of decision memory", () => {
  it("emits belief records only, with the decision depending on the regime belief", async () => {
    const records = await toRevisableDelegationRecords([decisionEntry], { baseUrl: "https://whether.work" });
    assert.equal(records.length, 2);
    assert.ok(records.every((record) => record.kind === "belief"));
    const [regime, decision] = records;
    assert.equal(regime.record_id, "whether:belief:dm-2:regime");
    assert.deepEqual(decision.depends_on, [regime.record_id]);
    assert.equal(decision.subject, "HIRING / HIRE (GROWTH)");
    /* The owner claim alone no longer buys a human actor — see below. */
    assert.equal(decision.actor.id, "whether-decision-shield");
    assert.equal(decision.actor.kind, "service");
    assert.equal(decision.actor.on_behalf_of, "client-a");
    assert.equal(decision.time.as_of, "2026-02-16T00:00:00.000Z");
    assert.equal(decision.time.recorded_at, "2026-02-16T12:00:00.000Z");
    assert.equal(decision.visibility, "private");
  });

  /*
   * `POST /api/decision-memory` had no authentication: `requireClientOwner`
   * compared a header against a body field the same caller wrote. Supplying
   * `owner` set `actor.kind: "human"`, so anyone could append a record
   * attributed to a named person into a ledger published as STD-07 conformance
   * level 2, chained, with an external verifier named beside it.
   *
   * The ledger is the artifact that would evidence the human review the
   * Acceptable Use Policy requires for decisions affecting individuals, so the
   * unauthenticated path could manufacture proof of the review the policy
   * demands. The chain and the server-set `recorded_at` stop tampering and
   * backdating; neither says anything about who wrote a record.
   */
  it("does not record a human actor the server cannot vouch for", async () => {
    const claimed = { ...decisionEntry, owner: "kj" };
    const [, decision] = await toRevisableDelegationRecords([claimed], { baseUrl: "https://whether.work" });

    assert.equal(decision.actor.kind, "service");
    assert.notEqual(decision.actor.id, "kj");
  });

  it("records a human actor once the request is verified", async () => {
    /* `verifiedOwner` is set by the route and only when a valid signed client
       token accompanied the write, so it cannot be reached from a payload. */
    const attested = { ...decisionEntry, owner: "kj", verifiedOwner: "kj" };
    const [, decision] = await toRevisableDelegationRecords([attested], { baseUrl: "https://whether.work" });

    assert.equal(decision.actor.kind, "human");
    assert.equal(decision.actor.id, "kj");
    assert.equal(decision.actor.on_behalf_of, "client-a");
  });

  it("never emits a belief that says nothing would end it", async () => {
    // The published conformance checker holds a stream at Level 1 for exactly
    // one empty invalidated_by, and a posture snapshot carrying no assumptions
    // used to produce one. A weekly call that cannot be invalidated is the
    // failure STD-07 exists to make visible, so the floor is asserted over
    // every record rather than over the entry shapes known today.
    const records = await toRevisableDelegationRecords([snapshotEntry, decisionEntry], {
      baseUrl: "https://whether.work",
    });
    for (const record of records) {
      assert.ok(
        record.invalidated_by.length > 0,
        `${record.record_id} states nothing that would end it`,
      );
    }
  });

  it("falls back to the regime label and the week when an entry carries no assumptions", async () => {
    const [snapshot] = await toRevisableDelegationRecords([snapshotEntry], {
      baseUrl: "https://whether.work",
    });
    assert.equal(snapshot.invalidated_by.length, 1);
    assert.equal(
      snapshot.invalidated_by[0].condition,
      "the operating regime moves off DEFENSIVE, or the week this call covers ends",
    );
    assert.equal(snapshot.invalidated_by[0].clock, "P7D");
  });

  it("restates the assumption snapshot and reversal trigger as invalidation conditions", async () => {
    const [regime, decision] = await toRevisableDelegationRecords([decisionEntry], { baseUrl: "https://whether.work" });
    const conditions = decision.invalidated_by.map((entry) => entry.condition);
    assert.equal(conditions.length, 3);
    assert.match(conditions[0], /funding pressure moves below the 70 line that changes the call \(recorded 72\)/);
    assert.match(conditions[1], /risk appetite moves below the 50 line that changes the call \(recorded 52\)/);
    assert.equal(conditions[2], "tightness drops below 70");
    assert.ok(decision.invalidated_by.every((entry) => entry.check === "https://whether.work/api/weekly"));
    assert.equal(regime.invalidated_by.length, 2);
  });

  it("chains records oldest first and hashes the canonical serialization", async () => {
    const records = await toRevisableDelegationRecords([decisionEntry, snapshotEntry], { baseUrl: "https://whether.work" });
    assert.equal(records.length, 3);
    assert.equal(records[0].record_id, "whether:belief:dm-1:call");
    assert.equal(records[0].integrity.prior_hash, undefined);
    assert.equal(records[1].integrity.prior_hash, records[0].integrity.hash);
    assert.equal(records[2].integrity.prior_hash, records[1].integrity.hash);
    for (const record of records) {
      assert.equal(record.integrity.hash, await hashRecord(record));
      assert.match(record.integrity.hash, /^[0-9a-f]{64}$/);
    }

    const seeded = await toRevisableDelegationRecords([snapshotEntry], { baseUrl: "https://whether.work", priorHash: "ab".repeat(32) });
    assert.equal(seeded[0].integrity.prior_hash, "ab".repeat(32));
  });

  it("canonicalizes independent of key order and excludes the integrity block", async () => {
    const [record] = await toRevisableDelegationRecords([snapshotEntry], { baseUrl: "https://whether.work" });
    const reordered = JSON.parse(JSON.stringify({ ...record, time: { recorded_at: record.time.recorded_at, as_of: record.time.as_of, valid_until: record.time.valid_until } }));
    assert.equal(canonicalizeRecord(reordered), canonicalizeRecord(record));
    assert.ok(!canonicalizeRecord(record).includes('"integrity"'));
    assert.ok(canonicalizeRecord(record).includes('"proposition"'));
  });

  it("serializes to ndjson one record per line", async () => {
    const records = await toRevisableDelegationRecords([snapshotEntry], { baseUrl: "https://whether.work" });
    const ndjson = toRevisableDelegationNdjson(records);
    assert.equal(ndjson.split("\n").filter(Boolean).length, 1);
    assert.equal(JSON.parse(ndjson.trim()).schema_version, "0.1.0");
    assert.equal(toRevisableDelegationNdjson([]), "");
  });
});
