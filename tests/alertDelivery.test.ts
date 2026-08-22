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

/** Enroll an address in email alerts the way the API allows: a self-asserted clientId. */
const enrollForAlerts = async (clientId: string) => {
  await getAlertPreferenceRepository().upsert(clientId, { slack: false, email: true, webhook: false });
  // listAlertSubscribers finds candidates by scanning KV keys, so the record has to exist
  // there too — the repository lookup alone would never be reached.
  await (globalThis as { WHETHER_DURABLE_KV?: KvNamespace }).WHETHER_DURABLE_KV!.put(
    `alert-pref:${clientId}`,
    JSON.stringify({ slack: false, email: true, webhook: false }),
  );
};

const subscribeVerified = async (email: string) => {
  const subscriber = await store.subscribe(email);
  await store.verifyEmail(subscriber.token);
  return subscriber;
};

beforeEach(() => {
  (globalThis as { WHETHER_DURABLE_KV?: KvNamespace }).WHETHER_DURABLE_KV = new FakeKv();
  store = resetSubscriberStore();
  resetAlertPreferenceRepository();
});

afterEach(() => {
  delete (globalThis as { WHETHER_DURABLE_KV?: KvNamespace }).WHETHER_DURABLE_KV;
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
