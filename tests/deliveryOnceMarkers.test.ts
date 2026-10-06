import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";

import { POST as postSendWeekly } from "../app/api/email/send-weekly/route";
import { POST as postSlackDeliver } from "../app/api/brief/slack/deliver/route";
import { sendWeeklyBrief } from "../lib/email/sendWeeklyBrief";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import type { KvNamespace } from "../lib/runtime/kv";
import { deliverSlackBrief } from "../lib/slack/deliverSlackBrief";
import { forceRequested } from "../lib/delivery/onceFor";
import { getSlackWebhookStore, resetSlackWebhookStore } from "../lib/slack/slackWebhookStore";
import { snapshotData } from "../lib/snapshot";

/*
 * Once a week per recipient, for the two weekly sends.
 *
 * The alert mail had per-inbox markers, the month-end pulse a month key, the
 * regime check its last-known state — and the weekly email and the weekly
 * Slack post had nothing, so a manual POST after the Monday cron sent every
 * subscriber and every channel the same brief again. Markers are per
 * recipient, written after that recipient's send succeeds, so a run that
 * failed part-way can be re-run and reaches only the ones it missed. The manual
 * routes take `?force=1` to send again on purpose; the cron never does.
 */

const originalFetch = globalThis.fetch;
const MONDAY = new Date("2026-08-31T14:00:00.000Z");
const LATER_THAT_WEEK = new Date("2026-09-03T09:00:00.000Z");
const NEXT_MONDAY = new Date("2026-09-07T14:00:00.000Z");

class FakeKv implements KvNamespace {
  readonly entries = new Map<string, string>();

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

const liveSnapshot = (recordDate: string, now: Date) =>
  buildOperatingSnapshot({
    treasury: { ...snapshotData, isLive: true, record_date: recordDate, fetched_at: `${recordDate}T12:00:00.000Z` },
    macroSeries,
    now,
  });

const withKv = () => {
  const kv = new FakeKv();
  Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });
  return kv;
};

const subscribeVerified = async (...emails: string[]) => {
  const store = resetSubscriberStore();
  for (const email of emails) {
    const subscriber = await store.subscribe(email);
    await getSubscriberStore().verifyEmail(subscriber.confirmToken ?? "");
  }
};

/** A live EMAIL binding that records each recipient, failing the ones named. */
const mailBinding = (failFor: Set<string> = new Set()) => {
  const mailed: string[] = [];
  Reflect.set(globalThis, "EMAIL", {
    send: async (message: { to: string }) => {
      if (failFor.has(message.to)) throw new Error("mailbox unavailable");
      mailed.push(message.to);
    },
  });
  return mailed;
};

const cronRequest = (path: string) =>
  new Request(`https://whether.test${path}`, { method: "POST", headers: { authorization: "Bearer test-cron-secret" } });

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ["WHETHER_DURABLE_KV", "EMAIL", "WHETHER_CRON_SECRET"]) Reflect.deleteProperty(globalThis, key);
  resetSubscriberStore();
  resetSlackWebhookStore();
  resetOperatingSnapshotStore();
});

describe("the weekly email, once a week", () => {
  it("does not mail a subscriber the same week's brief twice", async () => {
    withKv();
    await subscribeVerified("reader@example.com");
    const mailed = mailBinding();
    const snapshot = liveSnapshot("2026-08-28", MONDAY);

    const first = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: MONDAY });
    const second = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: LATER_THAT_WEEK });

    assert.equal(first.sent, 1);
    assert.equal(first.skipped, undefined, "absent when nobody was skipped");
    assert.deepEqual(
      { ok: second.ok, sent: second.sent, skipped: second.skipped, total: second.total },
      { ok: true, sent: 0, skipped: 1, total: 1 },
    );
    assert.match(second.message ?? "", /already has this week's brief/);
    assert.deepEqual(mailed, ["reader@example.com"]);
  });

  it("re-sends on an explicit force, and sends again the next week", async () => {
    withKv();
    await subscribeVerified("reader@example.com");
    const mailed = mailBinding();
    const snapshot = liveSnapshot("2026-08-28", MONDAY);

    await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: MONDAY });
    const forced = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: LATER_THAT_WEEK, force: true });
    const nextWeek = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: NEXT_MONDAY });

    assert.equal(forced.sent, 1);
    assert.equal(nextWeek.sent, 1);
    assert.equal(mailed.length, 3);
  });

  it("reaches only the subscribers a part-failed run missed", async () => {
    withKv();
    await subscribeVerified("first@example.com", "second@example.com");
    const failing = new Set(["second@example.com"]);
    const mailed = mailBinding(failing);
    const snapshot = liveSnapshot("2026-08-28", MONDAY);

    const first = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: MONDAY });
    failing.clear();
    const retry = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: MONDAY });

    assert.deepEqual({ sent: first.sent, errors: first.errors }, { sent: 1, errors: 1 });
    assert.deepEqual({ sent: retry.sent, errors: retry.errors, skipped: retry.skipped }, { sent: 1, errors: 0, skipped: 1 });
    assert.deepEqual(mailed.sort(), ["first@example.com", "second@example.com"]);
  });

  it("records nothing for a stub send, which delivered nothing", async () => {
    const kv = withKv();
    await subscribeVerified("reader@example.com");
    const snapshot = liveSnapshot("2026-08-28", MONDAY);

    const result = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: MONDAY });

    assert.equal(result.deliveryMode, "stub");
    assert.equal([...kv.entries.keys()].some((key) => key.startsWith("delivery:once:")), false);
  });

  it("takes ?force=1 on the manual route, and only there", async () => {
    withKv();
    Object.assign(globalThis, { WHETHER_CRON_SECRET: "test-cron-secret" });
    await subscribeVerified("reader@example.com");
    const mailed = mailBinding();
    /* The route reads the stored snapshot against the real clock. */
    const today = new Date().toISOString().slice(0, 10);
    await resetOperatingSnapshotStore().write(liveSnapshot(today, new Date()));

    const first = await (await postSendWeekly(cronRequest("/api/email/send-weekly"))).json();
    const again = await (await postSendWeekly(cronRequest("/api/email/send-weekly"))).json();
    const forced = await (await postSendWeekly(cronRequest("/api/email/send-weekly?force=1"))).json();

    assert.equal(first.sent, 1);
    assert.deepEqual({ sent: again.sent, skipped: again.skipped }, { sent: 0, skipped: 1 });
    assert.equal(forced.sent, 1);
    assert.equal(mailed.length, 2);
  });
});

