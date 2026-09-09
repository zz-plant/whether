import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntitlementByEmail, verifyEntitlementToken } from "../../../../lib/billing/entitlements";

export const runtime = "edge";

const requestSchema = z.object({ token: z.string().trim().min(1) });

/**
 * POST /api/billing/status — verify an entitlement token issued by
 * /api/billing/confirm. Re-checks the underlying record by email when present,
 * so a token survives past cancellation only as long as its signature TTL, not
 * past an actual subscription cancellation — the webhook flips status to
 * "cancelled" on customer.subscription.deleted and this closes that loop.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, active: false, error: "token_required" }, { status: 400 });
  }

  const verification = await verifyEntitlementToken(parsed.data.token);
  if (!verification.ok) {
    return NextResponse.json({ ok: true, active: false, reason: verification.reason });
  }

  const { payload } = verification;
  if (payload.email) {
    const record = await getEntitlementByEmail(payload.email);
    if (!record || record.status !== "active") {
      return NextResponse.json({ ok: true, active: false, reason: "cancelled" });
    }
  }

  return NextResponse.json({ ok: true, active: true, plan: payload.plan });
}
