import { NextResponse } from "next/server";
import { dispatchPremiumFunnelEvent, isValidPremiumFunnelEvent } from "../../../../lib/premiumFunnel";
import { requireCronAuth } from "../../../../lib/api/cronAuth";
import { checkRateLimit, clientKeyFor, rateLimitedResponse } from "../../../../lib/runtime/rateLimit";
import {
  listPremiumFunnelEvents,
  summarizePremiumFunnelEvents,
} from "../../../../lib/storage/premiumFunnelEventRepository";

export const runtime = "edge";

/* A well-formed event is a few hundred bytes. Reject anything larger before parsing so a
   large body is never materialized, let alone persisted. Field-level caps live in
   isValidPremiumFunnelEvent; this is the outer bound for the whole request. */
const MAX_BODY_BYTES = 4096;

export async function POST(request: Request) {
  /* docs/premium-launch-readiness.md asked for this at the WAF layer before the counts are
     treated as decision-grade; the Workers binding is the in-code form of the same rule. */
  const limit = await checkRateLimit("WHETHER_PUBLIC_WRITE_RATE_LIMITER", clientKeyFor(request));
  if (!limit.allowed) {
    return rateLimitedResponse();
  }

  const declaredLength = Number.parseInt(request.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }

  let payload: unknown;

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isValidPremiumFunnelEvent(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  try {
    await dispatchPremiumFunnelEvent(payload);
  } catch {
    // Keep telemetry non-blocking for operator workflows.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}

/**
 * Reads back what POST captured. Shares the cron secret rather than introducing a second
 * admin credential — this is operator-only funnel data, not a public surface.
 *
 * `?events=1` returns the raw tail instead of the aggregate.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 1000) : 500;

  if (searchParams.get("events") === "1") {
    const { events, nextCursor } = await listPremiumFunnelEvents({
      limit,
      cursor: searchParams.get("cursor"),
    });
    return NextResponse.json({ ok: true, events, nextCursor });
  }

  const summary = await summarizePremiumFunnelEvents(limit);
  return NextResponse.json({ ok: true, summary });
}
