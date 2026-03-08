import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  createStripeCheckoutSession,
  isStripeBillingReady,
  StripeBillingError,
} from "../lib/billingStripe";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mock.restoreAll();
});

describe("stripe billing helpers", () => {
  it("reports readiness only when required env vars exist", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.APP_BASE_URL = "https://whether.test";
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro";
    process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team";

    assert.equal(isStripeBillingReady(), true);

    delete process.env.STRIPE_PRICE_TEAM_MONTHLY;
    assert.equal(isStripeBillingReady(), false);
  });

  it("creates a checkout session for a configured plan", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.APP_BASE_URL = "https://whether.test";
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro";
    process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team";

    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(
        JSON.stringify({ id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const checkout = await createStripeCheckoutSession({
      plan: "pro",
      path: "/pricing",
      source: "ops_export",
      idempotencyKey: "idem-456",
    });

    assert.equal(checkout.id, "cs_test_123");
    assert.match(checkout.url, /checkout\.stripe\.com/);

    const [, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.equal((init.headers as Record<string, string>)["Idempotency-Key"], "idem-456");
  });

  it("throws a typed error when billing config is missing", async () => {
    await assert.rejects(
      () =>
        createStripeCheckoutSession({
          plan: "team",
        }),
      (error: unknown) =>
        error instanceof StripeBillingError &&
        error.message === "billing_not_configured" &&
        error.statusCode === 503,
    );
  });

  it("maps transport failures to stripe_unreachable", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.APP_BASE_URL = "https://whether.test";
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro";
    process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team";

    mock.method(globalThis, "fetch", async () => {
      throw new Error("network down");
    });

    await assert.rejects(
      () => createStripeCheckoutSession({ plan: "pro" }),
      (error: unknown) =>
        error instanceof StripeBillingError &&
        error.message === "stripe_unreachable" &&
        error.statusCode === 502,
    );
  });
});
