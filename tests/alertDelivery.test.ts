import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { deliverAlerts, deliverAlertToSubscriber, runScheduledAlertDelivery } from "../lib/alert/alertDelivery";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";
import type { EmailDeliveryAdapter } from "../lib/email/emailDelivery";
import type { AlertDecision } from "../lib/alert/alertEvaluator";
import type { KvNamespace } from "../lib/runtime/kv";
import { resetRegimeAlertRepository } from "../lib/storage/regimeAlertRepository";
import { sha256Hex } from "../lib/crypto";

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
  actionNow: "Hold irreversible moves until conditions resolve.",
  callChangesIf: "Funding pressure rises 10 pts from 60 to clear 70, or risk appetite rises 10 pts from 40 to clear 50.",
  recordDate: "2026-08-22",
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

  // `GET /api/alert-deliveries` lists this log and `/api/weekly-digest` counts it. Nothing in
  // production wrote to it, so both read zero however many alerts were mailed.
  it("logs each successful send, naming the recipient by hash", async () => {
    const repository = resetRegimeAlertRepository();
    await subscribeVerified("reader@example.com", { alerts: true });
    await subscribeVerified("weekly-only@example.com");

    const result = await deliverAlerts(CONDITIONS);
    const { deliveries } = await repository.listDeliveries();

    assert.equal(result.sent, 1);
    assert.equal(deliveries.length, 1, "one row per send, none for a subscriber who was not mailed");
    assert.equal(deliveries[0].channel, "email");
    assert.equal(deliveries[0].status, "sent");
    assert.equal(deliveries[0].alertId, "regime_change");
    assert.equal(deliveries[0].summary, result.alerts[0].headline);
    assert.equal(deliveries[0].clientId, await sha256Hex("reader@example.com"));
    assert.ok(!JSON.stringify(deliveries).includes("reader@example.com"), "the log does not carry the address");

    await deliverAlerts({ ...CONDITIONS, regime: "SCARCITY" });
    assert.equal((await repository.listDeliveries()).deliveries.length, 1, "a withheld repeat is not logged as a send");
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

  /*
   * The regime-change letter printed the assessment's description ("Capital is
   * expensive…") under "Action now" and "The readings return to the previous
   * conditions for two updates in a row." under "Conditions change if" — on
   * Oct 5 risk appetite clearing 50 alone moved Freezing to Cloudy, not back.
   * Both slots carry the week's guidance, from the contract the brief prints.
   */
  it("states the week's action and change line under the brief's labels", async () => {
    const { adapter, sends } = recordingAdapter();

    await deliverAlertToSubscriber("operator@example.com", REGIME_CHANGE, CONDITIONS, adapter, null);

    assert.match(sends[0].text, new RegExp(`^Action now: ${escapeRegExp(CONDITIONS.actionNow)}$`, "m"));
    assert.match(sends[0].text, new RegExp(`^Conditions change if: ${escapeRegExp(CONDITIONS.callChangesIf)}$`, "m"));
    assert.ok(sends[0].html.includes(CONDITIONS.callChangesIf));
    assert.doesNotMatch(sends[0].text + sends[0].html, /return to the previous conditions/);
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

describe("the scheduled alert run", () => {
  it("mails the guidance the snapshot publishes, not the assessment's description", async () => {
    await subscribeVerified("operator@example.com", { alerts: true });
    const snapshot = buildOperatingSnapshot({ treasury: snapshotData, macroSeries, now: new Date("2026-08-31T12:00:00.000Z") });
    const texts: string[] = [];
    Object.assign(globalThis, { EMAIL: { send: async (message: { text: string }) => { texts.push(message.text); } } });
    try {
      const result = await runScheduledAlertDelivery({ snapshot });
      assert.equal(result.sent, 1, "a first run with no state is a regime change");
    } finally {
      Reflect.deleteProperty(globalThis, "EMAIL");
    }

    assert.match(texts[0], new RegExp(`^Action now: ${escapeRegExp(snapshot.weeklyCall.actionNow)}$`, "m"));
    assert.match(texts[0], new RegExp(`^Conditions change if: ${escapeRegExp(snapshot.weeklyCall.callChangesIf)}$`, "m"));
    assert.ok(snapshot.assessment.description.length > 0);
    assert.ok(!texts[0].includes(snapshot.assessment.description), "the description is not an action");
  });
});
