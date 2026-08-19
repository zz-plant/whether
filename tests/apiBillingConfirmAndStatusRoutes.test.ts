import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { POST as postConfirmRoute } from "../app/api/billing/confirm/route";
import { POST as postStatusRoute } from "../app/api/billing/status/route";
import { resetEntitlementMemoryStore, saveEntitlement } from "../lib/billing/entitlements";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetEntitlementMemoryStore();
});

const jsonRequest = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("/api/billing/confirm", () => {
  it("404s a session id with no persisted entitlement", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";
    const response = await postConfirmRoute(
      jsonRequest("http://localhost/api/billing/confirm", { sessionId: "cs_missing" }),
    );
    assert.equal(response.status, 404);
  });

  it("issues a token for a persisted active entitlement", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";
    await saveEntitlement({
      plan: "pro",
      sessionId: "cs_ok",
      customerEmail: "buyer@example.com",
      status: "active",
      activatedAt: "2026-08-01T00:00:00.000Z",
    });

    const response = await postConfirmRoute(
      jsonRequest("http://localhost/api/billing/confirm", { sessionId: "cs_ok" }),
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.plan, "pro");
    assert.equal(typeof body.token, "string");
  });

  it("503s when the entitlement secret isn't configured", async () => {
    delete process.env.WHETHER_ENTITLEMENT_SECRET;
    await saveEntitlement({
      plan: "pro",
      sessionId: "cs_unconfigured",
      status: "active",
      activatedAt: "2026-08-01T00:00:00.000Z",
    });

    const response = await postConfirmRoute(
      jsonRequest("http://localhost/api/billing/confirm", { sessionId: "cs_unconfigured" }),
    );
    assert.equal(response.status, 503);
  });

  it("400s a missing session id", async () => {
    const response = await postConfirmRoute(jsonRequest("http://localhost/api/billing/confirm", {}));
    assert.equal(response.status, 400);
  });
});

describe("/api/billing/status", () => {
  it("reports inactive for a garbage token", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";
    const response = await postStatusRoute(
      jsonRequest("http://localhost/api/billing/status", { token: "not-a-token" }),
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.active, false);
  });

  it("reports active for a token backed by a live record", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";
    await saveEntitlement({
      plan: "team",
      sessionId: "cs_live",
      customerEmail: "live@example.com",
      status: "active",
      activatedAt: "2026-08-01T00:00:00.000Z",
    });
    const confirmResponse = await postConfirmRoute(
      jsonRequest("http://localhost/api/billing/confirm", { sessionId: "cs_live" }),
    );
    const { token } = await confirmResponse.json();

    const response = await postStatusRoute(jsonRequest("http://localhost/api/billing/status", { token }));
    const body = await response.json();
    assert.equal(body.active, true);
    assert.equal(body.plan, "team");
  });

  it("reports inactive once the underlying record is cancelled, even with a live signature", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";
    await saveEntitlement({
      plan: "pro",
      sessionId: "cs_cancel_me",
      customerEmail: "cancel@example.com",
      stripeCustomerId: "cus_cancel_me",
      status: "active",
      activatedAt: "2026-08-01T00:00:00.000Z",
    });
    const confirmResponse = await postConfirmRoute(
      jsonRequest("http://localhost/api/billing/confirm", { sessionId: "cs_cancel_me" }),
    );
    const { token } = await confirmResponse.json();

    // Simulate the webhook flipping the record on customer.subscription.deleted.
    await saveEntitlement({
      plan: "pro",
      sessionId: "cs_cancel_me",
      customerEmail: "cancel@example.com",
      stripeCustomerId: "cus_cancel_me",
      status: "cancelled",
      activatedAt: "2026-08-01T00:00:00.000Z",
      cancelledAt: "2026-08-10T00:00:00.000Z",
    });

    const response = await postStatusRoute(jsonRequest("http://localhost/api/billing/status", { token }));
    const body = await response.json();
    assert.equal(body.active, false);
    assert.equal(body.reason, "cancelled");
  });
});
