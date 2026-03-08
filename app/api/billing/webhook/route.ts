import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  dispatchPremiumFunnelEvent,
  isPremiumIntentSource,
  isPremiumPlanCandidate,
  isPremiumSeatBand,
} from "../../../../lib/premiumFunnel";

const parseStripeSignature = (header: string | null) => {
  if (!header) {
    return null;
  }

  const parts = header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signaturePart = parts.find((part) => part.startsWith("v1="));

  if (!timestampPart || !signaturePart) {
    return null;
  }

  const timestamp = timestampPart.slice(2);
  const signature = signaturePart.slice(3);
  if (!timestamp || !signature) {
    return null;
  }

  return { timestamp, signature };
};

const isStripeSignatureValid = ({
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

  const signedPayload = `${parsedSignature.timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret).update(signedPayload).digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(parsedSignature.signature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
};

type StripeCheckoutCompletedEvent = {
  type: "checkout.session.completed";
  data: {
    object: {
      id?: string;
      metadata?: {
        source?: string;
        planCandidate?: string;
        seatBand?: string;
      };
    };
  };
};

const isCheckoutCompletedEvent = (payload: unknown): payload is StripeCheckoutCompletedEvent => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const event = payload as Record<string, unknown>;
  if (event.type !== "checkout.session.completed") {
    return false;
  }

  const data = event.data;
  if (!data || typeof data !== "object") {
    return false;
  }

  const object = (data as Record<string, unknown>).object;
  return Boolean(object && typeof object === "object");
};

export async function POST(request: Request) {
  const payload = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!isStripeSignatureValid({ payload, header: signatureHeader, secret: webhookSecret })) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isCheckoutCompletedEvent(parsedPayload)) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const checkout = parsedPayload.data.object;
  const metadata = checkout.metadata;
  const source = metadata?.source;

  if (!source || !isPremiumIntentSource(source)) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const planCandidate = metadata?.planCandidate;
  const seatBand = metadata?.seatBand;

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
  } catch {
    // Keep Stripe webhook processing non-blocking if telemetry forwarding fails.
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
