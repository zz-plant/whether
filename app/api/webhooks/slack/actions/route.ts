import { NextRequest, NextResponse } from "next/server";
import { requireSlackSignature } from "../../../../../lib/api/slackSignature";
import { getDecisionMemoryRepository } from "../../../../../lib/storage/decisionMemoryRepository";

export const runtime = "edge";

interface SlackActionPayload {
  type: string;
  user: {
    id: string;
    username: string;
    name?: string;
  };
  actions: Array<{
    action_id: string;
    value?: string;
    text?: { text: string };
  }>;
  response_url?: string;
}

/* Slack posts interactive actions as `application/x-www-form-urlencoded` with the
   JSON under a `payload` field; the JSON shape is kept for direct callers. Both are
   parsed from the text the signature was checked against, not from a second read. */
const parseSlackActionPayload = (rawBody: string, contentType: string): SlackActionPayload | null => {
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const rawPayload = new URLSearchParams(rawBody).get("payload");
    return rawPayload ? JSON.parse(rawPayload) : null;
  }
  if (contentType.includes("application/json")) {
    return JSON.parse(rawBody);
  }
  return null;
};

/* Slack response URLs live at https://hooks.slack.com/actions/… and nowhere else. The
   signature check already proves the payload came from Slack; this also covers a leaked
   signing secret, so a forged payload cannot point the confirmation POST at a host of
   its choosing. The warning names the origin only — a path can carry a credential, and
   this one was chosen by whoever sent the payload. */
const SLACK_RESPONSE_URL_ORIGIN = "https://hooks.slack.com";

const slackResponseUrl = (candidate: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    console.warn("[slack-actions] ignoring response_url: not a URL");
    return null;
  }
  if (parsed.origin !== SLACK_RESPONSE_URL_ORIGIN) {
    console.warn(`[slack-actions] ignoring response_url outside ${SLACK_RESPONSE_URL_ORIGIN}: ${parsed.origin}`);
    return null;
  }
  return parsed.href;
};

export async function POST(request: NextRequest) {
  try {
    /* The signature covers the bytes on the wire, so the body is read as text once,
       before anything parses it — `request.formData()` would consume the stream. */
    const rawBody = await request.text();
    const denied = await requireSlackSignature(request, rawBody);
    if (denied) {
      return denied;
    }

    const contentType = request.headers.get("content-type") || "";
    const payload = parseSlackActionPayload(rawBody, contentType);

    if (!payload || !payload.actions || payload.actions.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const action = payload.actions[0];
    const actionId = action.action_id;
    const decisionId = action.value;

    // Handle decision audit actions
    if (actionId === "acknowledge_decision" || actionId === "revisit_decision" || actionId === "archive_decision") {
      if (decisionId) {
        const repo = getDecisionMemoryRepository();
        const clientId = payload.user?.id || "slack_user";
        await repo.list({ clientId, limit: 50 }).catch(() => ({ entries: [], nextCursor: null }));
      }

      // If Slack provided response_url, send an ephemeral in-channel confirmation
      const responseUrl = payload.response_url ? slackResponseUrl(payload.response_url) : null;
      if (responseUrl) {
        const statusText =
          actionId === "acknowledge_decision"
            ? "✅ Status acknowledged by"
            : actionId === "revisit_decision"
              ? "🔄 Queued for team review by"
              : "📦 Archived by";

        await fetch(responseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            response_type: "ephemeral",
            text: `${statusText} @${payload.user.username || payload.user.name || "operator"}.`,
          }),
        }).catch(() => {});
      }

      return NextResponse.json({ ok: true, action: actionId, decisionId }, { status: 200 });
    }

    return NextResponse.json({ ok: true, action: actionId }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 },
    );
  }
}
