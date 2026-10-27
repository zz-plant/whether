import assert from "node:assert/strict";
import { describe, it, beforeEach } from "bun:test";
import { POST as subscribeHandler } from "../app/api/slack/subscribe/route";
import { resetSlackWebhookStore, getSlackWebhookStore } from "../lib/slack/slackWebhookStore";

describe("Slack subscribe API route", () => {
  beforeEach(() => {
    resetSlackWebhookStore();
  });

  it("rejects invalid non-Slack webhook URLs with 400", async () => {
    const request = new Request("http://localhost/api/slack/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl: "https://evil.com/hook" }),
    });

    const response = await subscribeHandler(request);
    assert.equal(response.status, 400);
    const body: { ok: boolean; error: string } = await response.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /Valid Slack webhook URL required/);
  });

  it("accepts valid Slack webhook, pings it, and registers subscription", async () => {
    let pingedUrl: string | undefined;
    let pingPayload: string | undefined;
    let pingSignal: unknown;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      pingedUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      /* The body is a JSON string here; stringify rather than String() so a
         non-string body can never read as "[object Object]". */
      pingPayload = typeof init?.body === "string" ? init.body : JSON.stringify(init?.body ?? null);
      pingSignal = init?.signal;
      return new Response("ok", { status: 200 });
    };

    try {
      const request = new Request("http://localhost/api/slack/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: "https://hooks.slack.com/services/T00/B00/test1",
          channelName: "#exec",
        }),
      });

      const response = await subscribeHandler(request);
      assert.equal(response.status, 200);
      const body: Record<string, unknown> = await response.json();
      assert.equal(body.ok, true);
      assert.equal(body.channelName, "#exec");
      // The off-ramp is deleting the webhook in Slack; there is no token to hand back.
      assert.equal("token" in body, false);

      assert.equal(pingedUrl, "https://hooks.slack.com/services/T00/B00/test1");
      assert.match(String(pingPayload), /Whether Weekly Brief Connected/);
      assert.ok(pingSignal instanceof AbortSignal, "the ping is bounded; the reader is waiting on the form");

      const store = getSlackWebhookStore();
      const active = await store.listActiveWebhooks();
      assert.deepEqual(active, ["https://hooks.slack.com/services/T00/B00/test1"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
