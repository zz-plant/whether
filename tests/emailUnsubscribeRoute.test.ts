import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { GET, POST } from "../app/api/email/unsubscribe/route";
import { getActiveSubscriptions } from "../lib/email/emailDelivery";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";

/*
 * The footer link of every Monday brief and alert. Mail filters open every link
 * in a message to scan it; when opening this one unsubscribed, a filter could
 * stop a reader's brief on delivery. Opening it now shows a button.
 */

let store: SubscriberStore;

beforeEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  store = resetSubscriberStore();
});

afterEach(() => {
  resetSubscriberStore();
});

const subscribed = async () => {
  const reader = await store.subscribe("reader@example.com");
  await store.verifyEmail(reader.confirmToken ?? "");
  return reader;
};

const open = (token: string) => GET(new Request(`https://whether.test/api/email/unsubscribe?token=${encodeURIComponent(token)}`));

describe("the unsubscribe link", () => {
  it("says what stops without stopping it, and the button stops it", async () => {
    const reader = await subscribed();

    const shown = await open(reader.token);
    assert.equal(shown.status, 200);
    const page = await shown.text();
    assert.match(page, /This stops every email Whether sends to this address, including the Whether weekly brief/);
    assert.match(page, /<form method='post' action='\/api\/email\/unsubscribe'>/);
    assert.equal(shown.headers.get("Referrer-Policy"), "no-referrer");
    assert.deepEqual((await getActiveSubscriptions()).map((r) => r.email), ["reader@example.com"], "opening the link changed nothing");

    const body = new FormData();
    body.set("token", reader.token);
    const left = await POST(new Request("https://whether.test/api/email/unsubscribe", { method: "POST", body }));
    assert.equal(left.status, 200);
    assert.match(await left.text(), /Unsubscribed/);
    assert.deepEqual(await getActiveSubscriptions(), []);
  });

  it("takes a mail client's one-click unsubscribe, which posts to the link itself", async () => {
    const reader = await subscribed();
    const response = await POST(
      new Request(`https://whether.test/api/email/unsubscribe?token=${encodeURIComponent(reader.token)}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await getActiveSubscriptions(), []);
  });

  it("says so when the address has already left, or the link is not one of ours", async () => {
    const reader = await subscribed();
    await store.unsubscribe(reader.token);
    assert.match(await (await open(reader.token)).text(), /Already unsubscribed/);

    const unknown = await open("not-a-token");
    assert.equal(unknown.status, 404);
    assert.match(await unknown.text(), /does not match a Whether subscription/);
  });
});
