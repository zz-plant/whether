import { NextResponse } from "next/server";
import { getSlackWebhookStore } from "../../../../lib/slack/slackWebhookStore";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token required." }, { status: 400 });
    }

    const store = getSlackWebhookStore();
    const success = await store.unsubscribe(token);

    if (!success) {
      return NextResponse.json({ ok: false, error: "Subscription not found or already inactive." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "Slack webhook unsubscribed successfully." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
