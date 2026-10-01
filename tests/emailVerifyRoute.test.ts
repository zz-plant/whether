import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { GET, POST } from "../app/api/email/verify/route";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";

/*
 * Mail filters open every link in a message to scan it. When opening the
 * confirmation link applied the change, a filter could confirm a change for a
 * reader who never saw it; now the link shows the change and a button applies it.
 */

let store: SubscriberStore;

beforeEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  store = resetSubscriberStore();
});

afterEach(() => {
  resetSubscriberStore();
});

const open = (token: string) => GET(new Request(`https://whether.test/api/email/verify?token=${encodeURIComponent(token)}`));

const press = (token: string) => {
  const body = new FormData();
  body.set("token", token);
  return POST(new Request("https://whether.test/api/email/verify", { method: "POST", body }));
};

describe("the confirmation link", () => {
  it("shows the change without making it, and the button makes it", async () => {
    await store.verifyEmail((await store.subscribe("reader@example.com")).confirmToken ?? "");
    const request = await store.subscribe("reader@example.com", { weekly: false });
    const token = request.confirmToken ?? "";

    const shown = await open(token);
    assert.equal(shown.status, 200);
    const page = await shown.text();
    assert.match(page, /Someone asked to stop the Whether weekly brief/);
    assert.match(page, /<form method='post' action='\/api\/email\/verify'>/);
    assert.equal(shown.headers.get("Referrer-Policy"), "no-referrer");
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, true, "opening the link changed nothing");

    const confirmed = await press(token);
    assert.equal(confirmed.status, 200);
    assert.match(await confirmed.text(), /Confirmed/);
    assert.equal((await store.getSubscriberByEmail("reader@example.com"))?.weekly, false);
  });

  it("says a dead link is dead, on opening and on pressing", async () => {
    const reader = await store.subscribe("reader@example.com");
    await store.verifyEmail(reader.confirmToken ?? "");

    for (const response of [await open(reader.confirmToken ?? ""), await press(reader.token)]) {
      assert.equal(response.status, 410);
      assert.match(await response.text(), /expired, was already used, or was replaced/);
    }
  });
});
