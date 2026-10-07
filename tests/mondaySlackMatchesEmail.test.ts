import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { sendWeeklyBrief } from "../lib/email/sendWeeklyBrief";
import { deliverSlackBrief } from "../lib/slack/deliverSlackBrief";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import type { OperatingSnapshot } from "../lib/operatingState/types";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";
import { POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";
import { macros, treasury as fixtureTreasury } from "./factories/exportFixtures";

/*
 * The Monday cron sends one week twice: the email to subscribers and the post to
 * every subscribed channel, from the same `OperatingSnapshot`. The email read the
 * snapshot's `WeeklyCallContract`; the post re-derived the call from the lead
 * area row and `assessment.description`, with no policy-override branch. So on a
 * week the two scores disagreed, the inbox said "the guidance is not changing
 * this week" and the channel printed the lead area's own action and pause line
 * beside it, while a comment above the post claimed it was "the email's call in
 * Slack's blocks". These pin that it is.
 */

const webhookUrls = ["https://hooks.slack.com/services/T0/B0/monday"];

/** The export fixture's reading, which the policy layer refuses: its two scores disagree. */
const overrideSnapshot = () =>
  buildOperatingSnapshot({
    treasury: fixtureTreasury,
    macroSeries: macros,
    now: new Date("2026-03-05T12:00:00.000Z"),
  });

/** The bundled reading, marked live and current, which the policy layer does not refuse. */
const ordinarySnapshot = () =>
  buildOperatingSnapshot({
    treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
    macroSeries,
    now: new Date("2026-08-31T12:00:00.000Z"),
  });

const postedText = async (snapshot: OperatingSnapshot, now: Date): Promise<string> => {
  let body = "";
  const capture = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    body = typeof init?.body === "string" ? init.body : "";
    return new Response("ok", { status: 200 });
  };
  const result = await deliverSlackBrief({ webhookUrls, snapshot, now, fetchImpl: capture });
  assert.equal(result.status, "posted", result.error);
  const parsed: unknown = JSON.parse(body);
  const blocks = typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "blocks") : undefined;
  assert.ok(Array.isArray(blocks));
  return blocks
    .map((block: unknown) => {
      const text = typeof block === "object" && block !== null ? Reflect.get(block, "text") : undefined;
      const value = typeof text === "object" && text !== null ? Reflect.get(text, "text") : undefined;
      return typeof value === "string" ? value : "";
    })
    .join("\n");
};

const mailedText = async (snapshot: OperatingSnapshot, now: Date): Promise<string> => {
  resetSubscriberStore();
  const store = getSubscriberStore();
  const subscriber = await store.subscribe("operator@example.com");
  await store.verifyEmail(subscriber.confirmToken ?? "");

  const sent: string[] = [];
  const previousBinding = Reflect.get(globalThis, "EMAIL");
  Reflect.set(globalThis, "EMAIL", {
    send: async (message: { text: string }) => {
      sent.push(message.text);
    },
  });
  try {
    const result = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now });
    assert.equal(result.sent, 1, result.error);
  } finally {
    if (previousBinding === undefined) Reflect.deleteProperty(globalThis, "EMAIL");
    else Reflect.set(globalThis, "EMAIL", previousBinding);
  }
  assert.ok(sent[0], "the one subscriber was mailed");
  return sent[0];
};

/** The value printed after `label: ` on a line of its own, with any bullet stripped. */
const slot = (text: string, label: string): string | undefined => {
  for (const line of text.split("\n")) {
    const match = new RegExp(`^(?:• )?${label}: (.+)$`).exec(line);
    if (match) return match[1];
  }
  return undefined;
};

const assertSameCall = (post: string, mail: string, snapshot: OperatingSnapshot) => {
  const { weeklyCall } = snapshot;
  // The email prints the action under "Action now"; the post's guidance opens on the same sentence.
  assert.ok(slot(post, "Guidance")?.startsWith(slot(mail, "Action now") ?? "\u0000"), "the post's guidance opens on the email's action");
  assert.ok(slot(post, "Guidance")?.startsWith(weeklyCall.actionNow));
  assert.equal(slot(post, "Pause if"), slot(mail, "Pause if"));
  assert.equal(slot(post, "Conditions change if"), slot(mail, "Conditions change if"));
  assert.equal(slot(post, "Conditions change if"), weeklyCall.callChangesIf);
  assert.ok(slot(post, "Guidance")?.endsWith(weeklyCall.currentCall), "the stance follows the action in the post's guidance");
};

describe("the Monday Slack post carries the email's call", () => {
  it("on a week the policy layer holds the guidance", async () => {
    const now = new Date("2026-03-05T12:00:00.000Z");
    const snapshot = overrideSnapshot();
    assert.equal(snapshot.weeklyCall.policyOverrideActive, true, "the fixture is an override week");

    const post = await postedText(snapshot, now);
    const mail = await mailedText(snapshot, now);

    assertSameCall(post, mail, snapshot);
    assert.equal(slot(post, "Guidance"), `${POLICY_OVERRIDE_CALL.actionNow} ${POLICY_OVERRIDE_CALL.currentCall}`);
    assert.equal(slot(post, "Do now"), undefined, "the action is not repeated under a second label");
    assert.equal(slot(mail, "Pause if"), POLICY_OVERRIDE_CALL.pauseIf);
  });

  it("on an ordinary week", async () => {
    const now = new Date("2026-08-31T12:00:00.000Z");
    const snapshot = ordinarySnapshot();
    assert.equal(snapshot.weeklyCall.policyOverrideActive, false, "the fixture is an ordinary week");

    assertSameCall(await postedText(snapshot, now), await mailedText(snapshot, now), snapshot);
  });
});
