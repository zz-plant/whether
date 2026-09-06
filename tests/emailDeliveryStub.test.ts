import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { createCloudflareEmailAdapter, EMAIL_NOT_CONFIGURED_ERROR } from "../lib/email/emailDelivery";

const message = { to: { email: "operator@example.com" }, subject: "x", html: "<p>x</p>", text: "x" };

describe("email adapter without a binding", () => {
  // Other files install a fake EMAIL binding on globalThis and the suite runs
  // in random order, so "without a binding" has to be made true here.
  let previousBinding: unknown;
  beforeEach(() => {
    previousBinding = Reflect.get(globalThis, "EMAIL");
    Reflect.deleteProperty(globalThis, "EMAIL");
  });
  afterEach(() => {
    if (previousBinding === undefined) Reflect.deleteProperty(globalThis, "EMAIL");
    else Reflect.set(globalThis, "EMAIL", previousBinding);
  });

  it("fails the send in production instead of claiming the mail left", async () => {
    const adapter = createCloudflareEmailAdapter({ allowStub: false });
    const result = await adapter.send(message);
    assert.deepEqual(result, { ok: false, error: EMAIL_NOT_CONFIGURED_ERROR });
  });

  it("still stubs outside production, where a log line is the point", async () => {
    const adapter = createCloudflareEmailAdapter({ allowStub: true });
    assert.deepEqual(await adapter.send(message), { ok: true });
  });

  it("stubs by default under the test runner, which pins NODE_ENV to test", async () => {
    assert.notEqual(process.env.NODE_ENV, "production");
    assert.deepEqual(await createCloudflareEmailAdapter().send(message), { ok: true });
  });
});
