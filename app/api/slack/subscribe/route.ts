import { NextResponse } from "next/server";
import { isSlackWebhookUrl } from "../../../../lib/slack/deliverSlackBrief";
import { getSlackWebhookStore } from "../../../../lib/slack/slackWebhookStore";
import { RateLimitedError, rateLimitedResponse } from "../../../../lib/runtime/rateLimit";
import { fetchWithTimeout } from "../../../../lib/fetchWithTimeout";

export const runtime = "edge";

const SLACK_PING_TIMEOUT_MS = 5_000;

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

    // Ping Slack to verify the webhook is active and introduce the weekly cadence. Bounded,
    // because the reader is waiting on the form; an incoming webhook answers in well under a second.
    const pingResponse = await fetchWithTimeout(fetch, webhookUrl, {
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
                text: `This channel${channelName ? ` (${channelName})` : ""} is now connected to Whether. Expect the weekly brief every Monday, plus an alert if conditions change mid-week.\n\n*What each brief carries:*\n• This week's guidance and what changed\n• What to do now, with the pause and restart lines for each area\n• What would change the guidance\n\nTo stop delivery, delete this webhook in your Slack admin. Whether removes it automatically.`,
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
    }, SLACK_PING_TIMEOUT_MS);

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
