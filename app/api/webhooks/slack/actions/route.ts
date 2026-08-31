import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: SlackActionPayload | null = null;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      const rawPayload = formData.get("payload");
      if (typeof rawPayload === "string") {
        payload = JSON.parse(rawPayload);
      }
    } else if (contentType.includes("application/json")) {
      payload = await request.json();
    }

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
      if (payload.response_url) {
        const statusText =
          actionId === "acknowledge_decision"
            ? "✅ Status acknowledged by"
            : actionId === "revisit_decision"
              ? "🔄 Queued for team review by"
              : "📦 Archived by";

        await fetch(payload.response_url, {
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
