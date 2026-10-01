import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";
import { getActiveSubscriptions } from "../lib/email/emailDelivery";
import { describeConfirmation, describeSubscription, subscribeAndSendVerification } from "../lib/email/subscriptionFlow";
import type { KvNamespace } from "../lib/runtime/kv";
import type { PlanLines } from "../lib/alert/planLines";

const HIRING_LINES: PlanLines = {
  area: "hiring",
  pause: [{ metric: "tightness", operator: ">", value: 72 }],
  resume: [{ metric: "tightness", operator: "<", value: 60 }],
};

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
  await store.verifyEmail(subscriber.confirmToken ?? "");
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
    await subscribeVerified("reader@example.com", { alerts: true, weekly: false });

    await store.subscribe("reader@example.com", { alerts: true });
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, false);

    const held = await store.subscribe("reader@example.com", { alerts: true, weekly: true });
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, false, "held until the address confirms");

    await store.verifyEmail(held.confirmToken ?? "");
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
    const back = await store.subscribe("reader@example.com");
    assert.deepEqual(await getActiveSubscriptions(), [], "re-enrolling a reader who left waits for the inbox");

    await store.verifyEmail(back.confirmToken ?? "");
    const confirmed = await store.getSubscriberByEmail("reader@example.com");
    assert.equal(confirmed?.active, true);
    // Unsubscribing dropped the change held before it, so coming back restores the record as it stood.
    assert.equal(confirmed?.weekly, true);
    assert.equal(confirmed?.alerts, false);
    assert.equal(confirmed?.pendingFlags, undefined);
  });

  it("retires an older request's link when a newer request arrives", async () => {
    await subscribeVerified("reader@example.com");
    const off = await store.subscribe("reader@example.com", { weekly: false });
    const on = await store.subscribe("reader@example.com", { weekly: true });

    assert.equal(on.confirmToken, undefined, "asking for what the address already has needs no link");
    assert.equal(await store.verifyEmail(off.confirmToken ?? ""), null, "the newer request retired the older link");
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, true);
  });
});

/*
 * The confirmation link used to be the subscriber's permanent token, which the
 * footer of every Monday brief and alert carries for unsubscribing. Anyone holding
 * one forwarded email could request a change for its reader and confirm it.
 */
describe("who can confirm a change", () => {
  it("does not accept the token from an email footer as confirmation", async () => {
    const reader = await subscribeVerified("reader@example.com");
    const request = await store.subscribe("reader@example.com", { weekly: false });

    assert.notEqual(request.confirmToken, reader.token);
    assert.equal(await store.getPendingConfirmation(reader.token), null);
    assert.equal(await store.verifyEmail(reader.token), null);
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, true);

    assert.ok(await store.verifyEmail(request.confirmToken ?? ""), "the link sent for the request still works");
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, false);
  });

  it("does not let a footer token re-enroll a reader who left", async () => {
    const reader = await subscribeVerified("reader@example.com");
    await store.unsubscribe(reader.token);
    await store.subscribe("reader@example.com");

    assert.equal(await store.verifyEmail(reader.token), null);
    assert.deepEqual(await getActiveSubscriptions(), []);
  });

  it("uses a link once", async () => {
    const reader = await store.subscribe("reader@example.com");
    assert.ok(await store.verifyEmail(reader.confirmToken ?? ""));
    assert.equal(await store.verifyEmail(reader.confirmToken ?? ""), null);
  });

  it("stops honouring a link after a week", async () => {
    await subscribeVerified("reader@example.com");
    const request = await store.subscribe("reader@example.com", { weekly: false });
    const stored: unknown = JSON.parse(kv.entries.get("email:sub:reader@example.com") ?? "{}");
    assert.ok(typeof stored === "object" && stored !== null);
    kv.entries.set("email:sub:reader@example.com", JSON.stringify({ ...stored, confirmRequestedAt: "2026-01-01T00:00:00.000Z" }));

    assert.equal(await store.verifyEmail(request.confirmToken ?? ""), null);
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, true);
  });

  it("holds a second request for an address that never confirmed, instead of changing what the first asked for", async () => {
    const owner = await store.subscribe("reader@example.com", { alerts: true });
    const stranger = await store.subscribe("reader@example.com", { alerts: false, weekly: false });

    const record = await store.getSubscriberByEmail("reader@example.com");
    assert.equal(record?.alerts, true);
    assert.equal(record?.weekly, true);
    assert.equal(await store.verifyEmail(owner.confirmToken ?? ""), null, "the stranger's request retired the first link");

    // The second email describes what it would do, so confirming it is the reader's choice.
    assert.ok(await store.verifyEmail(stranger.confirmToken ?? ""));
    const confirmed = await store.getSubscriberByEmail("reader@example.com");
    assert.equal(confirmed?.alerts, false);
    assert.equal(confirmed?.weekly, false);
  });

  it("still confirms a record mailed its permanent token before confirmation links existed, until it has confirmed", async () => {
    kv.entries.set(
      "email:sub:early@example.com",
      JSON.stringify({ email: "early@example.com", token: "t-early", verified: false, active: true, subscribedAt: "2026-09-30T00:00:00Z", weekly: true }),
    );
    kv.entries.set("email:token:t-early", "early@example.com");

    assert.ok(await store.verifyEmail("t-early"));
    assert.equal(await store.verifyEmail("t-early"), null, "once confirmed, the footer token confirms nothing");
  });
});

