import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { POST } from "../app/api/webhooks/slack/actions/route";
import { NextRequest } from "next/server";

describe("Interactive Slack Action Webhook Handler", () => {
  it("rejects missing actions payload", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/slack/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const body: { error: string } = await res.json();
    assert.equal(body.error, "invalid_payload");
  });

  it("handles acknowledge_decision action", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/slack/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "block_actions",
        user: { id: "U123", username: "sarah" },
        actions: [
          {
            action_id: "acknowledge_decision",
            value: "dm_12345",
          },
        ],
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const body: { ok: boolean; action: string; decisionId: string } = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.action, "acknowledge_decision");
    assert.equal(body.decisionId, "dm_12345");
  });

  it("handles revisit_decision action", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/slack/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "block_actions",
        user: { id: "U456", username: "marcus" },
        actions: [
          {
            action_id: "revisit_decision",
            value: "dm_67890",
          },
        ],
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const body: { ok: boolean; action: string; decisionId: string } = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.action, "revisit_decision");
  });
});
