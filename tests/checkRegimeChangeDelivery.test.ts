import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";

import { checkRegimeChange } from "../lib/alert/checkRegimeChange";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import type { KvNamespace } from "../lib/runtime/kv";
import { snapshotData } from "../lib/snapshot";
import { getSlackWebhookStore, resetSlackWebhookStore } from "../lib/slack/slackWebhookStore";

const originalFetch = globalThis.fetch;

class FakeKv implements KvNamespace {
  private readonly entries = new Map<string, string>();

  async get(key: string) {
    return this.entries.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.entries.set(key, value);
  }

  async delete(key: string) {
    this.entries.delete(key);
  }

  async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
    const prefix = options?.prefix ?? "";
    const keys = [...this.entries.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
      .map((name) => ({ name }));
    return { keys, list_complete: true };
  }
}

const buildSnapshot = () =>
  buildOperatingSnapshot({
    treasury: { ...snapshotData, record_date: "2099-12-31", fetched_at: "2099-12-31T12:00:00.000Z" },
    macroSeries,
    now: new Date("2099-12-31T13:00:00.000Z"),
  });

describe("checkRegimeChange Slack delivery", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    resetSlackWebhookStore();
  });

  it("posts a regime change to webhooks the channels subscribed, not only the env one", async () => {
    const kv = new FakeKv();
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });

    const snapshot = buildSnapshot();
    const previous = snapshot.assessment.regime === "EXPANSION" ? "DEFENSIVE" : "EXPANSION";
    await kv.put("regime:last-known", previous);

    resetSlackWebhookStore();
    const store = getSlackWebhookStore();
    await store.subscribe("https://hooks.slack.com/services/T0/B0/subscribed");

    const posted: Array<{ url: string; body: string }> = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      posted.push({ url, body: typeof init?.body === "string" ? init.body : "" });
      return new Response("ok", { status: 200 });
    };

    const result = await checkRegimeChange({ snapshot });

    assert.equal(result.ok, true);
    assert.equal(result.changed, true);
    const urls = posted.map((entry) => entry.url);
    assert.ok(
      urls.includes("https://hooks.slack.com/services/T0/B0/subscribed"),
      "regime change must reach a webhook the channel subscribed",
    );
    assert.ok(
      posted.some((entry) => entry.body.includes("Conditions changed")),
      "the post must carry the conditions-changed alert",
    );
  });

  it("deactivates a subscribed webhook Slack has revoked (410)", async () => {
    const kv = new FakeKv();
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });

    const snapshot = buildSnapshot();
    const previous = snapshot.assessment.regime === "EXPANSION" ? "DEFENSIVE" : "EXPANSION";
    await kv.put("regime:last-known", previous);

    resetSlackWebhookStore();
    const store = getSlackWebhookStore();
    await store.subscribe("https://hooks.slack.com/services/T0/B0/revoked");

    globalThis.fetch = async () => new Response("gone", { status: 410 });

    await checkRegimeChange({ snapshot });

    /* The deactivation is awaited inside the poster now, so the store read
       here happens after the bookkeeping, not racing it. */
    const active = await store.listActiveWebhooks();
    assert.equal(active.includes("https://hooks.slack.com/services/T0/B0/revoked"), false);
  });

  /* The record basis (2026-10-09): the bundled reading is Sunny on the record's inputs and
     Stormy with its curated startup-market inputs counted, so a change from Stormy is the
     basis at work, and the alert says so rather than leave it read as the market. */
  it("says when the inputs left out would have kept the earlier conditions", async () => {
    const kv = new FakeKv();
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });

    const snapshot = buildSnapshot();
    assert.equal(snapshot.assessment.regime, "EXPANSION");
    await kv.put("regime:last-known", "VOLATILE");
    resetSlackWebhookStore();
    await getSlackWebhookStore().subscribe("https://hooks.slack.com/services/T0/B0/basis");
    const posted: string[] = [];
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      posted.push(typeof init?.body === "string" ? init.body : "");
      return new Response("ok", { status: 200 });
    };

    const result = await checkRegimeChange({ snapshot });
    const cause = "Startup-market inputs, which the guidance leaves out because the record cannot test them, would have kept conditions Stormy.";
    assert.ok(result.alerts?.[0]?.includes(cause), result.alerts?.[0]);
    assert.ok(posted.some((body) => body.includes(cause)), "the Slack post carries it");

    await kv.put("regime:last-known", "DEFENSIVE");
    const unrelated = await checkRegimeChange({ snapshot });
    assert.doesNotMatch(unrelated.alerts?.[0] ?? "", /leaves out/, "not when those inputs would not have held it");
  });

  it("does not post anywhere on a quiet run where the regime has not moved", async () => {
    const kv = new FakeKv();
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });

    const snapshot = buildSnapshot();
    await kv.put("regime:last-known", snapshot.assessment.regime);
    /* A recorded window wider than any narrowing keeps the flip-watch branch
       quiet too: with nothing recorded (`prevWeeks` null) it posts whenever the
       projection reads within two weeks. */
    await kv.put("regime:weeks-to-flip", "0");

    resetSlackWebhookStore();
    await getSlackWebhookStore().subscribe("https://hooks.slack.com/services/T0/B0/quiet");

    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("ok", { status: 200 });
    };

    const result = await checkRegimeChange({ snapshot });

    assert.equal(result.changed, false);
    assert.equal(calls, 0, "no regime move means no Slack post");
  });
});