describe("the weekly Slack post, once a week", () => {
  const payload = { text: "Conditions: Cloudy", recordDate: "2026-08-28" };
  const webhookUrls = ["https://hooks.slack.com/services/T0/B0/a", "https://hooks.slack.com/services/T0/B0/b"];

  const recordingFetch = (failFor: Set<string> = new Set()) => {
    const posted: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (failFor.has(url)) return new Response("no", { status: 500 });
      posted.push(url);
      return new Response("ok", { status: 200 });
    };
    return { posted, fetchImpl };
  };

  it("does not post a channel the same week's brief twice", async () => {
    withKv();
    const { posted, fetchImpl } = recordingFetch();

    const first = await deliverSlackBrief({ webhookUrls, payload, fetchImpl, now: MONDAY });
    const second = await deliverSlackBrief({ webhookUrls, payload, fetchImpl, now: LATER_THAT_WEEK });

    assert.equal(first.status, "posted");
    assert.deepEqual(
      { ok: second.ok, status: second.status, attempted: second.attempted, delivered: second.delivered, skipped: second.skipped },
      { ok: true, status: "skipped_already_posted", attempted: 0, delivered: 0, skipped: 2 },
    );
    assert.equal(posted.length, 2);
  });

  it("reaches only the channels a part-failed run missed, and all of them on force", async () => {
    withKv();
    const failing = new Set([webhookUrls[1] ?? ""]);
    const { posted, fetchImpl } = recordingFetch(failing);

    const first = await deliverSlackBrief({ webhookUrls, payload, fetchImpl, now: MONDAY });
    failing.clear();
    const retry = await deliverSlackBrief({ webhookUrls, payload, fetchImpl, now: MONDAY });
    const forced = await deliverSlackBrief({ webhookUrls, payload, fetchImpl, now: MONDAY, force: true });

    assert.equal(first.status, "partial");
    assert.deepEqual(
      { status: retry.status, attempted: retry.attempted, delivered: retry.delivered, skipped: retry.skipped },
      { status: "posted", attempted: 1, delivered: 1, skipped: 1 },
    );
    assert.deepEqual({ status: forced.status, delivered: forced.delivered }, { status: "posted", delivered: 2 });
    assert.equal(posted.length, 1 + 1 + 2);
  });

  it("keeps webhook URLs, which are credentials, out of the marker keys", async () => {
    const kv = withKv();
    const { fetchImpl } = recordingFetch();

    await deliverSlackBrief({ webhookUrls, payload, fetchImpl, now: MONDAY });

    const markers = [...kv.entries.keys()].filter((key) => key.startsWith("delivery:once:"));
    assert.equal(markers.length, 2);
    for (const key of markers) {
      assert.match(key, /^delivery:once:weekly-slack:2026-w36:[0-9a-f]{64}$/);
    }
  });

  it("never lets force override readiness on the manual route", async () => {
    withKv();
    Object.assign(globalThis, { WHETHER_CRON_SECRET: "test-cron-secret" });
    resetSlackWebhookStore();
    await getSlackWebhookStore().subscribe("https://hooks.slack.com/services/T0/B0/route");
    /* The route builds from a report read, which offline is the bundled copy. */
    globalThis.fetch = async () => {
      throw new Error("offline");
    };

    const response = await postSlackDeliver(cronRequest("/api/brief/slack/deliver?force=1"));
    const body = await response.json();

    assert.equal(body.status, "refused_unpublishable", "force re-sends; it never overrides readiness");
  });
});

describe("forceRequested", () => {
  it("reads only an explicit ?force=1 or ?force=true", () => {
    const at = (query: string) => forceRequested(new Request(`https://whether.test/api/email/send-weekly${query}`, { method: "POST" }));
    assert.equal(at("?force=1"), true);
    assert.equal(at("?force=true"), true);
    assert.equal(at(""), false);
    assert.equal(at("?force=0"), false);
    assert.equal(at("?force=yes"), false);
  });
});
