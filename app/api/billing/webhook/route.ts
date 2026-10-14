import { NextResponse } from "next/server";
import {
  dispatchPremiumFunnelEvent,
  isPremiumIntentSource,
  isPremiumPlanCandidate,
  isPremiumSeatBand,
} from "../../../../lib/premiumFunnel";
import { cancelEntitlementByCustomerId, saveEntitlement } from "../../../../lib/billing/entitlements";
import { checkoutCompletionMarkers } from "../../../../lib/storage/premiumFunnelEventRepository";
import { constantTimeCompare } from "../../../../lib/constantTimeCompare";
import { hmacSha256, toHex } from "../../../../lib/crypto";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

export const runtime = "edge";

const createStripeSignature = async ({ payload, timestamp, secret }: { payload: string; timestamp: number; secret: string }) =>
  toHex(await hmacSha256(secret, `${timestamp}.${payload}`));

const parseStripeSignature = (header: string | null) => {
  if (!header) {
    return null;
  }

  const parts = header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts.filter((part) => part.startsWith("v1="));

  if (!timestampPart || signatureParts.length === 0) {
    return null;
  }

  const timestamp = Number.parseInt(timestampPart.slice(2), 10);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const signatures = signatureParts
    .map((part) => part.slice(3))
    .filter((signature) => signature.length > 0);

  if (signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
};

const isStripeSignatureValid = async ({
  payload,
  header,
  secret,
}: {
  payload: string;
  header: string | null;
  secret: string | undefined;
}) => {
  if (!secret) {
    return false;
  }

  const parsedSignature = parseStripeSignature(header);
  if (!parsedSignature) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (nowInSeconds - parsedSignature.timestamp > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expectedSignature = await createStripeSignature({
    payload,
    timestamp: parsedSignature.timestamp,
    secret,
  });

  return parsedSignature.signatures.some((signature) => constantTimeCompare(signature, expectedSignature));
};

type StripeCheckoutCompletedEvent = {
  type: "checkout.session.completed";
  data: {
    object: {
      id?: string;
      customer?: string;
      customer_details?: { email?: string };
      metadata?: {
        plan?: string;
        source?: string;
        planCandidate?: string;
        seatBand?: string;
      };
    };
  };
};

type StripeSubscriptionDeletedEvent = {
  type: "customer.subscription.deleted";
  data: { object: { customer?: string } };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/* Both handled events are recognized by type and by carrying an object at `data.object`; the
   fields read off that object are each checked where they are used. */
const hasEventObject = (payload: unknown, type: string): boolean =>
  isRecord(payload) && payload.type === type && isRecord(payload.data) && isRecord(payload.data.object);

const isSubscriptionDeletedEvent = (payload: unknown): payload is StripeSubscriptionDeletedEvent =>
  hasEventObject(payload, "customer.subscription.deleted");

const isCheckoutCompletedEvent = (payload: unknown): payload is StripeCheckoutCompletedEvent =>
  hasEventObject(payload, "checkout.session.completed");

export async function POST(request: Request) {
  const payload = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!(await isStripeSignatureValid({ payload, header: signatureHeader, secret: webhookSecret }))) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (isSubscriptionDeletedEvent(parsedPayload)) {
    const customerId = parsedPayload.data.object.customer;
    if (customerId) {
      await cancelEntitlementByCustomerId(customerId);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!isCheckoutCompletedEvent(parsedPayload)) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const checkout = parsedPayload.data.object;
  const metadata = checkout.metadata;
  const source = metadata?.source;

  /* Persistence is the point of this webhook. It happens before (and
     independently of) funnel telemetry, and a persistence failure returns 500
     so Stripe retries — a paid customer with no stored entitlement is the
     exact bug this endpoint previously guaranteed. */
  const plan = metadata?.plan;
  if (checkout.id && (plan === "pro" || plan === "team")) {
    try {
      await saveEntitlement({
        plan,
        sessionId: checkout.id,
        customerEmail: checkout.customer_details?.email,
        stripeCustomerId: checkout.customer,
        seatBand: metadata?.seatBand,
        status: "active",
        activatedAt: new Date().toISOString(),
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  }

  if (!source || !isPremiumIntentSource(source)) {
    /* Unknown/missing telemetry source still leaves ignored:true — that field
       describes premium-funnel attribution, which is separate from whether an
       entitlement was persisted above. */
    return NextResponse.json(
      { ok: true, ignored: true, entitlementStored: Boolean(checkout.id && plan) },
      { status: 200 },
    );
  }

  const planCandidate = metadata?.planCandidate;
  const seatBand = metadata?.seatBand;
  /* One purchase, one completion: a redelivery of a session already recorded sends nothing. */
  const completions = checkoutCompletionMarkers();

  if (checkout.id && (await completions.wasSent(checkout.id))) {
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  try {
    await dispatchPremiumFunnelEvent({
      type: "premium_checkout_complete",
      source,
      path: "/billing/webhook",
      ctaId: checkout.id,
      planCandidate: planCandidate && isPremiumPlanCandidate(planCandidate) ? planCandidate : undefined,
      seatBand: seatBand && isPremiumSeatBand(seatBand) ? seatBand : undefined,
      occurredAt: new Date().toISOString(),
    });
    if (checkout.id) await completions.markSent(checkout.id);
  } catch {
    // Keep Stripe webhook processing non-blocking if telemetry forwarding fails.
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
