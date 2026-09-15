import { NextResponse } from "next/server";
import { subscribeAndSendVerification } from "../../../../lib/email/subscriptionFlow";
import { RateLimitedError, rateLimitedResponse } from "../../../../lib/runtime/rateLimit";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email required." }, { status: 400 });
    }

    // Only an explicit boolean counts. Anything else — absent, "true", 1 — leaves an
    // existing subscriber's choice alone rather than enrolling them in a second mail
    // stream on a value the caller did not mean as consent.
    const alerts = typeof body.alerts === "boolean" ? body.alerts : undefined;

    await subscribeAndSendVerification({ email, alerts, request });

    return NextResponse.json({ ok: true, message: "Check your email to confirm." });
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return rateLimitedResponse(error.retryAfterSeconds);
    }
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
