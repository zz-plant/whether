import { NextResponse } from "next/server";
import { subscribeAndSendVerification } from "../../../../lib/email/subscriptionFlow";
import { RateLimitedError, rateLimitedResponse } from "../../../../lib/runtime/rateLimit";
import { parsePlanLines } from "../../../../lib/alert/planLines";
import { isRunwayBand } from "../../../../lib/report/operatorRunway";

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
    // Same rule for the Monday brief: only `false` makes an alerts-only subscription.
    const weekly = typeof body.weekly === "boolean" ? body.weekly : undefined;

    // A plan's own lines, from /operate. Refused whole rather than trimmed: a line
    // dropped in silence is one the reader believes is watched and is not.
    const planLines = body.planLines === undefined ? undefined : parsePlanLines(body.planLines);
    if (planLines === null) {
      return NextResponse.json(
        { ok: false, error: "Plan lines need, for each area, one or two pause and resume conditions between 0 and 100." },
        { status: 400 },
      );
    }

    // The reader's runway band, sent with plan lines so a crossing email can say
    // what the crossing means at it. One of four bands or nothing: never a figure.
    const runwayBand = isRunwayBand(body.runwayBand) ? body.runwayBand : undefined;

    await subscribeAndSendVerification({ email, alerts, weekly, planLines, runwayBand, request });

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
