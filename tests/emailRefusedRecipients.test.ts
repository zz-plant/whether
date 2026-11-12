import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";

import { deliverAlerts } from "../lib/alert/alertDelivery";
import type { PlanLines } from "../lib/alert/planLines";
import { runMonthEndPulse } from "../lib/alert/monthEndPulse";
import { createCloudflareEmailAdapter } from "../lib/email/emailDelivery";
import { sendWeeklyBrief } from "../lib/email/sendWeeklyBrief";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetRegimeAlertRepository } from "../lib/storage/regimeAlertRepository";
import { snapshotData } from "../lib/snapshot";
import { FakeKv } from "./fixtures/fakeKv";
import { liveMacroSeries } from "./fixtures/reportFixtures";

/*
 * A bounce never reaches this Worker: Cloudflare's Email Service takes it on its own
 * bounce domain and lists the address, and the next send to it throws
 * E_RECIPIENT_SUPPRESSED. Every stream counted that as a failed send, so one dead
 * mailbox turned the Monday brief and the daily alert step red and mailed the ops
 * notice every run, for as long as it stayed subscribed.
 */

const REFUSED = "bounced@example.com";

/** An EMAIL binding that refuses `REFUSED` the way Cloudflare does and keeps who else it was handed. */
const installBinding = () => {
  const attempts: string[] = [];
  Reflect.set(globalThis, "EMAIL", {
    send: async (message: { to: string }) => {
      attempts.push(message.to);
      if (message.to === REFUSED) {
        throw Object.assign(new Error("Recipient is on the suppression list."), { code: "E_RECIPIENT_SUPPRESSED" });
      }
      return { messageId: "m" };
    },
  });
  return attempts;
};

let store: SubscriberStore;

beforeEach(() => {
  Object.assign(globalThis, { WHETHER_DURABLE_KV: new FakeKv() });
  store = resetSubscriberStore();
  resetRegimeAlertRepository();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "EMAIL");
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  resetSubscriberStore();
});

const subscribeVerified = async (email: string, options?: { alerts?: boolean; planLines?: PlanLines[] }) => {
  const subscriber = await store.subscribe(email, options);
  await store.verifyEmail(subscriber.confirmToken ?? "");
  return subscriber;
};

const HOUR_MS = 60 * 60 * 1000;
const at = (start: Date, hours: number) => new Date(start.getTime() + hours * HOUR_MS);

describe("the adapter", () => {
  it("names a refusal apart from a failed send", async () => {
    installBinding();
    const adapter = createCloudflareEmailAdapter();
    const message = { subject: "s", html: "<p>h</p>", text: "t" };

    assert.deepEqual(await adapter.send({ ...message, to: { email: REFUSED } }), {
      ok: false,
      error: "Recipient is on the suppression list.",
      refused: true,
    });

    Reflect.set(globalThis, "EMAIL", { send: async () => { throw Object.assign(new Error("Rate limited."), { code: "E_RATE_LIMIT_EXCEEDED" }); } });
    const failed = await createCloudflareEmailAdapter().send({ ...message, to: { email: "reader@example.com" } });
    assert.deepEqual(failed, { ok: false, error: "Rate limited." });
  });
});

