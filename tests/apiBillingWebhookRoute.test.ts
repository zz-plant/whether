import { requestBodyText } from "./fixtures/requestTarget";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, describe, it, mock, spyOn } from "bun:test";
import { POST as postBillingWebhookRoute } from "../app/api/billing/webhook/route";
import type { KvNamespace } from "../lib/runtime/kv";
import { listPremiumFunnelEvents, summarizePremiumFunnelEvents } from "../lib/storage/premiumFunnelEventRepository";

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
    // An annotation rather than a cast: JSON.parse returns `any`, so naming the
    // shape here asserts nothing the assertions below do not already check.
    const body: { type?: unknown; source?: unknown; planCandidate?: unknown } =
      JSON.parse(requestBodyText(init.body));
    assert.equal(body.type, "premium_checkout_complete");
    assert.equal(body.source, "export_brief");
    assert.equal(body.planCandidate, "team");
  });

  // Stripe redelivers `checkout.session.completed` until it gets a 2xx. Every event row has a
  // fresh key, so each delivery of one purchase used to count as another completion.
  it("counts a redelivered checkout completion once", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    delete process.env.PREMIUM_FUNNEL_WEBHOOK_URL;

    const entries = new Map<string, string>();
    const kv: KvNamespace = {
      get: async (key: string) => entries.get(key) ?? null,
      put: async (key: string, value: string) => {
        entries.set(key, value);
      },
      list: async (options?: { prefix?: string }) => ({
        keys: [...entries.keys()].filter((name) => name.startsWith(options?.prefix ?? "")).map((name) => ({ name })),
        list_complete: true,
      }),
    };
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });

    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_retry", metadata: { source: "export_brief", plan: "pro" } } },
    });
    const deliver = () =>
      postBillingWebhookRoute(
        new Request("http://localhost/api/billing/webhook", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "stripe-signature": buildStripeSignature(payload, "whsec_test", String(Math.floor(Date.now() / 1000))),
          },
          body: payload,
        }),
      );

    try {
      assert.equal((await deliver()).status, 200);
      const retry = await deliver();
      assert.equal(retry.status, 200, "a redelivery is acknowledged, so Stripe stops retrying");

      const summary = await summarizePremiumFunnelEvents();
      assert.equal(summary.byType.premium_checkout_complete, 1);
      const { events } = await listPremiumFunnelEvents();
      assert.deepEqual(events.map((event) => event.ctaId), ["cs_test_retry"]);
    } finally {
      Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    }
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
