import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock, spyOn } from "bun:test";
import { dispatchPremiumFunnelEvent, type PremiumFunnelEvent } from "../lib/premiumFunnel";
import {
  listPremiumFunnelEvents,
  recordPremiumFunnelEvent,
  resetPremiumFunnelEventLogForTests,
  summarizePremiumFunnelEvents,
} from "../lib/storage/premiumFunnelEventRepository";

const ORIGINAL_ENV = { ...process.env };

const event = (overrides: Partial<PremiumFunnelEvent> = {}): PremiumFunnelEvent => ({
  type: "premium_intent",
  source: "export_brief",
  path: "/operate",
  occurredAt: "2026-08-21T10:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  resetPremiumFunnelEventLogForTests();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetPremiumFunnelEventLogForTests();
  mock.restore();
});

describe("premium funnel durable capture", () => {
  it("persists events when no webhook is configured", async () => {
    delete process.env.PREMIUM_FUNNEL_WEBHOOK_URL;

    await dispatchPremiumFunnelEvent(event());

    const { events } = await listPremiumFunnelEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].source, "export_brief");
  });

  it("persists and forwards when a webhook is configured", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await dispatchPremiumFunnelEvent(event({ source: "api_access" }), "https://example.com/webhook");

    assert.equal(fetchMock.mock.calls.length, 1);
    const { events } = await listPremiumFunnelEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].source, "api_access");
  });

  it("keeps the click alive when the sink throws", async () => {
    const broken = {
      get: () => { throw new Error("kv down"); },
      put: () => { throw new Error("kv down"); },
      list: () => { throw new Error("kv down"); },
    };
    Object.assign(globalThis, { WHETHER_DURABLE_KV: broken });
    resetPremiumFunnelEventLogForTests();

    await recordPremiumFunnelEvent(event());

    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  });

  it("aggregates by source, type, and path", async () => {
    await recordPremiumFunnelEvent(event({ source: "api_access", path: "/api-docs" }));
    await recordPremiumFunnelEvent(event({ source: "api_access", path: "/api-docs" }));
    await recordPremiumFunnelEvent(event({ source: "team_workflow", path: "/operate/memory" }));
    await recordPremiumFunnelEvent(
      event({ source: "integrations", type: "premium_gate_view", path: "/operate" }),
    );

    const summary = await summarizePremiumFunnelEvents();

    assert.equal(summary.total, 4);
    assert.equal(summary.bySource.api_access, 2);
    assert.equal(summary.bySource.team_workflow, 1);
    assert.equal(summary.bySource.integrations, 1);
    assert.equal(summary.bySource.runway_planner, 0);
    assert.equal(summary.byType.premium_intent, 3);
    assert.equal(summary.byType.premium_gate_view, 1);
    assert.equal(summary.byPath["/api-docs"], 2);
  });

  it("reports the first and last event timestamps", async () => {
    await recordPremiumFunnelEvent(event({ occurredAt: "2026-08-19T09:00:00.000Z" }));
    await recordPremiumFunnelEvent(event({ occurredAt: "2026-08-21T17:30:00.000Z" }));
    await recordPremiumFunnelEvent(event({ occurredAt: "2026-08-20T12:00:00.000Z" }));

    const summary = await summarizePremiumFunnelEvents();

    assert.equal(summary.firstEventAt, "2026-08-19T09:00:00.000Z");
    assert.equal(summary.lastEventAt, "2026-08-21T17:30:00.000Z");
  });

  it("reports local-fallback when no KV binding is present", async () => {
    const summary = await summarizePremiumFunnelEvents();
    assert.equal(summary.backend, "local-fallback");
  });

  it("filters the tail by source", async () => {
    await recordPremiumFunnelEvent(event({ source: "export_brief" }));
    await recordPremiumFunnelEvent(event({ source: "api_access" }));

    const { events } = await listPremiumFunnelEvents({ source: "api_access" });

    assert.equal(events.length, 1);
    assert.equal(events[0].source, "api_access");
  });
});
