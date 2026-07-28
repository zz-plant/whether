import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DecisionEventStore, type RegimeDecisionEvent } from "../lib/events/decisionEventStore";

const EVENT_PREFIX = "decision-event:";
const EVENT_INDEX_KEY = "meta:decision-event:index";

// Only the fields the store's type guard and these assertions depend on; the rest of the
// event shape is irrelevant to read-bounding behaviour.
const buildEvent = (index: number): RegimeDecisionEvent =>
  ({
    id: `event-${index}`,
    type: "RegimeDecisionEvent",
    occurredAt: new Date(Date.UTC(2026, 0, 1) + index * 3_600_000).toISOString(),
    previousState: "EXPANSION",
    nextState: "EXPANSION",
  }) as unknown as RegimeDecisionEvent;

const createKv = (count: number) => {
  const store = new Map<string, string>();
  const gets: string[] = [];

  for (let index = 0; index < count; index++) {
    store.set(`${EVENT_PREFIX}${String(index).padStart(12, "0")}`, JSON.stringify(buildEvent(index)));
  }
  store.set(EVENT_INDEX_KEY, String(count - 1));

  return {
    gets,
    kv: {
      async get(key: string) {
        gets.push(key);
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
        const keys = [...store.keys()]
          .filter((key) => key.startsWith(options?.prefix ?? ""))
          .sort()
          .map((name) => ({ name }));
        return { keys, list_complete: true as const };
      },
    },
  };
};

const eventGets = (gets: string[]) => gets.filter((key) => key.startsWith(EVENT_PREFIX));

describe("DecisionEventStore.listSince", () => {
  it("reads only the requested page rather than the whole log", async () => {
    const { kv, gets } = createKv(4_000);
    const store = new DecisionEventStore(kv);

    const listed = await store.listSince(null, 25);

    // Regression guard: previously every key above the cursor was fetched and the caller's
    // limit was applied only afterwards.
    assert.equal(eventGets(gets).length, 26); // limit + 1, to preserve hasMore detection
    assert.equal(listed.events.length, 26);
  });

  it("still lets the route detect that more pages exist", async () => {
    const { kv } = createKv(500);
    const store = new DecisionEventStore(kv);

    const listed = await store.listSince(null, 10);

    assert.equal(listed.events.length > 10, true);
  });

  it("pages forward from a cursor", async () => {
    const { kv } = createKv(500);
    const store = new DecisionEventStore(kv);

    const listed = await store.listSince("99", 3);

    assert.deepEqual(listed.events.slice(0, 3).map((event) => event.id), [
      "event-100",
      "event-101",
      "event-102",
    ]);
  });

  it("caps an unlimited read instead of scanning without bound", async () => {
    const { kv, gets } = createKv(5_000);
    const store = new DecisionEventStore(kv);

    await store.listSince(null);

    assert.equal(eventGets(gets).length <= 1_000, true);
  });
});
