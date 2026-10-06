import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";

import { fanOut, type DeliveryOutcome } from "../lib/delivery/fanOut";
import { slackAlertBlocks, slackChannel } from "../lib/delivery/slack";
import { runMonthEndPulse } from "../lib/alert/monthEndPulse";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import type { KvNamespace } from "../lib/runtime/kv";
import { getSlackWebhookStore, resetSlackWebhookStore } from "../lib/slack/slackWebhookStore";
import { siteUrl } from "../lib/siteUrl";

/*
 * The shared delivery layer every channel sends through.
 *
 * Three Slack senders resolved targets and posted on their own; two posted with
 * no timeout, and the month-end pulse never retired a webhook Slack had
 * revoked. Five tallies counted the same outcomes in five shapes. These pin the
 * one poster and the one tally they share now.
 */

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

  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix ?? "";
    return {
      keys: [...this.entries.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    };
  }
}

const respondWith = (status: number): typeof fetch => async () => new Response(status === 200 ? "ok" : "no", { status });

afterEach(() => {
  globalThis.fetch = originalFetch;
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  resetSlackWebhookStore();
});

describe("fanOut", () => {
  it("counts each target as sent, retired, failed or skipped", async () => {
    const outcomes: Record<string, DeliveryOutcome> = { a: "sent", b: "gone", c: "failed" };
    const retired: string[] = [];

    const tally = await fanOut(["a", "b", "c", "d"], async (target) => {
      if (target === "d") throw new Error("a throwing send is a failed send, not a crashed step");
      return outcomes[target] ?? "failed";
    }, {
      retire: async (target) => {
        retired.push(target);
      },
    });

    assert.deepEqual(tally, { sent: 1, retired: 1, failed: 2, skipped: 0 });
    assert.deepEqual(retired, ["b"], "only a gone target is retired, and the retirement is awaited");
  });

  it("counts a gone target as failed when nothing can retire it", async () => {
    const tally = await fanOut(["a"], async () => "gone");
    assert.deepEqual(tally, { sent: 0, retired: 0, failed: 1, skipped: 0 });
  });

  it("skips a target the period's markers already hold, and marks only the ones sent", async () => {
    const marked = new Set(["already"]);
    const sentTo: string[] = [];
    const markers = {
      wasSent: async (key: string) => marked.has(key),
      markSent: async (key: string) => {
        marked.add(key);
      },
    };

    const tally = await fanOut(["already", "fresh", "broken"], async (target) => {
      sentTo.push(target);
      return target === "broken" ? "failed" : "sent";
    }, { once: { markers, keyOf: (target) => target } });

    assert.deepEqual(tally, { sent: 1, retired: 0, failed: 1, skipped: 1 });
    assert.deepEqual(sentTo.sort(), ["broken", "fresh"]);
    assert.ok(marked.has("fresh"));
    assert.equal(marked.has("broken"), false, "a failed send stays unmarked, so a retry reaches it");
  });

  it("sends one at a time when asked", async () => {
    let inFlight = 0;
    let peak = 0;
    await fanOut([1, 2, 3], async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return "sent";
    }, { sequential: true });
    assert.equal(peak, 1);
  });
});

describe("the Slack channel", () => {
  const url = "https://hooks.slack.com/services/T0/B0/x";
  const message = { blocks: slackAlertBlocks("Header", "Body") };

  it("reads Slack's answer as sent, gone or failed", async () => {
    assert.equal(await slackChannel.post(url, message, { fetchImpl: respondWith(200) }), "sent");
    assert.equal(await slackChannel.post(url, message, { fetchImpl: respondWith(404) }), "gone");
    assert.equal(await slackChannel.post(url, message, { fetchImpl: respondWith(410) }), "gone");
    assert.equal(await slackChannel.post(url, message, { fetchImpl: respondWith(500) }), "failed");
    const throwing: typeof fetch = async () => {
      throw new Error("connection reset");
    };
    assert.equal(await slackChannel.post(url, message, { fetchImpl: throwing }), "failed");
  });

  /* The alert and pulse posts had no bound: an edge that accepted the
     connection and never answered held the cron step to its 60s deadline. */
  it("gives up on a post that never answers", async () => {
    const hanging: typeof fetch = () => new Promise<Response>(() => undefined);
    const started = Date.now();
    const outcome = await slackChannel.post(url, message, { fetchImpl: hanging, timeoutMs: 20 });
    assert.equal(outcome, "failed");
    assert.ok(Date.now() - started < 1_000, "the bound, not the test runner, ended the post");
  });

  it("posts JSON with the alert block shape every alert and pulse uses", async () => {
    /* An array rather than a nullable `let`: TypeScript narrows a variable
       assigned only inside a closure to its initial `null`. */
    const posts: Array<{ body: string; contentType: string | null }> = [];
    const capture: typeof fetch = async (_input, init) => {
      posts.push({
        body: typeof init?.body === "string" ? init.body : "",
        contentType: new Headers(init?.headers).get("content-type"),
      });
      return new Response("ok", { status: 200 });
    };

    await slackChannel.post(url, message, { fetchImpl: capture });

    const [post] = posts;
    assert.ok(post, "the poster called fetch");
    const { body, contentType } = post;
    assert.equal(contentType, "application/json");
    assert.deepEqual(JSON.parse(body), {
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Header" } },
        { type: "section", text: { type: "mrkdwn", text: "Body" } },
        {
          type: "actions",
          elements: [{ type: "button", text: { type: "plain_text", text: "View brief" }, url: siteUrl, action_id: "open_brief" }],
        },
      ],
    });
  });
});

describe("the month-end pulse on Slack", () => {
  /* The one Slack sender that kept posting to a deleted webhook every month. */
  it("retires a webhook Slack has revoked, like every other Slack post", async () => {
    Object.assign(globalThis, { WHETHER_DURABLE_KV: new FakeKv() });
    resetSlackWebhookStore();
    const store = getSlackWebhookStore();
    await store.subscribe("https://hooks.slack.com/services/T0/B0/revoked-pulse");

    /* Far above the last bundled month-end's rates, so the month reads as changed. */
    const snapshot = buildOperatingSnapshot({
      treasury: {
        source: "US Treasury",
        record_date: "2099-12-31",
        fetched_at: "2099-12-31T09:00:00Z",
        isLive: true,
        yields: { oneMonth: 9.5, threeMonth: 9.4, twoYear: 8.9, tenYear: 7.2 },
      },
      macroSeries: [],
      now: new Date("2099-12-31T13:00:00.000Z"),
    });

    globalThis.fetch = respondWith(410);

    const result = await runMonthEndPulse({ snapshot, weeklyCall: snapshot.weeklyCall });

    assert.equal(result.ok, true);
    assert.equal(result.changed, true, "precondition: the month must differ for the pulse to post at all");
    assert.equal(result.postedSlack, 0);
    const active = await store.listActiveWebhooks();
    assert.equal(active.includes("https://hooks.slack.com/services/T0/B0/revoked-pulse"), false);
  });
});
