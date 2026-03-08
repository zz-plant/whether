import { NextResponse } from "next/server";
import {
  dispatchPremiumFunnelEvent,
  isPremiumIntentSource,
  isPremiumPlanCandidate,
  isPremiumSeatBand,
} from "../../../../lib/premiumFunnel";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

export const runtime = "edge";

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
};

const createStripeSignature = async ({ payload, timestamp, secret }: { payload: string; timestamp: number; secret: string }) => {
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  return toHex(new Uint8Array(signature));
};

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

  return parsedSignature.signatures.some((signature) => constantTimeEqual(expectedSignature, signature));
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

  if (!(await isStripeSignatureValid({ payload, header: signatureHeader, secret: webhookSecret }))) {
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