describe("what a confirmation says", () => {
  it("names a change to the Monday brief even when the request also sets plan lines", async () => {
    await subscribeVerified("reader@example.com");
    const request = await store.subscribe("reader@example.com", { weekly: false, planLines: [HIRING_LINES] });
    const confirmation = describeConfirmation(request);
    assert.equal(confirmation?.kind, "change");
    assert.match(confirmation?.text ?? "", /stop the Whether weekly brief/);
    assert.match(confirmation?.text ?? "", /lines set for hiring/);
  });

  it("says a change is a change, so the reader can tell it from signing up", async () => {
    await subscribeVerified("reader@example.com", { alerts: true });
    const request = await store.subscribe("reader@example.com", { alerts: false });
    assert.deepEqual(describeConfirmation(request), {
      kind: "change",
      text: "stop the email when conditions change between Mondays",
    });
  });

  it("sends no link when a confirmed address asks for what it already has", async () => {
    await subscribeVerified("reader@example.com");
    const sent: Array<{ subject: string; text: string; html: string }> = [];
    const { verifyUrl } = await subscribeAndSendVerification({
      email: "reader@example.com",
      adapter: { send: async (message) => (sent.push(message), { ok: true }) },
    });
    assert.equal(verifyUrl, null);
    assert.match(sent[0]?.text ?? "", /nothing has changed and there is nothing to confirm/);
    assert.doesNotMatch(sent[0]?.html ?? "", /api\/email\/verify/);
  });

  it("mails the request's own link, never the footer token", async () => {
    const reader = await subscribeVerified("reader@example.com");
    const sent: Array<{ text: string }> = [];
    const { subscriber } = await subscribeAndSendVerification({
      email: "reader@example.com",
      weekly: false,
      adapter: { send: async (message) => (sent.push(message), { ok: true }) },
    });
    assert.match(sent[0]?.text ?? "", /^Someone asked to stop the Whether weekly brief\./);
    assert.ok(sent[0]?.text.includes(`token=${subscriber.confirmToken}`));
    assert.ok(!sent[0]?.text.includes(reader.token));
  });
});

describe("describing a subscription", () => {
  it("confirms what the record holds rather than always promising a weekly brief", () => {
    assert.match(describeSubscription({ alerts: true, weekly: false }), /no weekly brief/);
    assert.match(describeSubscription({ alerts: true, weekly: true }), /weekly brief, plus an email/);
    assert.doesNotMatch(describeSubscription({ alerts: false, weekly: true }), /conditions change/);
  });
});
