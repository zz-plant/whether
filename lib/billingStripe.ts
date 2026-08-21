import { z } from "zod";
import type { PremiumPlanCandidate, PremiumSeatBand } from "./premiumFunnel";

export type PremiumPlan = "pro" | "team";

const stripeCheckoutResponseSchema = z.object({
  id: z.string(),
  url: z.string().url(),
});

const stripeErrorResponseSchema = z.object({
  error: z.object({
    message: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
  }).passthrough(),
}).passthrough();

const normalizeBaseUrl = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
};

const getStripePriceId = (plan: PremiumPlan): string | undefined => {
  if (plan === "pro") {
    return process.env.STRIPE_PRICE_PRO_MONTHLY;
  }
  return process.env.STRIPE_PRICE_TEAM_MONTHLY;
};

export const getStripeBillingConfig = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appBaseUrl = normalizeBaseUrl(process.env.APP_BASE_URL);

  return {
    secretKey,
    appBaseUrl,
    priceIds: {
      pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
      team: process.env.STRIPE_PRICE_TEAM_MONTHLY,
    },
  };
};

export const isStripeBillingReady = () => {
  const config = getStripeBillingConfig();
  return Boolean(config.secretKey && config.appBaseUrl && config.priceIds.pro && config.priceIds.team);
};


/**
 * Where Stripe sends the customer back. It defaulted to /pricing, which does not
 * exist -- no pricing surface has shipped (see docs/premium-launch-readiness.md),
 * so both success_url and cancel_url resolved to a 404 for any caller that did
 * not pass an explicit returnPath. Point this at /pricing on the day that page
 * lands; tests/billingStripe.test.ts fails if it names a route the app lacks.
 */
export const CHECKOUT_RETURN_PATH = "/operate";

export const buildStripeCheckoutReturnUrl = ({
  appBaseUrl,
  path,
  checkout,
  plan,
}: {
  appBaseUrl: string;
  path: string;
  checkout: "success" | "cancelled";
  plan: PremiumPlan;
}) => {
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : CHECKOUT_RETURN_PATH;
  const url = new URL(safePath, appBaseUrl);
  url.searchParams.set("checkout", checkout);
  url.searchParams.set("plan", plan);
  return url.toString();
};

export class StripeBillingError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "StripeBillingError";
    this.statusCode = statusCode;
  }
}

export const createStripeCheckoutSession = async ({
  plan,
  path = CHECKOUT_RETURN_PATH,
  customerEmail,
  source,
  planCandidate,
  seatBand,
  idempotencyKey,
}: {
  plan: PremiumPlan;
  path?: string;
  customerEmail?: string;
  source?: string;
  planCandidate?: PremiumPlanCandidate;
  seatBand?: PremiumSeatBand;
  idempotencyKey?: string;
}) => {
  const config = getStripeBillingConfig();
  if (!config.secretKey || !config.appBaseUrl) {
    throw new StripeBillingError("billing_not_configured", 503);
  }

  const priceId = getStripePriceId(plan);
  if (!priceId) {
    throw new StripeBillingError("missing_price_id", 503);
  }

  const successUrl = buildStripeCheckoutReturnUrl({ appBaseUrl: config.appBaseUrl, path, checkout: "success", plan });
  const cancelUrl = buildStripeCheckoutReturnUrl({ appBaseUrl: config.appBaseUrl, path, checkout: "cancelled", plan });

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("allow_promotion_codes", "true");
  params.set("metadata[plan]", plan);

  if (planCandidate) {
    params.set("metadata[planCandidate]", planCandidate);
  }

  if (seatBand) {
    params.set("metadata[seatBand]", seatBand);
  }

  if (source) {
    params.set("metadata[source]", source);
  }

  if (customerEmail) {
    params.set("customer_email", customerEmail);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.secretKey}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers,
      body: params,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new StripeBillingError("stripe_unreachable", 502);
  }

  const payload = await response.json();
  if (!response.ok) {
    const parsedError = stripeErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message ?? "stripe_checkout_failed"
      : "stripe_checkout_failed";
    throw new StripeBillingError(message, response.status);
  }

  const parsed = stripeCheckoutResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new StripeBillingError("invalid_stripe_response", 502);
  }

  return parsed.data;
};
