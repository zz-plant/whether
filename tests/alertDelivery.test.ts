import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { deliverAlerts, deliverAlertToSubscriber } from "../lib/alert/alertDelivery";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";
import type { EmailDeliveryAdapter } from "../lib/email/emailDelivery";
import type { AlertDecision } from "../lib/alert/alertEvaluator";
import type { KvNamespace } from "../lib/runtime/kv";

/**
 * Alert mail is enrolled through the email subscription, not through a per-device record.
 *
 * It used to be the other way round: the alerts panel POSTed a preference keyed on a
 * random client UUID from localStorage, and delivery resolved each record through
 * `getSubscriberByToken` — which only ever accepts a token that reached the subscriber's
 * own inbox. No surface could write a record under a token, so the enrollment path these
 * tests described was unreachable from the product and every real record was skipped.
 */

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

const CONDITIONS = {
  regime: "VOLATILE",
  tightness: 60,
  riskAppetite: 40,
  posture: "Hold irreversible moves until conditions resolve.",
  recordDate: "2026-08-22",
};

let store: SubscriberStore;
let kv: FakeKv;

/** The product path: subscribe with the alerts box ticked, then confirm the address. */
const subscribeVerified = async (email: string, options?: { alerts?: boolean }) => {
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

describe("deliverAlerts", () => {
  it("delivers to a verified subscriber who opted in", async () => {
    await subscribeVerified("operator@example.com", { alerts: true });

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.alerts.length, 1, "a first run with no prior state is a regime change");
    assert.equal(result.sent, 1);
    assert.equal(result.errors, 0);
  });

  // The weekly brief and the alert stream are separate consents. Someone who asked for
  // Monday mail has not asked to be interrupted when the regime moves.
  it("sends nothing to a verified subscriber who did not opt in", async () => {
    await subscribeVerified("weekly-only@example.com");

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.alerts.length, 1, "the alert still fires; only the delivery is withheld");
    assert.equal(result.sent, 0);
    assert.equal(result.errors, 0);
  });

  it("sends nothing to a subscriber who has not confirmed the address", async () => {
    await store.subscribe("pending@example.com", { alerts: true });

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.sent, 0);
  });

  it("sends nothing to a subscriber who unsubscribed", async () => {
    const subscriber = await subscribeVerified("former@example.com", { alerts: true });
    await store.unsubscribe(subscriber.token);

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.sent, 0);
  });

  it("sends one copy per inbox per alert type", async () => {
    await subscribeVerified("reader@example.com", { alerts: true });

    const first = await deliverAlerts(CONDITIONS);
    const second = await deliverAlerts({ ...CONDITIONS, regime: "SCARCITY" });

    assert.equal(first.sent, 1);
    assert.equal(second.sent, 0, "the delivered marker is keyed on the address");
    assert.equal(second.skipped, 1, "withheld, not counted as a send failure");
  });

  // A subscriber record written before the field existed reads as opted out, so the
  // migration enrolls nobody who did not ask.
  it("treats a record with no alerts field as opted out", async () => {
    const subscriber = await subscribeVerified("legacy@example.com");
    const stored = JSON.parse((await kv.get(`email:sub:${subscriber.email}`)) ?? "{}");
    delete stored.alerts;
    await kv.put(`email:sub:${subscriber.email}`, JSON.stringify(stored));

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.sent, 0);
  });
});

/** Annotated, not asserted, so the fixture is checked against the real decision shape. */
const REGIME_CHANGE: AlertDecision = {
  type: "regime_change",
  severity: "critical",
  headline: "RECONSIDER OPERATING POSTURE",
};

/**
 * Collects what was sent. An array rather than a nullable capture variable so the
 * assertions need no cast to read it back: TypeScript narrows a `let x = null` assigned
 * only inside a closure to `null`, and the usual escape is an assertion this repo counts.
 */
const recordingAdapter = () => {
  const sends: Array<{ html: string; text: string }> = [];
  const adapter: EmailDeliveryAdapter = {
    send: async ({ html, text }) => {
      sends.push({ html, text });
      return { ok: true };
    },
  };
  return { adapter, sends };
};

describe("alert mail", () => {
  it("carries a one-click unsubscribe link", async () => {
    const { adapter, sends } = recordingAdapter();

    const ok = await deliverAlertToSubscriber(
      "operator@example.com",
      REGIME_CHANGE,
      CONDITIONS,
      adapter,
      "token-123",
    );

    assert.equal(ok, true);
    assert.equal(sends.length, 1, "the adapter was called");
    assert.match(sends[0].html, /\/api\/email\/unsubscribe\?token=token-123/);
    assert.match(sends[0].text, /\/api\/email\/unsubscribe\?token=token-123/);
  });

  it("omits the link rather than sending a broken one when there is no token", async () => {
    const { adapter, sends } = recordingAdapter();

    await deliverAlertToSubscriber(
      "operator@example.com",
      REGIME_CHANGE,
      CONDITIONS,
      adapter,
      null,
    );

    assert.equal(sends.length, 1);
    assert.doesNotMatch(sends[0].html, /unsubscribe/i);
    assert.doesNotMatch(sends[0].text, /unsubscribe/i);
  });
});
