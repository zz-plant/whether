import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { POST } from "../app/api/webhooks/slack/actions/route";
import { NextRequest } from "next/server";
import { slackSignatureHeaders } from "./fixtures/slackSignature";

/* Payload handling only. The route verifies Slack's signature first, so every
   request here is signed with a secret the test sets itself — a stray
   SLACK_SIGNING_SECRET in a shell must not decide whether these pass. The
   signature cases themselves live in tests/slackActionsSignature.test.ts. */
const SECRET = "slack-signing-secret-for-payload-tests";
const ORIGINAL_SECRET = process.env.SLACK_SIGNING_SECRET;

const signedPost = (body: string) =>
  POST(
    new NextRequest("http://localhost/api/webhooks/slack/actions", {
      method: "POST",
      headers: { "content-type": "application/json", ...slackSignatureHeaders(body, SECRET) },
      body,
    }),
  );

beforeEach(() => {
  process.env.SLACK_SIGNING_SECRET = SECRET;
  Reflect.deleteProperty(globalThis, "SLACK_SIGNING_SECRET");
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.SLACK_SIGNING_SECRET;
  } else {
    process.env.SLACK_SIGNING_SECRET = ORIGINAL_SECRET;
  }
});

describe("Interactive Slack Action Webhook Handler", () => {
  it("rejects missing actions payload", async () => {
    const res = await signedPost(JSON.stringify({}));
    assert.equal(res.status, 400);
    const body: { error: string } = await res.json();
    assert.equal(body.error, "invalid_payload");
  });

  it("handles acknowledge_decision action", async () => {
    const res = await signedPost(
      JSON.stringify({
        type: "block_actions",
        user: { id: "U123", username: "sarah" },
        actions: [
          {
            action_id: "acknowledge_decision",
            value: "dm_12345",
          },
        ],
      }),
    );

    assert.equal(res.status, 200);
    const body: { ok: boolean; action: string; decisionId: string } = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.action, "acknowledge_decision");
    assert.equal(body.decisionId, "dm_12345");
  });

  it("handles revisit_decision action", async () => {
    const res = await signedPost(
      JSON.stringify({
        type: "block_actions",
        user: { id: "U456", username: "marcus" },
        actions: [
          {
            action_id: "revisit_decision",
            value: "dm_67890",
          },
        ],
      }),
    );

    assert.equal(res.status, 200);
    const body: { ok: boolean; action: string; decisionId: string } = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.action, "revisit_decision");
  });
});
