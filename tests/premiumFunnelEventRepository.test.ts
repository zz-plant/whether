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

  it("stamps a trusted server receive time alongside the client timestamp", async () => {
    const before = Date.now();
    await recordPremiumFunnelEvent(event({ occurredAt: "1999-01-01T00:00:00.000Z" }));

    const { events } = await listPremiumFunnelEvents();

    assert.equal(events[0].occurredAt, "1999-01-01T00:00:00.000Z");
    assert.ok(Date.parse(events[0].receivedAt) >= before);
  });

  it("returns events newest first", async () => {
    await recordPremiumFunnelEvent(event({ source: "export_brief" }));
    await recordPremiumFunnelEvent(event({ source: "api_access" }));
    await recordPremiumFunnelEvent(event({ source: "integrations" }));

    const { events } = await listPremiumFunnelEvents();

    assert.deepEqual(events.map((entry) => entry.source), [
      "integrations",
      "api_access",
      "export_brief",
    ]);
  });

  it("flags a filled window as truncated so a windowed count is not read as total", async () => {
    await recordPremiumFunnelEvent(event());
    await recordPremiumFunnelEvent(event());

    assert.equal((await summarizePremiumFunnelEvents(2)).truncated, true);
    assert.equal((await summarizePremiumFunnelEvents(50)).truncated, false);
  });

  it("reports local-fallback when no KV binding is present", async () => {
    const summary = await summarizePremiumFunnelEvents();
    assert.equal(summary.backend, "local-fallback");
  });

  /* Guards the property that makes this store safe where DurableEventLog was not:
     a key is derived per event with no shared counter and no serialization, so
     concurrent writers cannot land on the same key and overwrite each other. The
     assertion on `written.size` is the load-bearing one — an allocator that collided
     would produce fewer stored keys than events. */
  it("allocates a distinct key per event under concurrent writes", async () => {
    const written = new Map<string, string>();
    const kv = {
      get: async (key: string) => written.get(key) ?? null,
      put: async (key: string, value: string) => { written.set(key, value); },
      list: async ({ prefix, limit }: { prefix?: string; limit?: number }) => {
        const keys = [...written.keys()]
          .filter((key) => !prefix || key.startsWith(prefix))
          .sort()
          .slice(0, limit ?? 1000)
          .map((name) => ({ name }));
        return { keys, list_complete: true, cursor: undefined };
      },
    };
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });

    await Promise.all(
      Array.from({ length: 50 }, (_unused, index) =>
        recordPremiumFunnelEvent(event({ path: `/click/${index}` })),
      ),
    );

    assert.equal(written.size, 50, "a collided key would leave fewer stored entries");

    const { events } = await listPremiumFunnelEvents({ limit: 100 });
    assert.equal(events.length, 50);
    assert.equal(new Set(events.map((entry) => entry.path)).size, 50);

    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  });

  it("skips malformed stored rows instead of counting them", async () => {
    const written = new Map<string, string>([
      ["premium-funnel:00000000000001:a", JSON.stringify({ nonsense: true })],
      ["premium-funnel:00000000000002:b", "{not json"],
      [
        "premium-funnel:00000000000003:c",
        JSON.stringify({ ...event({ source: "api_access" }), receivedAt: "2026-08-21T10:00:00.000Z" }),
      ],
    ]);
    Object.assign(globalThis, {
      WHETHER_DURABLE_KV: {
        get: async (key: string) => written.get(key) ?? null,
        put: async () => undefined,
        list: async () => ({
          keys: [...written.keys()].map((name) => ({ name })),
          list_complete: true,
          cursor: undefined,
        }),
      },
    });

    const summary = await summarizePremiumFunnelEvents();

    assert.equal(summary.total, 1);
    assert.equal(summary.bySource.api_access, 1);

    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  });

  it("filters the tail by source", async () => {
    await recordPremiumFunnelEvent(event({ source: "export_brief" }));
    await recordPremiumFunnelEvent(event({ source: "api_access" }));

    const { events } = await listPremiumFunnelEvents({ source: "api_access" });

    assert.equal(events.length, 1);
    assert.equal(events[0].source, "api_access");
  });
});
