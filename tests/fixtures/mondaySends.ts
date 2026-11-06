import assert from "node:assert/strict";
import { sendWeeklyBrief } from "../../lib/email/sendWeeklyBrief";
import { getSubscriberStore, resetSubscriberStore } from "../../lib/email/subscriberStore";
import type { OperatingSnapshot } from "../../lib/operatingState/types";
import { deliverSlackBrief } from "../../lib/slack/deliverSlackBrief";

/** The Monday post's text, as the webhook receives it. */
export const postedBriefText = async (
  snapshot: OperatingSnapshot,
  options: { webhookUrls: string[]; now: Date; force?: boolean },
): Promise<string> => {
  let body = "";
  const capture = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    body = typeof init?.body === "string" ? init.body : "";
    return new Response("ok", { status: 200 });
  };
  const result = await deliverSlackBrief({ snapshot, fetchImpl: capture, ...options });
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

/** The Monday email's plain text, to one verified subscriber. */
export const mailedBriefText = async (snapshot: OperatingSnapshot, options: { now: Date; force?: boolean }): Promise<string> => {
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
    const result = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, ...options });
    assert.equal(result.sent, 1, result.error);
  } finally {
    if (previousBinding === undefined) Reflect.deleteProperty(globalThis, "EMAIL");
    else Reflect.set(globalThis, "EMAIL", previousBinding);
  }
  assert.ok(sent[0], "the one subscriber was mailed");
  return sent[0];
};
