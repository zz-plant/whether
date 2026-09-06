import { requestBodyText } from "./fixtures/requestTarget";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it, mock, spyOn } from "bun:test";
import {
  buildStripeCheckoutReturnUrl,
  CHECKOUT_RETURN_PATH,
  createStripeCheckoutSession,
  isStripeBillingReady,
  StripeBillingError,
} from "../lib/billingStripe";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mock.restore();
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

    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({ id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const checkout = await createStripeCheckoutSession({
      plan: "pro",
      path: "/pricing",
      source: "export_brief",
      planCandidate: "team",
      seatBand: "6-20",
      idempotencyKey: "idem-456",
    });

    assert.equal(checkout.id, "cs_test_123");
    assert.match(checkout.url, /checkout\.stripe\.com/);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    assert.equal((init.headers as Record<string, string>)["Idempotency-Key"], "idem-456");
    const params = new URLSearchParams(requestBodyText(init.body));
    assert.equal(params.get("metadata[source]"), "export_brief");
    assert.equal(params.get("metadata[planCandidate]"), "team");
    assert.equal(params.get("metadata[seatBand]"), "6-20");
  });


  it("builds safe checkout return urls while preserving existing query params", () => {
    assert.equal(
      buildStripeCheckoutReturnUrl({
        appBaseUrl: "https://whether.test",
        path: "/operate?source=hero",
        checkout: "success",
        plan: "pro",
      }),
      "https://whether.test/operate?source=hero&checkout=success&plan=pro",
    );

    assert.equal(
      buildStripeCheckoutReturnUrl({
        appBaseUrl: "https://whether.test",
        path: "//evil.example/path",
        checkout: "cancelled",
        plan: "team",
      }),
      `https://whether.test${CHECKOUT_RETURN_PATH}?checkout=cancelled&plan=team`,
    );
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

    spyOn(globalThis, "fetch").mockImplementation(async () => {
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

/** Static routes the app actually serves, read off the filesystem. */
const collectStaticRoutes = (dir = "app", prefix = ""): string[] => {
  const routes: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push(prefix === "" ? "/" : prefix);
      continue;
    }
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name === "api") continue;
    // Dynamic segments cannot be a fixed return path; route groups are invisible in the URL.
    if (entry.name.startsWith("[")) continue;
    const segment = entry.name.startsWith("(") ? prefix : `${prefix}/${entry.name}`;
    routes.push(...collectStaticRoutes(join(dir, entry.name), segment));
  }

  return routes;
};

describe("checkout return path", () => {
  it("names a route the app actually serves", () => {
    const routes = collectStaticRoutes();

    // The default was /pricing before that page existed, so every checkout that
    // did not pass an explicit returnPath sent the customer to a 404 on both
    // success and cancel. It was parked on /operate until the page shipped; this
    // assertion is what keeps the constant honest either way.
    assert.ok(
      routes.includes(CHECKOUT_RETURN_PATH),
      `${CHECKOUT_RETURN_PATH} is not a route; Stripe would return customers to a 404`,
    );
  });

  it("uses that path for both success and cancel", () => {
    const success = buildStripeCheckoutReturnUrl({
      appBaseUrl: "https://whether.work",
      path: CHECKOUT_RETURN_PATH,
      checkout: "success",
      plan: "pro",
    });
    const cancelled = buildStripeCheckoutReturnUrl({
      appBaseUrl: "https://whether.work",
      path: "//evil.example.com",
      checkout: "cancelled",
      plan: "team",
    });

    assert.equal(success, "https://whether.work/pricing?checkout=success&plan=pro");
    // A protocol-relative path falls back rather than becoming an offsite redirect.
    assert.equal(cancelled, "https://whether.work/pricing?checkout=cancelled&plan=team");
  });
});