describe("what a refusal does to the record", () => {
  for (const backend of ["KV", "in-memory"] as const) {
    describe(`on the ${backend} store`, () => {
      beforeEach(() => {
        if (backend === "in-memory") {
          Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
          store = resetSubscriberStore();
        }
      });

      it("keeps sending after one refusal, and after a second within the day a soft bounce lasts", async () => {
        await subscribeVerified(REFUSED);
        const first = new Date("2026-11-09T14:00:00.000Z");

        assert.equal(await store.recordDeliveryRefusal(REFUSED, first), false);
        assert.equal(await store.recordDeliveryRefusal(REFUSED, at(first, 12)), false);

        const record = await store.getSubscriberByEmail(REFUSED);
        assert.equal(record?.deliveryRefusedAt, first.toISOString(), "the first refusal is the one remembered");
        assert.equal(record?.suppressed, undefined);
        assert.deepEqual((await store.listWeeklySubscribers()).map((sub) => sub.email), [REFUSED]);
      });

      it("suppresses on a second refusal a day or more after the first", async () => {
        await subscribeVerified(REFUSED);
        const first = new Date("2026-11-09T14:00:00.000Z");
        await store.recordDeliveryRefusal(REFUSED, first);

        assert.equal(await store.recordDeliveryRefusal(REFUSED, at(first, 24 * 7)), true);
        assert.equal((await store.getSubscriberByEmail(REFUSED))?.suppressed, true);
        assert.deepEqual(await store.listWeeklySubscribers(), [], "off every send list");
        assert.equal(await store.recordDeliveryRefusal(REFUSED, at(first, 24 * 14)), false, "already suppressed");
      });

      it("starts over when the last refusal is more than 30 days old", async () => {
        await subscribeVerified(REFUSED);
        const first = new Date("2026-09-01T14:00:00.000Z");
        await store.recordDeliveryRefusal(REFUSED, first);

        const later = at(first, 24 * 31);
        assert.equal(await store.recordDeliveryRefusal(REFUSED, later), false);
        assert.equal((await store.getSubscriberByEmail(REFUSED))?.deliveryRefusedAt, later.toISOString());
      });

      it("lifts a suppression when the inbox confirms a request", async () => {
        await subscribeVerified(REFUSED);
        const first = new Date("2026-11-01T14:00:00.000Z");
        await store.recordDeliveryRefusal(REFUSED, first);
        await store.recordDeliveryRefusal(REFUSED, at(first, 48));

        const request = await store.subscribe(REFUSED, { alerts: true });
        const confirmed = await store.verifyEmail(request.confirmToken ?? "");
        assert.equal(confirmed?.suppressed, undefined, "the reader clicked from an email that reached them");
        assert.equal(confirmed?.deliveryRefusedAt, undefined);
        assert.deepEqual((await store.listWeeklySubscribers()).map((sub) => sub.email), [REFUSED]);
      });

      it("ignores an address it has no record of", async () => {
        assert.equal(await store.recordDeliveryRefusal("nobody@example.com", new Date()), false);
      });
    });
  }
});

describe("each stream, when Cloudflare refuses one recipient", () => {
  it("the Monday brief reaches the rest and reports no error", async () => {
    await subscribeVerified(REFUSED);
    await subscribeVerified("reader@example.com");
    const now = new Date("2026-08-31T12:00:00.000Z");
    const snapshot = buildOperatingSnapshot({
      treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
      macroSeries: liveMacroSeries,
      now,
    });
    installBinding();

    const result = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now });

    assert.equal(result.ok, true, "a refused recipient does not fail the Monday step");
    assert.equal(result.errors, 0);
    assert.equal(result.sent, 1);
    assert.equal(result.refusedRecipients, 1);
    assert.ok((await store.getSubscriberByEmail(REFUSED))?.deliveryRefusedAt, "the record was told");
  });

  it("an alert run stops mailing the refused address and reports no error", async () => {
    await subscribeVerified(REFUSED, {
      alerts: true,
      planLines: [{ area: "hiring", pause: [{ metric: "tightness", operator: ">", value: 72 }], resume: [{ metric: "tightness", operator: "<", value: 66 }] }],
    });
    await subscribeVerified("reader@example.com", { alerts: true });
    const attempts = installBinding();

    /* No stored state, so the published guidance reads as changed; the scores
       also cross the refused subscriber's own pause line. Two emails for it. */
    const result = await deliverAlerts({
      regime: "VOLATILE",
      tightness: 74,
      riskAppetite: 50,
      actionNow: "Hold irreversible moves.",
      callChangesIf: "Funding pressure falls 4 pts from 74 to 70 or below.",
      recordDate: "2026-09-29",
      previousScores: { tightness: 70, riskAppetite: 50 },
    });

    assert.equal(result.errors, 0, "the daily alert step stays green");
    assert.equal(result.refusedRecipients, 1);
    assert.equal(attempts.filter((to) => to === REFUSED).length, 1, "one refusal ends the run's mail to that address");
    assert.ok(result.sent >= 1, "the other subscriber was still mailed");
    assert.ok((await store.getSubscriberByEmail(REFUSED))?.deliveryRefusedAt);
  });

  it("the month-end letter tells the record too", async () => {
    await subscribeVerified(REFUSED, { alerts: true });
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
    installBinding();

    const result = await runMonthEndPulse({ snapshot, weeklyCall: snapshot.weeklyCall });

    assert.equal(result.changed, true, "precondition: a quiet month sends nothing");
    assert.equal(result.sentEmail, 0);
    assert.ok((await store.getSubscriberByEmail(REFUSED))?.deliveryRefusedAt);
  });
});
