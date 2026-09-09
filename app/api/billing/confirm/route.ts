import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntitlementBySessionId, issueEntitlementToken } from "../../../../lib/billing/entitlements";

export const runtime = "edge";

const requestSchema = z.object({ sessionId: z.string().trim().min(1) });

/**
 * POST /api/billing/confirm — exchange a Stripe checkout session id (present on
 * the success redirect as ?session_id=...) for a signed entitlement token, once
 * the webhook has had a chance to persist the record. Client-side polling: the
 * webhook and the redirect race, so a first "not_found" is expected and the
 * caller should retry briefly rather than treat it as a failure.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "session_id_required" }, { status: 400 });
  }

  const record = await getEntitlementBySessionId(parsed.data.sessionId);
  if (!record || record.status !== "active") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const token = await issueEntitlementToken(record);
  if (!token) {
    return NextResponse.json({ ok: false, error: "entitlements_not_configured" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, token, plan: record.plan });
}
