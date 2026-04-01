import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, describe, it, mock, spyOn } from "bun:test";
import { POST as postBillingWebhookRoute } from "../app/api/billing/webhook/route";

const ORIGINAL_ENV = { ...process.env };

const buildStripeSignature = (payload: string, secret: string, timestamp = "1700000000") => {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return `t=${timestamp},v1=${signature}`;
};

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mock.restore();
});

describe("/api/billing/webhook", () => {
  it("rejects webhook payloads with invalid signatures", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const response = await postBillingWebhookRoute(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": "t=1700000000,v1=invalid",
        },
        body: payload,
      }),
    );

    assert.equal(response.status, 400);
  });

  it("rejects signatures with stale timestamps", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const timestampSeconds = String(Math.floor(Date.now() / 1000) - 301);

    const response = await postBillingWebhookRoute(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": buildStripeSignature(payload, process.env.STRIPE_WEBHOOK_SECRET, timestampSeconds),
        },
        body: payload,
      }),
    );

    assert.equal(response.status, 400);
  });

  it("accepts headers where a later v1 signature matches the active secret", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_active";

    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const timestampSeconds = String(Math.floor(Date.now() / 1000));
    const wrongSignature = createHmac("sha256", "whsec_old")
      .update(`${timestampSeconds}.${payload}`)
      .digest("hex");
    const validSignature = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
      .update(`${timestampSeconds}.${payload}`)
      .digest("hex");

    const response = await postBillingWebhookRoute(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": `t=${timestampSeconds},v1=${wrongSignature},v1=${validSignature}`,
        },
        body: payload,
      }),
    );

    assert.equal(response.status, 200);
  });

  it("accepts signed checkout completion events and forwards telemetry", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.PREMIUM_FUNNEL_WEBHOOK_URL = "https://example.test/premium";

    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          metadata: {
            source: "export_brief",
            planCandidate: "team",
            seatBand: "6-20",
          },
        },
      },
    });

    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const response = await postBillingWebhookRoute(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": buildStripeSignature(payload, process.env.STRIPE_WEBHOOK_SECRET, String(Math.floor(Date.now() / 1000))),
        },
        body: payload,
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(fetchMock.mock.calls.length, 1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { type?: string; source?: string; planCandidate?: string };
    assert.equal(body.type, "premium_checkout_complete");
    assert.equal(body.source, "export_brief");
    assert.equal(body.planCandidate, "team");
  });

  it("ignores events without valid premium source attribution", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_456",
          metadata: {
            source: "unknown_source",
          },
        },
      },
    });

    const response = await postBillingWebhookRoute(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": buildStripeSignature(payload, process.env.STRIPE_WEBHOOK_SECRET, String(Math.floor(Date.now() / 1000))),
        },
        body: payload,
      }),
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as { ignored?: boolean };
    assert.equal(body.ignored, true);
  });
});
