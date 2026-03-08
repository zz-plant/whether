import { NextResponse } from "next/server";
import { z } from "zod";
import { createStripeCheckoutSession, StripeBillingError } from "../../../../lib/billingStripe";
import {
  PREMIUM_INTENT_SOURCES,
  dispatchPremiumFunnelEvent,
  type PremiumFunnelEvent,
  type PremiumPlanCandidate,
  type PremiumSeatBand,
} from "../../../../lib/premiumFunnel";

export const runtime = "edge";

const requestSchema = z.object({
  plan: z.enum(["pro", "team"]),
  source: z.enum(PREMIUM_INTENT_SOURCES),
  customerEmail: z.string().email().optional(),
  returnPath: z.string().trim().startsWith("/").max(120).optional(),
  planCandidate: z.enum(["pro", "team"]).optional(),
  seatBand: z.enum(["1", "2-5", "6-20", "21+"]).optional(),
});

const buildCheckoutStartEvent = ({
  source,
  ctaId,
  path,
  planCandidate,
  seatBand,
}: {
  source: (typeof PREMIUM_INTENT_SOURCES)[number];
  ctaId?: string;
  path: string;
  planCandidate?: PremiumPlanCandidate;
  seatBand?: PremiumSeatBand;
}): PremiumFunnelEvent => ({
  type: "premium_checkout_start",
  source,
  path,
  ctaId,
  planCandidate,
  seatBand,
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

  const { plan, customerEmail, returnPath, source, planCandidate, seatBand } = parsed.data;
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

  try {
    const checkout = await createStripeCheckoutSession({
      plan,
      customerEmail,
      path: returnPath,
      source,
      planCandidate,
      seatBand,
      idempotencyKey,
    });

    try {
      await dispatchPremiumFunnelEvent(
        buildCheckoutStartEvent({
          source,
          path: returnPath ?? "/pricing",
          ctaId: `checkout_${plan}`,
          planCandidate,
          seatBand,
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
