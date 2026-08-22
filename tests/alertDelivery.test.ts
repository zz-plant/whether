import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { deliverAlerts, resolveRecipientEmail } from "../lib/alert/alertDelivery";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";
import {
  getAlertPreferenceRepository,
  resetAlertPreferenceRepository,
} from "../lib/storage/alertPreferenceRepository";
import type { KvNamespace } from "../lib/runtime/kv";

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

/** Enroll an address in email alerts the way the API allows: a self-asserted clientId. */
const enrollForAlerts = async (clientId: string) => {
  await getAlertPreferenceRepository().upsert(clientId, { slack: false, email: true, webhook: false });
  // listAlertSubscribers finds candidates by scanning KV keys, so the record has to exist
  // there too — the repository lookup alone would never be reached.
  await kv.put(`alert-pref:${clientId}`, JSON.stringify({ slack: false, email: true, webhook: false }));
};

const subscribeVerified = async (email: string) => {
  const subscriber = await store.subscribe(email);
  await store.verifyEmail(subscriber.token);
  return subscriber;
};

beforeEach(() => {
  kv = new FakeKv();
  Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });
  store = resetSubscriberStore();
  resetAlertPreferenceRepository();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  resetSubscriberStore();
  resetAlertPreferenceRepository();
});

describe("resolveRecipientEmail", () => {
  it("resolves a verified, active subscriber by address", async () => {
    await subscribeVerified("operator@example.com");

    assert.equal(await resolveRecipientEmail("operator@example.com"), "operator@example.com");
    assert.equal(await resolveRecipientEmail("Operator@Example.COM"), "operator@example.com");
  });

  it("resolves a verified subscriber by token", async () => {
    const subscriber = await subscribeVerified("operator@example.com");

    assert.equal(await resolveRecipientEmail(subscriber.token), "operator@example.com");
  });

  // The clientId on an alert-pref record is self-asserted, so an address that merely looks
  // like an address is not evidence that its owner asked for mail.
  it("refuses an address with no subscriber record", async () => {
    assert.equal(await resolveRecipientEmail("stranger@example.com"), null);
  });

  it("refuses an address that has not completed verification", async () => {
    await store.subscribe("pending@example.com");

    assert.equal(await resolveRecipientEmail("pending@example.com"), null);
  });

  it("refuses an address that unsubscribed", async () => {
    const subscriber = await subscribeVerified("former@example.com");
    await store.unsubscribe(subscriber.token);

    assert.equal(await resolveRecipientEmail("former@example.com"), null);
  });
});

describe("deliverAlerts", () => {
  it("delivers to a verified subscriber", async () => {
    await subscribeVerified("operator@example.com");
    await enrollForAlerts("operator@example.com");

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.alerts.length, 1, "a first run with no prior state is a regime change");
    assert.equal(result.sent, 1);
    assert.equal(result.errors, 0);
  });

  // Two preference records can name one inbox: the address itself, and that subscriber's
  // token. Delivery keyed the "already sent" record on the clientId rather than on the
  // address it resolved to, so each record earned its own key and the subscriber got a
  // second copy — and since anyone can write a preference record for a known address, the
  // duplicate can be created deliberately.
  it("sends one copy when two preference records resolve to the same inbox", async () => {
    const subscriber = await subscribeVerified("reader@example.com");
    await enrollForAlerts("reader@example.com");
    await enrollForAlerts(subscriber.token);

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.sent, 1, "one inbox, one copy");
    assert.equal(result.skipped, 1, "the second record resolves to an address already sent to");
  });

  it("sends nothing when a preference record names an address that never consented", async () => {
    await enrollForAlerts("stranger@example.com");

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.alerts.length, 1, "the alert still fires; only the delivery is withheld");
    assert.equal(result.sent, 0, "no mail to an address with no verified subscription");
    assert.equal(result.skipped, 1, "withheld, not counted as a send failure");
    assert.equal(result.errors, 0);
  });

  it("sends nothing to a subscriber who has not verified yet", async () => {
    await store.subscribe("pending@example.com");
    await enrollForAlerts("pending@example.com");

    const result = await deliverAlerts(CONDITIONS);

    assert.equal(result.sent, 0);
    assert.equal(result.skipped, 1);
  });
});
