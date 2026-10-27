import assert from "node:assert/strict";
import { afterEach, describe, it, beforeEach } from "bun:test";
import { sha256Hex } from "../lib/crypto";
import type { KvNamespace } from "../lib/runtime/kv";
import { getSlackWebhookStore, resetSlackWebhookStore } from "../lib/slack/slackWebhookStore";

const mapKv = (entries: Map<string, string>): KvNamespace => ({
  get: async (key) => entries.get(key) ?? null,
  put: async (key, value) => {
    entries.set(key, value);
  },
  delete: async (key) => {
    entries.delete(key);
  },
  list: async (options) => ({
    keys: [...entries.keys()].filter((name) => name.startsWith(options?.prefix ?? "")).map((name) => ({ name })),
    list_complete: true,
  }),
});

describe("SlackWebhookStore", () => {
  beforeEach(() => {
    resetSlackWebhookStore();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    resetSlackWebhookStore();
  });

  it("subscribes and lists active Slack webhooks", async () => {
    const store = getSlackWebhookStore();
    const sub = await store.subscribe("https://hooks.slack.com/services/T1/B1/token1", {
      channelName: "#leadership",
    });

    assert.equal(sub.active, true);
    assert.equal(sub.channelName, "#leadership");
    assert.equal("token" in sub, false, "no reader ever saw the token, so none is minted");

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
    await store.subscribe("https://hooks.slack.com/services/T1/B1/reuse", {
      channelName: "#old",
    });
    await store.deactivateByUrl("https://hooks.slack.com/services/T1/B1/reuse");

    const second = await store.subscribe("https://hooks.slack.com/services/T1/B1/reuse", {
      channelName: "#new-leadership",
    });

    assert.equal(second.active, true);
    assert.equal(second.channelName, "#new-leadership");
    const active = await store.listActiveWebhooks();
    assert.deepEqual(active, ["https://hooks.slack.com/services/T1/B1/reuse"]);
  });

  /* Records written before 2026-10-27 carry the token the deleted unsubscribe route
     looked up. They must still deliver, and still drop when Slack retires the hook. */
  it("still reads a stored subscription that carries a legacy token", async () => {
    const url = "https://hooks.slack.com/services/T1/B1/legacy";
    const key = await sha256Hex(url);
    const entries = new Map<string, string>([
      [`slack:sub:${key}`, JSON.stringify({
        webhookUrl: url,
        channelName: "#exec",
        token: "0b8f7c1e-legacy-token",
        active: true,
        subscribedAt: "2026-09-18T00:00:00.000Z",
      })],
      [`slack:token:0b8f7c1e-legacy-token`, key],
      [`slack:active:${key}`, key],
    ]);
    Reflect.set(globalThis, "WHETHER_DURABLE_KV", mapKv(entries));
    const store = resetSlackWebhookStore();

    assert.equal(store.backendStatus(), "durable");
    assert.deepEqual(await store.listActiveWebhooks(), [url]);
    assert.equal((await store.getSubscriptionByUrl(url))?.channelName, "#exec");

    await store.subscribe(url, { channelName: "#leadership" });
    const rewritten: unknown = JSON.parse(entries.get(`slack:sub:${key}`) ?? "null");
    assert.equal(typeof rewritten === "object" && rewritten !== null && "token" in rewritten, false);

    assert.equal(await store.deactivateByUrl(url), true);
    assert.deepEqual(await store.listActiveWebhooks(), []);
  });

  it("writes no token index for a new subscription", async () => {
    const entries = new Map<string, string>();
    Reflect.set(globalThis, "WHETHER_DURABLE_KV", mapKv(entries));
    await resetSlackWebhookStore().subscribe("https://hooks.slack.com/services/T1/B1/fresh");

    assert.deepEqual([...entries.keys()].filter((name) => name.startsWith("slack:token:")), []);
  });
});
