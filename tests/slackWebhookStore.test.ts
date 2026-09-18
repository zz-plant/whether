import assert from "node:assert/strict";
import { describe, it, beforeEach } from "bun:test";
import { getSlackWebhookStore, resetSlackWebhookStore } from "../lib/slack/slackWebhookStore";

describe("SlackWebhookStore", () => {
  beforeEach(() => {
    resetSlackWebhookStore();
  });

  it("subscribes and lists active Slack webhooks", async () => {
    const store = getSlackWebhookStore();
    const sub = await store.subscribe("https://hooks.slack.com/services/T1/B1/token1", {
      channelName: "#leadership",
    });

    assert.equal(sub.active, true);
    assert.equal(sub.channelName, "#leadership");
    assert.ok(sub.token);

    const active = await store.listActiveWebhooks();
    assert.deepEqual(active, ["https://hooks.slack.com/services/T1/B1/token1"]);
  });

  it("rejects non-Slack URLs for SSRF safety", async () => {
    const store = getSlackWebhookStore();
    await assert.rejects(
      async () => {
        await store.subscribe("https://attacker.example.com/webhook");
      },
      /Invalid Slack webhook URL/,
    );
  });

  it("unsubscribes by token", async () => {
    const store = getSlackWebhookStore();
    const sub = await store.subscribe("https://hooks.slack.com/services/T1/B1/token2");

    const unsubResult = await store.unsubscribe(sub.token);
    assert.equal(unsubResult, true);

    const active = await store.listActiveWebhooks();
    assert.equal(active.includes("https://hooks.slack.com/services/T1/B1/token2"), false);
  });

  it("deactivates by URL when Slack returns 404 or 410", async () => {
    const store = getSlackWebhookStore();
    await store.subscribe("https://hooks.slack.com/services/T1/B1/dead-hook");

    let active = await store.listActiveWebhooks();
    assert.equal(active.includes("https://hooks.slack.com/services/T1/B1/dead-hook"), true);

    await store.deactivateByUrl("https://hooks.slack.com/services/T1/B1/dead-hook");
    active = await store.listActiveWebhooks();
    assert.equal(active.includes("https://hooks.slack.com/services/T1/B1/dead-hook"), false);
  });

  it("updates existing subscription on re-subscribe", async () => {
    const store = getSlackWebhookStore();
    const first = await store.subscribe("https://hooks.slack.com/services/T1/B1/reuse", {
      channelName: "#old",
    });
    await store.unsubscribe(first.token);

    const second = await store.subscribe("https://hooks.slack.com/services/T1/B1/reuse", {
      channelName: "#new-leadership",
    });

    assert.equal(second.active, true);
    assert.equal(second.channelName, "#new-leadership");
    const active = await store.listActiveWebhooks();
    assert.deepEqual(active, ["https://hooks.slack.com/services/T1/B1/reuse"]);
  });
});
