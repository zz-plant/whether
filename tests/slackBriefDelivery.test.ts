import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  buildSlackBriefBlocks,
  deliverSlackBrief,
  isSlackWebhookUrl,
  resolveConfiguredSlackWebhooks,
} from "../lib/slack/deliverSlackBrief";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";

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
      sentBody = typeof init?.body === "string" ? init.body : undefined;
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

  it("delivers to webhooks registered in SlackWebhookStore", async () => {
    const { getSlackWebhookStore, resetSlackWebhookStore } = await import("../lib/slack/slackWebhookStore");
    resetSlackWebhookStore();
    const store = getSlackWebhookStore();
    await store.subscribe("https://hooks.slack.com/services/T0/B0/store-test");

    const deliveredUrls: string[] = [];
    const capture: typeof fetch = (async (input: unknown) => {
      deliveredUrls.push(String(input));
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const result = await deliverSlackBrief({
      payload,
      fetchImpl: capture,
    });

    assert.equal(result.ok, true);
    assert.equal(result.status, "posted");
    assert.equal(deliveredUrls.includes("https://hooks.slack.com/services/T0/B0/store-test"), true);
  });

  it("auto-deactivates revoked (410) webhooks on delivery failure", async () => {
    const { getSlackWebhookStore, resetSlackWebhookStore } = await import("../lib/slack/slackWebhookStore");
    resetSlackWebhookStore();
    const store = getSlackWebhookStore();
    await store.subscribe("https://hooks.slack.com/services/T0/B0/revoked-hook");

    const goneFetch: typeof fetch = async () => new Response("gone", { status: 410 });

    const result = await deliverSlackBrief({
      payload,
      fetchImpl: goneFetch,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "failed");

    // Webhook should be deactivated
    const active = await store.listActiveWebhooks();
    assert.equal(active.includes("https://hooks.slack.com/services/T0/B0/revoked-hook"), false);
  });

  it("builds the brief from the given operating snapshot instead of a second report read", async () => {
    const snapshot = buildOperatingSnapshot({
      /* `snapshotData` is the bundled fallback (isLive: false), which the
         publish guard rightly refuses. Flip it to a live reading so the test
         is about the read path, not about fallback policy. */
      treasury: {
        ...snapshotData,
        isLive: true,
        fallback_at: undefined,
        fallback_reason: undefined,
        record_date: "2099-12-31",
        fetched_at: "2099-12-31T12:00:00.000Z",
      },
      macroSeries,
      now: new Date("2099-12-31T13:00:00.000Z"),
    });

    /* Any outbound read would blow up the test, which is the point: with a
       snapshot in hand the deliverer must not reassemble the report. */
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("snapshot path must not read the report");
    };

    try {
      let sentBody = "";
      const capture: typeof fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
        sentBody = typeof init?.body === "string" ? init.body : "";
        return new Response("ok", { status: 200 });
      };

      const result = await deliverSlackBrief({
        webhookUrls: ["https://hooks.slack.com/services/T0/B0/x"],
        snapshot,
        now: new Date("2099-12-31T13:00:00.000Z"),
        fetchImpl: capture,
      });

      assert.equal(result.status, "posted");
      assert.equal(result.delivered, 1);
      assert.match(sentBody, /Whether Weekly Brief — 2099-12-31/);
      assert.match(sentBody, /Conditions:/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
