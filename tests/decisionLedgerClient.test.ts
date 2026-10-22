import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  downloadDecisionLedger,
  fetchDecisionLedger,
  loadRecordNoteView,
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
    const owner = await requireClientOwner(new Request("https://whether.work/api/decision-memory", { headers: { [CLIENT_ID_HEADER]: sent ?? "" } }));
    assert.equal(owner.error, null);
    assert.equal(owner.ownerId, "browser-1");
    /* Admitted, but not vouched for: the id round-trips, and without a signed
       token nothing downstream may record it as an attested human act. */
    assert.equal(owner.verified, false);
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

  /* A minimal IndexedDB fake for the offline stash: one object store with put
     and a cursor walk. Results arrive on the microtask queue and transaction
     completion on the macrotask queue after it, which is the order the client
     awaits them in. The map is exposed so a test can assert on what the queue
     actually holds rather than on whether the calls resolved. */
  const fakeIndexedDB = () => {
    const entries = new Map<string, { key: string; value: unknown }>();
    const micro = (fn: () => void) => queueMicrotask(fn);

    const store = {
      put(value: unknown, key: string) {
        micro(() => entries.set(key, { key, value }));
      },
      openCursor() {
        type FakeCursor = { key: string; value: unknown; delete: () => void; continue: () => void };
        const request: { result: FakeCursor | null; onsuccess: (() => void) | null; onerror: (() => void) | null } = {
          result: null,
          onsuccess: null,
          onerror: null,
        };
        let index = 0;
        const fire = () =>
          micro(() => {
            const keys = [...entries.keys()].sort();
            /* The undefined check is the bounds check: a sorted snapshot has no
               element at an index past its end, so this only fires when the
               walk is done — and it narrows `key` for the two reads below. */
            const key = keys[index];
            if (key === undefined) {
              request.result = null;
            } else {
              index += 1;
              request.result = {
                key,
                value: entries.get(key)?.value,
                delete: () => entries.delete(key),
                continue: () => fire(),
              };
            }
            request.onsuccess?.();
          });
        fire();
        return request;
      },
    };

    const db = {
      close: () => {},
      transaction: () => {
        const tx: { objectStore: () => typeof store; oncomplete: (() => void) | null; onerror: (() => void) | null } = {
          objectStore: () => store,
          oncomplete: null,
          onerror: null,
        };
        setTimeout(() => tx.oncomplete?.(), 0);
        return tx;
      },
    };

    const open = () => {
      const request: { result: unknown; onsuccess: (() => void) | null; onerror: (() => void) | null } = {
        result: null,
        onsuccess: null,
        onerror: null,
      };
      micro(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    };

    return { open, entries };
  };

  const withIndexedDB = async <T>(fake: { open: unknown }, run: () => Promise<T>): Promise<T> => {
    Reflect.set(globalThis, "indexedDB", fake);
    try {
      return await run();
    } finally {
      Reflect.deleteProperty(globalThis, "indexedDB");
    }
  };

  const offlineFetch: typeof globalThis.fetch = () => Promise.reject(new Error("offline"));

  /** The action a stashed entry's payload names, narrowed from IndexedDB at runtime. */
  const stashedAction = (value: unknown): string | null => {
    if (typeof value !== "object" || value === null) return null;
    const entryPayload: unknown = Reflect.get(value, "payload");
    if (typeof entryPayload !== "object" || entryPayload === null) return null;
    const decision: unknown = Reflect.get(entryPayload, "decision");
    if (typeof decision !== "object" || decision === null) return null;
    const action: unknown = Reflect.get(decision, "action");
    return typeof action === "string" ? action : null;
  };

  it("queues two offline decisions as two records, not one overwriting the other", async () => {
    const fake = fakeIndexedDB();
    const other = { ...payload, decision: { ...payload.decision, action: "RESTRUCTURE" as const } };
    await withIndexedDB(fake, async () => {
      await logDecisionToLedger("browser-1", payload, offlineFetch);
      await logDecisionToLedger("browser-1", other, offlineFetch);
    });

    assert.equal(fake.entries.size, 2, "the second stashed write must not replace the first");
    const actions = [...fake.entries.values()].map((entry) => stashedAction(entry.value) ?? "");
    assert.deepEqual(actions.sort(), ["HIRE", "RESTRUCTURE"]);
    const keys = [...fake.entries.keys()];
    assert.ok(keys.every((key) => key.startsWith("browser-1:")), "entries stay grouped under the client that stashed them");
    assert.ok(new Set(keys).size === keys.length, "keys are unique per stashed write");
  });

  it("clears only the stashed copy of the decision that just posted, leaving other offline decisions queued", async () => {
    const fake = fakeIndexedDB();
    const other = { ...payload, decision: { ...payload.decision, action: "RESTRUCTURE" as const } };
    await withIndexedDB(fake, async () => {
      // Both decisions are recorded offline and stashed.
      await logDecisionToLedger("browser-1", payload, offlineFetch);
      await logDecisionToLedger("browser-1", other, offlineFetch);
      // Back online, the reader taps the first one again and it posts.
      const { fetchImpl } = capture({ ok: true }, 201);
      await logDecisionToLedger("browser-1", payload, fetchImpl);
    });

    assert.equal(fake.entries.size, 1, "the re-tap clears its own stashed copy and nothing else");
    const remaining = fake.entries.values().next().value;
    assert.ok(remaining, "one entry remains queued");
    assert.equal(stashedAction(remaining.value), "RESTRUCTURE");
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

/*
 * The homepage's read of the record. `/` is the busiest route on the site and nearly every browser
 * on it has an id and no decisions, so it asks the server only when this browser remembers having
 * recorded one, and the memory is kept by the two calls that change what the record holds.
 */
describe("the record note's read", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      values,
      storage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value),
        removeItem: (key: string) => void values.delete(key),
      },
    };
  };
  const KEY = "whether.decisionMemory:browser-1";

  const ledgerEntry = (id: string, recorded: { tightness: number; riskAppetite: number }) => ({
    id,
    createdAt: "2026-09-14T00:00:00.000Z",
    context: { clientId: "browser-1", recordDate: "2026-09-14" },
    decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
    outcome: { verdict: "SAFE", summary: "Hire the two open roles.", guardrail: "Pause above 85.", reversalTrigger: "Re-open below 65." },
    regime: { label: "EXPANSION", scores: {} },
    sources: [],
    assumptions: {
      tightness: recorded.tightness,
      riskAppetite: recorded.riskAppetite,
      tightnessThreshold: recorded.tightness,
      riskAppetiteThreshold: recorded.riskAppetite,
    },
  });
  const current = { tightness: 60, riskAppetite: 40 };

  it("does not ask the server about a browser that has never recorded a decision", async () => {
    const { calls, fetchImpl } = capture({ entries: [ledgerEntry("a", { tightness: 10, riskAppetite: 90 })] });
    const { storage } = memory();

    assert.equal(await loadRecordNoteView("browser-1", current, fetchImpl, storage), null);
    assert.equal(calls.length, 0, "no request for an answer that has always been none");
  });

  it("reads the record when the browser remembers one, and keeps the memory current", async () => {
    const { calls, fetchImpl } = capture({
      entries: [ledgerEntry("moved", { tightness: 10, riskAppetite: 90 }), ledgerEntry("holds", { tightness: 90, riskAppetite: 10 })],
    });
    const { storage, values } = memory();
    values.set(KEY, "1");

    const view = await loadRecordNoteView("browser-1", current, fetchImpl, storage);

    assert.equal(calls.length, 1);
    assert.equal(view?.rows.length, 2);
    assert.equal(view?.headline, "1 decision rests on conditions that have moved since it was recorded.");
    assert.equal(values.get(KEY), "2", "the record held two, so the browser now remembers two");
  });

  it("forgets a record that is gone, and says nothing for it", async () => {
    const { fetchImpl } = capture({ entries: [] });
    const { storage, values } = memory();
    values.set(KEY, "3");

    assert.equal(await loadRecordNoteView("browser-1", current, fetchImpl, storage), null);
    assert.equal(values.has(KEY), false, "an emptied record stops being asked about");
  });

  it("puts nothing under the call when the record cannot be read", async () => {
    const { fetchImpl } = capture({ error: "unavailable" }, 503);
    const { storage, values } = memory();
    values.set(KEY, "2");

    assert.equal(await loadRecordNoteView("browser-1", current, fetchImpl, storage), null);
    assert.equal(values.get(KEY), "2", "a failed read is not evidence the record is empty");
  });

  it("remembers a decision the moment it is recorded, and not one that was refused", async () => {
    const { storage, values } = memory();

    await logDecisionToLedger("browser-1", payload, capture({ ok: true }, 201).fetchImpl, storage);
    assert.equal(values.get(KEY), "1");
    await logDecisionToLedger("browser-1", payload, capture({ ok: true }, 201).fetchImpl, storage);
    assert.equal(values.get(KEY), "2");

    await logDecisionToLedger("browser-1", payload, capture({ error: "no" }, 500).fetchImpl, storage);
    assert.equal(values.get(KEY), "2", "a decision that was not recorded is not counted");
  });

  it("carries on where storage is blocked", async () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };

    assert.equal(await loadRecordNoteView("browser-1", current, capture({ entries: [] }).fetchImpl, blocked), null);
    assert.equal((await logDecisionToLedger("browser-1", payload, capture({ ok: true }, 201).fetchImpl, blocked)).ok, true);
    assert.equal((await fetchDecisionLedger("browser-1", capture({ entries: [] }).fetchImpl, blocked)).ok, true);
  });
});
