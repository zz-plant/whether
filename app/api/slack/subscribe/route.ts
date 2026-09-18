import { NextResponse } from "next/server";
import { isSlackWebhookUrl } from "../../../../lib/slack/deliverSlackBrief";
import { getSlackWebhookStore } from "../../../../lib/slack/slackWebhookStore";
import { RateLimitedError, rateLimitedResponse } from "../../../../lib/runtime/rateLimit";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : "";
    const channelName = typeof body.channelName === "string" ? body.channelName.trim() : undefined;

    if (!webhookUrl || !isSlackWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        { ok: false, error: "Valid Slack webhook URL required (must begin with https://hooks.slack.com/)." },
        { status: 400 },
      );
    }

    // Ping Slack to verify the webhook is active and introduce the weekly cadence
    const pingResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Whether Weekly Brief connected",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "Whether Weekly Brief Connected" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `This channel${channelName ? ` (${channelName})` : ""} is now connected to Whether. Your team will receive the weekly operating brief every Monday morning.\n\n*What to expect:*\n• Current macro posture & decision delta\n• Bounded start, stop, and fence rules\n• Reversal thresholds that flip the call`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "Visit <https://whether.work|whether.work> for full formulas and evidence.",
              },
            ],
          },
        ],
      }),
    });

    if (!pingResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Slack rejected the webhook verification (HTTP ${pingResponse.status}). Please verify the webhook URL.`,
        },
        { status: 400 },
      );
    }

    const store = getSlackWebhookStore();
    const subscription = await store.subscribe(webhookUrl, { channelName });

    return NextResponse.json({
      ok: true,
      message: `Connected successfully${channelName ? ` to ${channelName}` : ""}. A test ping has been delivered.`,
      channelName: subscription.channelName,
      token: subscription.token,
    });
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return rateLimitedResponse(error.retryAfterSeconds);
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
