import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { sendWeeklyBrief } from "../lib/email/sendWeeklyBrief";
import { deliverSlackBrief } from "../lib/slack/deliverSlackBrief";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";
import { liveMacroSeries } from "./fixtures/reportFixtures";

/*
 * The two artifacts that leave the building.
 *
 * `briefPublishGuard` has protected the archive and the pasteable brief since
 * 2026-08-29, and neither send path asked it. The email filled a missing
 * snapshot with constants — regime "DEFENSIVE", "Hold bounded operating
 * discipline.", a record date reading "this week" — and returned ok, which the
 * cron then recorded as a green Monday row. The Slack dispatcher computed a
 * `degraded` flag and the one caller dropped it on the floor.
 *
 * A refusal is worse for a subscriber than a brief and better than a wrong one:
 * the archive is the product's proof of cadence, and a week it claims but never
 * read is the one thing that cannot be corrected later.
 */

const FRESH_NOW = new Date("2026-08-31T12:00:00.000Z");

/** The bundled snapshot, which is what a total upstream outage serves. */
const fallbackSnapshot = () =>
  buildOperatingSnapshot({ treasury: snapshotData, macroSeries, now: FRESH_NOW });

/** The same reading, marked live and dated inside the publishable window. */
const liveSnapshot = (recordDate = "2026-08-28") =>
  buildOperatingSnapshot({
    treasury: {
      ...snapshotData,
      isLive: true,
      record_date: recordDate,
      fetched_at: `${recordDate}T12:00:00.000Z`,
    },
    macroSeries: liveMacroSeries,
    now: FRESH_NOW,
  });

const withOneSubscriber = async () => {
  resetSubscriberStore();
  const store = getSubscriberStore();
  const subscriber = await store.subscribe("operator@example.com");
  await store.verifyEmail(subscriber.confirmToken ?? "");
};

describe("the weekly email refuses what it cannot stand behind", () => {
  it("sends nothing when no snapshot exists, instead of mailing an invented DEFENSIVE call", async () => {
    await withOneSubscriber();
    resetOperatingSnapshotStore();

    const result = await sendWeeklyBrief({ now: FRESH_NOW });

    assert.equal(result.ok, false);
    assert.equal(result.sent, 0);
    assert.match(result.error ?? "", /^refused_unpublishable: /);
    assert.match(result.error ?? "", /no guidance to send/);
  });

  it("refuses a fallback reading rather than mailing it as this week", async () => {
    await withOneSubscriber();
    const snapshot = fallbackSnapshot();

    const result = await sendWeeklyBrief({
      snapshot,
      weeklyCall: snapshot.weeklyCall,
      now: FRESH_NOW,
    });

    assert.equal(result.ok, false);
    assert.equal(result.sent, 0);
    assert.match(result.error ?? "", /fallback snapshot, not a live reading/);
  });

  it("refuses a live reading that is too old to name the week being published", async () => {
    await withOneSubscriber();
    const snapshot = liveSnapshot("2026-06-17");

    const result = await sendWeeklyBrief({
      snapshot,
      weeklyCall: snapshot.weeklyCall,
      now: FRESH_NOW,
    });

    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /days old/);
  });

  it("sends a live, current reading", async () => {
    await withOneSubscriber();
    const snapshot = liveSnapshot();

    const result = await sendWeeklyBrief({
      snapshot,
      weeklyCall: snapshot.weeklyCall,
      now: FRESH_NOW,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sent, 1);
    assert.equal(result.error, undefined);
  });

  it("points every subscriber at their own plan's lines, in both bodies", async () => {
    await withOneSubscriber();
    const snapshot = liveSnapshot();
    /* The stub logs the subject and drops the bodies, so a binding that keeps
       them is the only way to read what a subscriber receives. */
    const sent: Array<{ html: string; text: string }> = [];
    const previousBinding = Reflect.get(globalThis, "EMAIL");
    Reflect.set(globalThis, "EMAIL", {
      send: async (message: { html: string; text: string }) => {
        sent.push({ html: message.html, text: message.text });
      },
    });

    try {
      const result = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: FRESH_NOW });
      assert.equal(result.deliveryMode, "live");
      assert.equal(result.sent, 1);
    } finally {
      if (previousBinding === undefined) Reflect.deleteProperty(globalThis, "EMAIL");
      else Reflect.set(globalThis, "EMAIL", previousBinding);
    }

    const [message] = sent;
    assert.ok(message, "the one subscriber was mailed");
    assert.match(message.text, /Move these lines for your own plan, and hear the day one is crossed: \S+\/operate#ops-plan-lines/);
    assert.match(message.html, /<a href="[^"]+\/operate#ops-plan-lines"[^>]*>Move these lines for your own plan<\/a>/);
  });

  it("still reports no subscribers as the non-event it is", async () => {
    resetSubscriberStore();

    const result = await sendWeeklyBrief({ now: FRESH_NOW });

    assert.equal(result.ok, true);
    assert.equal(result.total, 0);
    assert.equal(result.message, "No active subscriptions.");
  });
});

describe("the Slack post refuses the same readings", () => {
  const webhookUrls = ["https://hooks.slack.com/services/T0/B0/x"];

  it("posts nothing when the brief it built is not publishable", async () => {
    let posted = 0;
    const countingFetch = async (): Promise<Response> => {
      posted += 1;
      return new Response("ok", { status: 200 });
    };

    /* No payload passed, so it builds one from the read path — which, offline,
       is the bundled snapshot the guard exists to catch. */
    const result = await deliverSlackBrief({
      webhookUrls,
      fetchImpl: countingFetch,
      now: FRESH_NOW,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "refused_unpublishable");
    assert.equal(result.attempted, 0);
    assert.equal(result.delivered, 0);
    assert.equal(posted, 0, "a refused week must not reach a channel");
    assert.match(result.error ?? "", /^refused_unpublishable: /);
  });
});
