import { NextResponse } from "next/server";
import { subscribeAndSendVerification } from "../../../lib/email/subscriptionFlow";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    await subscribeAndSendVerification({ email, request });
    return NextResponse.json({ subscribed: true, ok: true, message: "Check your email to confirm." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
