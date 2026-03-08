import { NextResponse } from "next/server";
import { z } from "zod";
import { createStripeCheckoutSession, StripeBillingError } from "../../../../lib/billingStripe";
import {
  PREMIUM_INTENT_SOURCES,
  dispatchPremiumFunnelEvent,
  type PremiumFunnelEvent,
} from "../../../../lib/premiumFunnel";

export const runtime = "edge";

const requestSchema = z.object({
  plan: z.enum(["pro", "team"]),
  source: z.enum(PREMIUM_INTENT_SOURCES),
  customerEmail: z.string().email().optional(),
  returnPath: z.string().trim().startsWith("/").max(120).optional(),
});

const buildCheckoutStartEvent = ({
  source,
  ctaId,
  path,
}: {
  source: (typeof PREMIUM_INTENT_SOURCES)[number];
  ctaId?: string;
  path: string;
}): PremiumFunnelEvent => ({
  type: "premium_checkout_start",
  source,
  path,
  ctaId,
  occurredAt: new Date().toISOString(),
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const { plan, customerEmail, returnPath, source } = parsed.data;
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

  try {
    const checkout = await createStripeCheckoutSession({
      plan,
      customerEmail,
      path: returnPath,
      source,
      idempotencyKey,
    });

    try {
      await dispatchPremiumFunnelEvent(
        buildCheckoutStartEvent({
          source,
          path: returnPath ?? "/pricing",
          ctaId: `checkout_${plan}`,
        }),
      );
    } catch {
      // Keep checkout non-blocking if telemetry forwarding fails.
    }

    return NextResponse.json(
      {
        ok: true,
        checkoutUrl: checkout.url,
        sessionId: checkout.id,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof StripeBillingError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json({ ok: false, error: "checkout_failed" }, { status: 500 });
  }
}
