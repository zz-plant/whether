import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  buildSlackBriefBlocks,
  deliverSlackBrief,
  isSlackWebhookUrl,
  resolveConfiguredSlackWebhooks,
} from "../lib/slack/deliverSlackBrief";

const payload = { text: "Posture: Guarded\nAction: hold hiring", recordDate: "2026-08-17" };

const fetchStub = (status: number): typeof fetch =>
  (async () => new Response(status === 200 ? "ok" : "no_service", { status })) as typeof fetch;

describe("Slack brief delivery", () => {
  it("reports skipped_unconfigured when no webhook exists — never a fake post", async () => {
    const result = await deliverSlackBrief({ webhookUrls: [], payload });
    assert.equal(result.ok, true);
    assert.equal(result.status, "skipped_unconfigured");
    assert.equal(result.delivered, 0);
  });

  it("posts the full brief text and reports posted", async () => {
    let sentBody: string | undefined;
    const capture: typeof fetch = (async (_url: unknown, init?: RequestInit) => {
      sentBody = String(init?.body);
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const result = await deliverSlackBrief({
      webhookUrls: ["https://hooks.slack.com/services/T0/B0/x"],
      payload,
      fetchImpl: capture,
    });

    assert.equal(result.status, "posted");
    assert.equal(result.delivered, 1);
    assert.match(String(sentBody), /Posture: Guarded/);
    assert.match(String(sentBody), /2026-08-17/);
  });

  it("reports partial with an error when one of two webhooks fails", async () => {
    let call = 0;
    const flaky: typeof fetch = (async () => {
      call += 1;
      return new Response(call === 1 ? "ok" : "gone", { status: call === 1 ? 200 : 410 });
    }) as typeof fetch;

    const result = await deliverSlackBrief({
      webhookUrls: [
        "https://hooks.slack.com/services/T0/B0/a",
        "https://hooks.slack.com/services/T0/B0/b",
      ],
      payload,
      fetchImpl: flaky,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "partial");
    assert.equal(result.delivered, 1);
    assert.match(String(result.error), /1\/2/);
  });

  it("reports failed when every webhook rejects", async () => {
    const result = await deliverSlackBrief({
      webhookUrls: ["https://hooks.slack.com/services/T0/B0/a"],
      payload,
      fetchImpl: fetchStub(500),
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "failed");
  });

  it("only accepts hooks.slack.com URLs from the environment", () => {
    assert.equal(isSlackWebhookUrl("https://hooks.slack.com/services/T0/B0/x"), true);
    assert.equal(isSlackWebhookUrl("https://evil.example.com/hook"), false);

    const previous = process.env.SLACK_WEBHOOK_URL;
    process.env.SLACK_WEBHOOK_URL = "https://evil.example.com/hook";
    try {
      assert.deepEqual(resolveConfiguredSlackWebhooks(), []);
    } finally {
      if (previous === undefined) delete process.env.SLACK_WEBHOOK_URL;
      else process.env.SLACK_WEBHOOK_URL = previous;
    }
  });

  it("truncates past Slack's section limit instead of failing", () => {
    const blocks = buildSlackBriefBlocks("x".repeat(4000), "2026-08-17");
    const section = blocks[1] as { text: { text: string } };
    assert.ok(section.text.text.length <= 3000);
    assert.match(section.text.text, /truncated/);
  });
});
