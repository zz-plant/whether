import assert from "node:assert/strict";
import { describe, it, beforeEach } from "bun:test";
import {
  DecisionEventStore,
  buildRegimeDecisionEvent,
  getDecisionEventStore,
  resetDecisionEventStore,
} from "../lib/events/decisionEventStore";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";
import { advanceRegimeState } from "../lib/report/regimeStateMachine";

describe("decision event store", () => {
  beforeEach(() => {
    resetDecisionEventStore();
  });

  it("preserves append-only immutability and insertion order", async () => {
    const store = new DecisionEventStore();
    const first = buildRegimeDecisionEvent({
      previousState: "EXPANSION",
      nextState: "DEFENSIVE",
      tightness: 76,
      riskAppetite: 51,
      thresholds: DEFAULT_THRESHOLDS,
      diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 3, transitionWatch: true },
      pendingCount: 2,
      transitionReason: "Tightness crossed above 70. Transition committed.",
    });

    const inserted = store.append(first);
    inserted.triggerMetrics.tightness = 1;
    inserted.reversalConditions.push("tamper");

    const listed = (await store.listSince(null)).events;
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.triggerMetrics.tightness, 76);
    assert.equal(listed[0]?.reversalConditions.includes("tamper"), false);

    const second = buildRegimeDecisionEvent({
      previousState: "DEFENSIVE",
      nextState: "SCARCITY",
      tightness: 85,
      riskAppetite: 40,
      thresholds: DEFAULT_THRESHOLDS,
      diagnostics: { confidence: "HIGH", nearestThresholdDelta: 10, transitionWatch: false },
      pendingCount: 1,
      transitionReason: "Signals moved into a different regime quadrant. Transition committed.",
    });

    store.append(second);
    const ordered = (await store.listSince(null)).events;
    assert.equal(ordered[0]?.id, first.id);
    assert.equal(ordered[1]?.id, second.id);
  });

  it("replays deterministically from event history", async () => {
    const store = new DecisionEventStore();
    const events = [
      buildRegimeDecisionEvent({
        previousState: "EXPANSION",
        nextState: "DEFENSIVE",
        tightness: 76,
        riskAppetite: 52,
        thresholds: DEFAULT_THRESHOLDS,
        diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 4, transitionWatch: true },
        pendingCount: 2,
        transitionReason: "Tightness crossed above 70. Transition committed.",
      }),
      buildRegimeDecisionEvent({
        previousState: "DEFENSIVE",
        nextState: "SCARCITY",
        tightness: 80,
        riskAppetite: 45,
        thresholds: DEFAULT_THRESHOLDS,
        diagnostics: { confidence: "HIGH", nearestThresholdDelta: 12, transitionWatch: false },
        pendingCount: 1,
        transitionReason: "Risk appetite crossed below 50. Transition committed.",
      }),
    ];

    for (const event of events) {
      store.append(event);
    }

    const history = (await store.listSince(null)).events;
    assert.equal(store.replay("EXPANSION", history), "SCARCITY");
    assert.equal(store.replay("EXPANSION", history), "SCARCITY");
  });

  it("records committed state transitions", async () => {
    const store = getDecisionEventStore();

    const first = advanceRegimeState(
      {
        committedState: "EXPANSION",
        pendingState: null,
        pendingCount: 0,
        lastSignals: { tightness: 60, riskAppetite: 58 },
      },
      {
        tightness: 76,
        riskAppetite: 40,
        thresholds: DEFAULT_THRESHOLDS,
        diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 4, transitionWatch: true },
      },
    );

    const second = advanceRegimeState(first.snapshot, {
      tightness: 77,
      riskAppetite: 39,
      thresholds: DEFAULT_THRESHOLDS,
      diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 4, transitionWatch: true },
    });

    if (second.committed) {
      store.append(
        buildRegimeDecisionEvent({
          previousState: "EXPANSION",
          nextState: second.nextState,
          tightness: 77,
          riskAppetite: 39,
          thresholds: DEFAULT_THRESHOLDS,
          diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 4, transitionWatch: true },
          pendingCount: second.transitionPendingCount ?? 2,
          transitionReason: second.transitionReason,
        }),
      );
    }

    const events = (await store.listSince(null)).events;
    assert.equal(events.length, 1);
    assert.equal(events[0]?.previousState, "EXPANSION");
    assert.equal(events[0]?.nextState, "SCARCITY");
    assert.equal(events[0]?.triggerMetrics.pendingCount, 2);
  });

  it("persists and reads events from a cloudflare kv binding", async () => {
    class FakeKv {
      private readonly data = new Map<string, string>();

      async get(key: string) {
        return this.data.get(key) ?? null;
      }

      async put(key: string, value: string) {
        this.data.set(key, value);
      }

      async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
        const prefix = options?.prefix ?? "";
        const keys = [...this.data.keys()]
          .filter((key) => key.startsWith(prefix))
          .sort()
          .map((name) => ({ name }));
        return { keys, list_complete: true } as const;
      }
    }

    const fakeKv = new FakeKv();
    const store = new DecisionEventStore(fakeKv);
    const first = buildRegimeDecisionEvent({
      previousState: "EXPANSION",
      nextState: "DEFENSIVE",
      tightness: 75,
      riskAppetite: 52,
      thresholds: DEFAULT_THRESHOLDS,
      diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 4, transitionWatch: true },
      pendingCount: 2,
      transitionReason: "Tightness crossed above 70. Transition committed.",
    });

    const second = buildRegimeDecisionEvent({
      previousState: "DEFENSIVE",
      nextState: "SCARCITY",
      tightness: 82,
      riskAppetite: 44,
      thresholds: DEFAULT_THRESHOLDS,
      diagnostics: { confidence: "HIGH", nearestThresholdDelta: 9, transitionWatch: false },
      pendingCount: 1,
      transitionReason: "Risk appetite crossed below 50. Transition committed.",
    });

    store.append(first);
    store.append(second);
    await store.whenDurableFlushCompletes();

    const reloaded = new DecisionEventStore(fakeKv);
    const listed = await reloaded.listSince(null);
    assert.equal(listed.events.length, 2);
    assert.equal(listed.events[0]?.id, first.id);
    assert.equal(listed.events[1]?.id, second.id);

    const sinceFirst = await reloaded.listSince("0");
    assert.equal(sinceFirst.events.length, 1);
    assert.equal(sinceFirst.events[0]?.id, second.id);
  });

  /* The store's durable half is DurableEventLog now. Production KV holds events under the
     keys the store wrote by hand before, so those keys are the contract. */
  it("keeps the key scheme production KV already holds", async () => {
    const data = new Map<string, string>([
      ["meta:decision-event:index", "0"],
      [
        "decision-event:000000000000",
        JSON.stringify({ id: "stored-before", type: "RegimeDecisionEvent", previousState: "EXPANSION", nextState: "DEFENSIVE" }),
      ],
    ]);
    const kv = {
      get: async (key: string) => data.get(key) ?? null,
      put: async (key: string, value: string) => {
        data.set(key, value);
      },
      list: async () => ({ keys: [], list_complete: true }),
    };

    const store = new DecisionEventStore(kv);
    const appended = store.append(
      buildRegimeDecisionEvent({
        previousState: "DEFENSIVE",
        nextState: "SCARCITY",
        tightness: 82,
        riskAppetite: 44,
        thresholds: DEFAULT_THRESHOLDS,
        diagnostics: { confidence: "HIGH", nearestThresholdDelta: 9, transitionWatch: false },
        pendingCount: 1,
        transitionReason: "Risk appetite crossed below 50. Transition committed.",
      }),
    );
    await store.whenDurableFlushCompletes();

    assert.equal(data.get("meta:decision-event:index"), "1");
    assert.equal(JSON.parse(data.get("decision-event:000000000001") ?? "{}").id, appended.id);

    const listed = await new DecisionEventStore(kv).listSince(null, 1);
    assert.deepEqual(listed.events.map((event) => event.id), ["stored-before", appended.id], "one past the page");
    assert.equal(listed.cursor, "1");
  });

});
