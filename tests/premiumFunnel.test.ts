import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  dispatchPremiumFunnelEvent,
  isPremiumIntentSource,
  isValidPremiumFunnelEvent,
} from "../lib/premiumFunnel";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mock.restoreAll();
});

describe("premium funnel helpers", () => {
  it("accepts known premium intent sources", () => {
    assert.equal(isPremiumIntentSource("export_brief"), true);
    assert.equal(isPremiumIntentSource("runway_planner"), true);
    assert.equal(isPremiumIntentSource("integrations"), true);
    assert.equal(isPremiumIntentSource("api_access"), true);
    assert.equal(isPremiumIntentSource("team_workflow"), true);
  });

  it("rejects unknown premium intent sources", () => {
    assert.equal(isPremiumIntentSource("pricing"), false);
    assert.equal(isPremiumIntentSource(""), false);
  });

  it("validates premium funnel payload shape", () => {
    assert.equal(
      isValidPremiumFunnelEvent({
        type: "premium_checkout_complete",
        source: "export_brief",
        path: "/operations",
        planCandidate: "pro",
        seatBand: "2-5",
        occurredAt: new Date().toISOString(),
      }),
      true,
    );
    assert.equal(
      isValidPremiumFunnelEvent({
        type: "premium_intent",
        source: "pricing",
        path: "/operations",
        occurredAt: new Date().toISOString(),
      }),
      false,
    );
    assert.equal(
      isValidPremiumFunnelEvent({
        type: "premium_checkout_start",
        source: "export_brief",
        path: "/operations",
        planCandidate: "enterprise",
        occurredAt: new Date().toISOString(),
      }),
      false,
    );
  });

  it("forwards events when webhook is configured", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await dispatchPremiumFunnelEvent(
      {
        type: "premium_intent",
        source: "export_brief",
        path: "/operations",
        occurredAt: new Date().toISOString(),
      },
      "https://example.com/webhook",
    );

    assert.equal(fetchMock.mock.calls.length, 1);
  });
});
