import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";
import { getActiveSubscriptions } from "../lib/email/emailDelivery";
import { describeSubscription } from "../lib/email/subscriptionFlow";
import type { KvNamespace } from "../lib/runtime/kv";

/**
 * The alerts-only subscription: "tell me when this changes" and nothing else.
 *
 * A reader who wants the one email that matters should not have to accept a weekly
 * one to get it. The Monday fan-out and the alert fan-out read the same records, so
 * the flag has to keep an alerts-only reader out of the first without dropping them
 * from the second — and every record written before the flag existed was a weekly
 * subscription, so absence has to read as yes.
 */

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

let store: SubscriberStore;
let kv: FakeKv;

const subscribeVerified = async (email: string, options?: { alerts?: boolean; weekly?: boolean }) => {
  const subscriber = await store.subscribe(email, options);
  await store.verifyEmail(subscriber.token);
  return subscriber;
};

beforeEach(() => {
  kv = new FakeKv();
  Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });
  store = resetSubscriberStore();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  resetSubscriberStore();
});

describe("alerts-only subscription", () => {
  it("gets alert mail and not the Monday brief", async () => {
    await subscribeVerified("alerts@example.com", { alerts: true, weekly: false });
    await subscribeVerified("weekly@example.com", { alerts: true });

    const weekly = (await getActiveSubscriptions()).map((recipient) => recipient.email);
    const alerts = (await store.listAlertSubscribers()).map((sub) => sub.email);

    assert.deepEqual(weekly, ["weekly@example.com"]);
    assert.deepEqual(alerts.sort(), ["alerts@example.com", "weekly@example.com"]);
  });

  it("reads a record written before the flag existed as a weekly subscriber", async () => {
    kv.entries.set(
      "email:sub:old@example.com",
      JSON.stringify({ email: "old@example.com", token: "t-old", verified: true, active: true, subscribedAt: "2026-08-01T00:00:00Z" }),
    );
    kv.entries.set("email:active:old@example.com", "old@example.com");

    const weekly = (await getActiveSubscriptions()).map((recipient) => recipient.email);
    assert.deepEqual(weekly, ["old@example.com"]);
  });

  it("leaves the choice alone when a form does not ask, and changes it when one does and the inbox confirms", async () => {
    const first = await subscribeVerified("reader@example.com", { alerts: true, weekly: false });

    await store.subscribe("reader@example.com", { alerts: true });
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, false);

    await store.subscribe("reader@example.com", { alerts: true, weekly: true });
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, false, "held until the address confirms");

    await store.verifyEmail(first.token);
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, true);
  });

  /* Before 2026-10-01 a request changed a confirmed record on arrival, and the
     endpoint takes any address: anyone could switch off someone's Monday brief
     or re-enroll a reader who had unsubscribed. */
  it("lets no request change a confirmed address until its inbox says yes", async () => {
    const first = await subscribeVerified("reader@example.com", { alerts: false });

    await store.subscribe("reader@example.com", { weekly: false, alerts: true });
    const held = await store.getSubscriberByEmail("reader@example.com");
    assert.equal(held?.weekly, true);
    assert.equal(held?.alerts, false);
    assert.deepEqual((await getActiveSubscriptions()).map((recipient) => recipient.email), ["reader@example.com"]);

    await store.unsubscribe(first.token);
    await store.subscribe("reader@example.com");
    assert.deepEqual(await getActiveSubscriptions(), [], "re-enrolling a reader who left waits for the inbox");

    await store.verifyEmail(first.token);
    const confirmed = await store.getSubscriberByEmail("reader@example.com");
    assert.equal(confirmed?.active, true);
    assert.equal(confirmed?.weekly, false);
    assert.equal(confirmed?.alerts, true);
    assert.equal(confirmed?.pendingFlags, undefined);
  });

  it("lets the latest request win over an earlier one still waiting", async () => {
    const first = await subscribeVerified("reader@example.com");
    await store.subscribe("reader@example.com", { weekly: false });
    await store.subscribe("reader@example.com", { weekly: true });
    await store.verifyEmail(first.token);
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, true);
  });

  it("confirms what the record holds rather than always promising a weekly brief", () => {
    assert.match(describeSubscription({ alerts: true, weekly: false }), /no weekly brief/);
    assert.match(describeSubscription({ alerts: true, weekly: true }), /weekly brief, plus an email/);
    assert.doesNotMatch(describeSubscription({ alerts: false, weekly: true }), /conditions change/);
  });
});
