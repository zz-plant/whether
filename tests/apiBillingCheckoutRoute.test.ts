import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { POST as postCheckoutRoute } from "../app/api/billing/checkout/route";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mock.restoreAll();
});

describe("/api/billing/checkout", () => {
  it("returns 400 for malformed payload", async () => {
    const response = await postCheckoutRoute(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "enterprise" }),
      }),
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, "invalid_payload");
  });

  it("requires a valid premium source for attribution", async () => {
    const response = await postCheckoutRoute(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "pro", source: "pricing_page" }),
      }),
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, "invalid_payload");
  });

  it("returns checkout session when stripe is configured", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.APP_BASE_URL = "https://whether.test";
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro";
    process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team";

    const fetchMock = mock.method(globalThis, "fetch", async (input: string | URL) => {
      const url = String(input);
      if (url.includes("api.stripe.com")) {
        return new Response(
          JSON.stringify({ id: "cs_test_456", url: "https://checkout.stripe.com/c/pay/cs_test_456" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const response = await postCheckoutRoute(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem-123",
        },
        body: JSON.stringify({
          plan: "pro",
          returnPath: "/pricing",
          source: "export_brief",
        }),
      }),
    );

    assert.equal(response.status, 201);
    const body = (await response.json()) as { ok?: boolean; checkoutUrl?: string };
    assert.equal(body.ok, true);
    assert.match(body.checkoutUrl ?? "", /checkout\.stripe\.com/);

    const stripeCalls = fetchMock.mock.calls.filter((call) => String(call.arguments[0]).includes("api.stripe.com"));
    assert.equal(stripeCalls.length, 1);
    const [, stripeInit] = stripeCalls[0].arguments as [string, RequestInit];
    assert.equal((stripeInit.headers as Record<string, string>)["Idempotency-Key"], "idem-123");
  });
});
