import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "bun:test";
import { POST as legacySubscribePost } from "../app/api/subscribe/route";
import { GET as syncGet, POST as syncPost } from "../app/api/sync/route";
import { POST as ingestPost } from "../app/api/ingest/route";
import { POST as emailSendWeeklyPost } from "../app/api/email/send-weekly/route";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";

const ORIGINAL_ENV = { ...process.env };

type KvListResult = { keys: Array<{ name: string }>; list_complete: boolean; cursor?: string };

const createMemoryKv = () => {
  const map = new Map<string, string>();
  return {
    map,
    async get(key: string) { return map.get(key) ?? null; },
    async put(key: string, value: string) { map.set(key, value); },
    async delete(key: string) { map.delete(key); },
    async list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult> {
      const prefix = options?.prefix ?? "";
      const keys = [...map.keys()].filter((key) => key.startsWith(prefix)).sort();
      return { keys: keys.map((name) => ({ name })), list_complete: true };
    },
  };
};

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetSubscriberStore();
  delete (globalThis as { WHETHER_DURABLE_KV?: unknown }).WHETHER_DURABLE_KV;
  delete (globalThis as { WHETHER_CRON_SECRET?: string }).WHETHER_CRON_SECRET;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetSubscriberStore();
  delete (globalThis as { WHETHER_DURABLE_KV?: unknown }).WHETHER_DURABLE_KV;
  delete (globalThis as { WHETHER_CRON_SECRET?: string }).WHETHER_CRON_SECRET;
  mock.restore();
});

describe("subscription and sync hardening", () => {
  it("legacy subscribe persists through the canonical store and sends verification", async () => {
    const sent: Array<{ to: string; text: string }> = [];
    (globalThis as { EMAIL?: { send: (message: { to: string; text: string }) => Promise<unknown> } }).EMAIL = {
      send: async (message) => {
        sent.push({ to: message.to, text: message.text });
        return {};
      },
    };

    const response = await legacySubscribePost(new Request("https://preview.whether.test/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "FOUNDER@EXAMPLE.COM" }),
    }));

    assert.equal(response.status, 200);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, "founder@example.com");
    assert.match(sent[0]?.text ?? "", /https:\/\/preview\.whether\.test\/api\/email\/verify\?token=/);
  });


  it("lists verified active subscribers from durable KV after an isolate reset", async () => {
    const kv = createMemoryKv();
    (globalThis as { WHETHER_DURABLE_KV?: unknown }).WHETHER_DURABLE_KV = kv;
    resetSubscriberStore();

    const firstStore = getSubscriberStore();
    const subscriber = await firstStore.subscribe("reader@example.com");
    assert.equal(await firstStore.verifyEmail(subscriber.token), true);

    resetSubscriberStore();
    (globalThis as { WHETHER_DURABLE_KV?: unknown }).WHETHER_DURABLE_KV = kv;
    const coldStore = getSubscriberStore();
    assert.deepEqual(await coldStore.getActiveSubscriptions(), ["reader@example.com"]);

    assert.equal(await coldStore.unsubscribe(subscriber.token), true);
    assert.deepEqual(await coldStore.getActiveSubscriptions(), []);
  });

  it("sync requires a secret and rejects invalid keys", async () => {
    (globalThis as { WHETHER_DURABLE_KV?: unknown }).WHETHER_DURABLE_KV = createMemoryKv();
    const now = Date.now();

    const missingSecret = await syncPost(new Request("https://whether.test/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "sync-a", key: "whether-company-metrics", value: { burn: 1 }, ts: now }),
    }));
    assert.equal(missingSecret.status, 401);

    const invalidKey = await syncPost(new Request("https://whether.test/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-sync-secret": "1234567890123456" },
      body: JSON.stringify({ id: "sync-a", key: "untrusted:key", value: true, ts: now }),
    }));
    assert.equal(invalidKey.status, 400);

    const created = await syncPost(new Request("https://whether.test/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-sync-secret": "1234567890123456" },
      body: JSON.stringify({ id: "sync-a", key: "whether-company-metrics", value: { burn: 1 }, ts: now }),
    }));
    assert.equal(created.status, 200);

    const wrongSecret = await syncGet(new Request("https://whether.test/api/sync?id=sync-a", {
      headers: { "x-whether-sync-secret": "abcdefghijklmnop" },
    }));
    assert.equal(wrongSecret.status, 401);

    const read = await syncGet(new Request("https://whether.test/api/sync?id=sync-a", {
      headers: { "x-whether-sync-secret": "1234567890123456" },
    }));
    assert.equal(read.status, 200);
    const body = await read.json() as { state: Record<string, { value: unknown; secretHash?: string }> };
    assert.deepEqual(body.state["whether-company-metrics"]?.value, { burn: 1 });
    assert.equal(body.state["whether-company-metrics"]?.secretHash, undefined);
  });
});

describe("cron endpoint auth", () => {
  it("fails closed when the cron secret is not configured", async () => {
    const ingestResponse = await ingestPost(new Request("https://whether.test/api/ingest", { method: "POST" }));
    assert.equal(ingestResponse.status, 503);

    const weeklyResponse = await emailSendWeeklyPost(new Request("https://whether.test/api/email/send-weekly", { method: "POST" }));
    assert.equal(weeklyResponse.status, 503);
  });

  it("rejects an incorrect configured cron bearer token before running work", async () => {
    (globalThis as { WHETHER_CRON_SECRET?: string }).WHETHER_CRON_SECRET = "secret-a";
    const response = await ingestPost(new Request("https://whether.test/api/ingest", {
      method: "POST",
      headers: { authorization: "Bearer wrong" },
    }));
    assert.equal(response.status, 401);
  });
});
