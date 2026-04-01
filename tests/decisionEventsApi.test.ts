import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { GET } from "../app/api/decision-events/route";
import { buildRegimeDecisionEvent, getDecisionEventStore, resetDecisionEventStore } from "../lib/events/decisionEventStore";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";

describe("/api/decision-events", () => {
  beforeEach(() => {
    resetDecisionEventStore();
  });

  it("returns paginated events with cursor metadata", async () => {
    const store = getDecisionEventStore();
    store.append(
      buildRegimeDecisionEvent({
        previousState: "EXPANSION",
        nextState: "DEFENSIVE",
        tightness: 74,
        riskAppetite: 53,
        thresholds: DEFAULT_THRESHOLDS,
        diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 5, transitionWatch: true },
        pendingCount: 2,
        transitionReason: "Tightness crossed above 70. Transition committed.",
      }),
    );
    store.append(
      buildRegimeDecisionEvent({
        previousState: "DEFENSIVE",
        nextState: "SCARCITY",
        tightness: 81,
        riskAppetite: 45,
        thresholds: DEFAULT_THRESHOLDS,
        diagnostics: { confidence: "HIGH", nearestThresholdDelta: 11, transitionWatch: false },
        pendingCount: 1,
        transitionReason: "Risk appetite crossed below 50. Transition committed.",
      }),
    );

    const request = { nextUrl: new URL("http://localhost/api/decision-events?limit=1") };
    const response = await GET(request as never);
    assert.equal(response.status, 200);

    const body = (await response.json()) as {
      events: Array<{ nextState: string }>;
      pagination: { returned: number; hasMore: boolean; nextCursor: string | null };
    };

    assert.equal(body.events.length, 1);
    assert.equal(body.events[0]?.nextState, "DEFENSIVE");
    assert.equal(body.pagination.returned, 1);
    assert.equal(body.pagination.hasMore, true);
    assert.equal(typeof body.pagination.nextCursor, "string");
  });

  it("supports deterministic replay from the requested cursor window", async () => {
    const store = getDecisionEventStore();
    store.append(
      buildRegimeDecisionEvent({
        previousState: "EXPANSION",
        nextState: "DEFENSIVE",
        tightness: 74,
        riskAppetite: 53,
        thresholds: DEFAULT_THRESHOLDS,
        diagnostics: { confidence: "MEDIUM", nearestThresholdDelta: 5, transitionWatch: true },
        pendingCount: 2,
        transitionReason: "Tightness crossed above 70. Transition committed.",
      }),
    );

    const request = { nextUrl: new URL("http://localhost/api/decision-events?replay=1&initialState=EXPANSION") };
    const response = await GET(request as never);
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      replay?: { initialState: string; finalState: string; eventCount: number };
    };

    assert.equal(body.replay?.initialState, "EXPANSION");
    assert.equal(body.replay?.finalState, "DEFENSIVE");
    assert.equal(body.replay?.eventCount, 1);
  });
});
