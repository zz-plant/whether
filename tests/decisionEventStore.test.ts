import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
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

  it("preserves append-only immutability and insertion order", () => {
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

    const listed = store.listSince(null).events;
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
    const ordered = store.listSince(null).events;
    assert.equal(ordered[0]?.id, first.id);
    assert.equal(ordered[1]?.id, second.id);
  });

  it("replays deterministically from event history", () => {
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

    const history = store.listSince(null).events;
    assert.equal(store.replay("EXPANSION", history), "SCARCITY");
    assert.equal(store.replay("EXPANSION", history), "SCARCITY");
  });

  it("automatically appends committed state transitions", () => {
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

    advanceRegimeState(first.snapshot, {
      tightness: 77,
      riskAppetite: 39,
      thresholds: DEFAULT_THRESHOLDS,
      diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 4, transitionWatch: true },
    });

    const events = store.listSince(null).events;
    assert.equal(events.length, 1);
    assert.equal(events[0]?.previousState, "EXPANSION");
    assert.equal(events[0]?.nextState, "SCARCITY");
    assert.equal(events[0]?.triggerMetrics.pendingCount, 2);
  });
});
