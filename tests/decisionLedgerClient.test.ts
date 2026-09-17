import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  downloadDecisionLedger,
  fetchDecisionLedger,
  logDecisionToLedger,
} from "../app/components/decisionLedgerClient";
import { CLIENT_ID_HEADER } from "../lib/api/clientIdHeader";
import { requireClientOwner } from "../lib/api/clientOwnership";
import type { DecisionMemoryPayload } from "../lib/decisionMemory";

/**
 * The two ends of an owned request, which have to agree on one header.
 *
 * `/api/decision-memory` returns 401 without `x-whether-client-id`, so getting
 * this wrong does not throw — it reads to the reader as "the record could not
 * be read", which is indistinguishable from an outage. The header name is
 * asserted against the guard that enforces it rather than against a literal, so
 * a rename cannot pass here and fail in a browser.
 */

const payload: DecisionMemoryPayload = {
  recordDate: "2026-09-14",
  decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
  outcome: { verdict: "SAFE", summary: "Hire.", guardrail: "Pause above 85.", reversalTrigger: "Re-open below 65." },
  assessment: {
    regime: "EXPANSION",
    scores: {
      tightness: 40,
      tightnessPressure: 40,
      tightnessSaturated: false,
      riskAppetite: 60,
      baseRate: 3.2,
      baseRateUsed: "1M",
      curveSlope: 0.4,
    },
    thresholds: { baseRateTightness: 3.5, tightnessRegime: 70, riskAppetiteRegime: 50 },
    inputs: [],
  },
};

const capture = (body: unknown, status = 200) => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as unknown as typeof globalThis.fetch;
  return { calls, fetchImpl };
};

const headerOf = (init: RequestInit | undefined) =>
  (init?.headers as Record<string, string> | undefined)?.[CLIENT_ID_HEADER];

describe("decision ledger client", () => {
  it("sends the header the server actually authorises on", async () => {
    const { calls, fetchImpl } = capture({ entries: [] });
    await fetchDecisionLedger("browser-1", fetchImpl);

    const sent = headerOf(calls[0]?.init);
    assert.equal(sent, "browser-1");

    // The guard is the other end: what the client sends must satisfy it.
    const owner = requireClientOwner(new Request("https://whether.work/api/decision-memory", { headers: { [CLIENT_ID_HEADER]: sent ?? "" } }));
    assert.equal(owner.error, null);
    assert.equal(owner.ownerId, "browser-1");
  });

  /*
   * The ledger is append-only across schema versions by design — entries predate
   * the assumption snapshot, and older ones predate `kind`. One row an older
   * writer left must not take a reader's whole history off the page.
   */
  it("drops a row it cannot parse instead of losing the record", async () => {
    const { fetchImpl } = capture({
      entries: [
        { not: "an entry" },
        {
          id: "good",
          createdAt: "2026-09-14T00:00:00.000Z",
          context: { clientId: "browser-1", recordDate: "2026-09-14" },
          outcome: { summary: "Hold.", guardrail: "", reversalTrigger: "" },
          regime: { label: "EXPANSION", scores: {} },
          sources: [],
        },
      ],
    });

    const result = await fetchDecisionLedger("browser-1", fetchImpl);
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.entries.map((row) => row.id) : [], ["good"]);
  });

  it("reports a refusal in the reader's terms rather than throwing", async () => {
    const { fetchImpl } = capture({ error: "Unauthorized" }, 401);
    const result = await fetchDecisionLedger("browser-1", fetchImpl);

    assert.equal(result.ok, false);
    assert.doesNotMatch(result.ok ? "" : result.reason, /401|Unauthorized|fetch/i, "a status code is not a thing a reader can act on");
  });

  it("survives a network that is simply not there", async () => {
    const failing = (() => Promise.reject(new Error("offline"))) as unknown as typeof globalThis.fetch;
    assert.equal((await fetchDecisionLedger("browser-1", failing)).ok, false);
    assert.equal((await logDecisionToLedger("browser-1", payload, failing)).ok, false);
    assert.equal((await downloadDecisionLedger("browser-1", "csv", failing)).ok, false);
  });

  it("posts the decision under the same owner it claims", async () => {
    const { calls, fetchImpl } = capture({ ok: true }, 201);
    await logDecisionToLedger("browser-1", payload, fetchImpl);

    assert.equal(headerOf(calls[0]?.init), "browser-1");
    assert.equal(calls[0]?.init?.method, "POST");
    const body = calls[0]?.init?.body;
    assert.equal(typeof body, "string", "the request body is JSON text, not a stream");
    const sentBody: unknown = JSON.parse(typeof body === "string" ? body : "{}");
    assert.ok(sentBody && typeof sentBody === "object");
    const sent = Object(sentBody);
    assert.equal(sent.clientId, "browser-1", "the body's owner and the header's owner must match or the guard 403s");
    assert.equal(sent.recordDate, "2026-09-14");
  });

  /* A download is a fetch and a blob for one reason: a plain <a href> cannot
     send a header, so a download link would 401 on the reader's own record. */
  it("carries the header on a download too", async () => {
    const { calls, fetchImpl } = capture("slug,verdict\n", 200);
    await downloadDecisionLedger("browser-1", "records", fetchImpl).catch(() => undefined);

    assert.equal(headerOf(calls[0]?.init), "browser-1");
    assert.match(calls[0]?.url ?? "", /format=records/);
  });
});
