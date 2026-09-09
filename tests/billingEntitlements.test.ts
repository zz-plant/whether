import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import {
  cancelEntitlementByCustomerId,
  getEntitlementByCustomerId,
  getEntitlementByEmail,
  getEntitlementBySessionId,
  issueEntitlementToken,
  resetEntitlementMemoryStore,
  saveEntitlement,
  verifyEntitlementToken,
} from "../lib/billing/entitlements";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetEntitlementMemoryStore();
});

describe("entitlement persistence", () => {
  it("is readable by session id, email, and customer id after saving", async () => {
    await saveEntitlement({
      plan: "pro",
      sessionId: "cs_1",
      customerEmail: "Buyer@Example.com",
      stripeCustomerId: "cus_1",
      status: "active",
      activatedAt: "2026-08-01T00:00:00.000Z",
    });

    assert.equal((await getEntitlementBySessionId("cs_1"))?.plan, "pro");
    // Email lookups are case-insensitive — Stripe's customer_details.email casing isn't guaranteed.
    assert.equal((await getEntitlementByEmail("buyer@example.com"))?.plan, "pro");
    assert.equal((await getEntitlementByCustomerId("cus_1"))?.plan, "pro");
  });

  it("flips status to cancelled without deleting the record", async () => {
    await saveEntitlement({
      plan: "team",
      sessionId: "cs_2",
      stripeCustomerId: "cus_2",
      status: "active",
      activatedAt: "2026-08-01T00:00:00.000Z",
    });

    const cancelled = await cancelEntitlementByCustomerId("cus_2");
    assert.equal(cancelled, true);

    const record = await getEntitlementByCustomerId("cus_2");
    assert.equal(record?.status, "cancelled");
    assert.ok(record?.cancelledAt);
  });

  it("reports false when cancelling a customer id with no record", async () => {
    const cancelled = await cancelEntitlementByCustomerId("cus_unknown");
    assert.equal(cancelled, false);
  });
});

describe("entitlement tokens", () => {
  it("refuses to issue or verify without a configured secret", async () => {
    delete process.env.WHETHER_ENTITLEMENT_SECRET;

    const token = await issueEntitlementToken({ plan: "pro", sessionId: "cs_3" });
    assert.equal(token, null);

    const verification = await verifyEntitlementToken("anything.anything");
    assert.equal(verification.ok, false);
    if (!verification.ok) assert.equal(verification.reason, "unconfigured");
  });

  it("round-trips a valid token", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";

    const token = await issueEntitlementToken({ plan: "team", sessionId: "cs_4", customerEmail: "a@b.com" });
    assert.ok(token);

    const verification = await verifyEntitlementToken(token!);
    assert.equal(verification.ok, true);
    if (verification.ok) {
      assert.equal(verification.payload.plan, "team");
      assert.equal(verification.payload.email, "a@b.com");
    }
  });

  it("rejects a token signed under a different secret", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "secret-a";
    const token = await issueEntitlementToken({ plan: "pro", sessionId: "cs_5" });

    process.env.WHETHER_ENTITLEMENT_SECRET = "secret-b";
    const verification = await verifyEntitlementToken(token!);
    assert.equal(verification.ok, false);
    if (!verification.ok) assert.equal(verification.reason, "bad_signature");
  });

  it("rejects a tampered payload even with a valid-looking signature", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";
    const token = await issueEntitlementToken({ plan: "pro", sessionId: "cs_6" });
    const [, signature] = token!.split(".");
    const tamperedPayload = JSON.stringify({ plan: "team", sessionId: "cs_6", iat: Date.now(), exp: Date.now() + 1000 });
    const tamperedBody = Buffer.from(tamperedPayload).toString("base64url");

    const verification = await verifyEntitlementToken(`${tamperedBody}.${signature}`);
    assert.equal(verification.ok, false);
    if (!verification.ok) assert.equal(verification.reason, "bad_signature");
  });

  it("rejects an expired token", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";
    const issuedAt = Date.parse("2026-01-01T00:00:00.000Z");
    const token = await issueEntitlementToken({ plan: "pro", sessionId: "cs_7" }, issuedAt);

    const verification = await verifyEntitlementToken(token!, issuedAt + 40 * 24 * 60 * 60 * 1000);
    assert.equal(verification.ok, false);
    if (!verification.ok) assert.equal(verification.reason, "expired");
  });

  it("rejects malformed tokens", async () => {
    process.env.WHETHER_ENTITLEMENT_SECRET = "test-secret";
    const verification = await verifyEntitlementToken("not-a-real-token");
    assert.equal(verification.ok, false);
    if (!verification.ok) assert.equal(verification.reason, "malformed");
  });
});
