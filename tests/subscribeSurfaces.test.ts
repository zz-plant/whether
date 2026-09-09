import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "bun:test";
import { requestSubscription, SUBSCRIBE_ENDPOINT } from "../app/components/subscribeRequest";

const APP_DIR = new URL("../app/", import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const withStubbedFetch = async <T>(
  impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: (calls: Array<{ input: RequestInfo | URL; init?: RequestInit }>) => Promise<T>,
): Promise<T> => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return impl(input, init);
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("requestSubscription", () => {
  it("posts the address to the subscribe endpoint and reports the verification step", async () => {
    const result = await withStubbedFetch(
      async () => jsonResponse({ ok: true, message: "Check your email to confirm." }),
      async (calls) => {
        const outcome = await requestSubscription("  Operator@Example.com  ");
        assert.equal(calls.length, 1, "sends exactly one request");
        assert.equal(calls[0].input, SUBSCRIBE_ENDPOINT);
        assert.equal(calls[0].init?.method, "POST");
        const body = calls[0].init?.body;
        assert.ok(typeof body === "string", "the subscribe request carries a JSON string body");
        assert.deepEqual(JSON.parse(body), { email: "Operator@Example.com" });
        return outcome;
      },
    );

    assert.equal(result.ok, true);
    // The address is unverified until the emailed link is clicked, so the surface may not
    // claim the subscription is live.
    assert.match(result.message, /verify/i);
  });

  it("surfaces the server's rejection instead of reporting success", async () => {
    const result = await withStubbedFetch(
      async () => jsonResponse({ ok: false, error: "Valid email required." }, 400),
      async () => requestSubscription("operator@example.com"),
    );

    assert.equal(result.ok, false);
    assert.equal(result.message, "Valid email required.");
  });

  it("reports a network failure rather than resolving as subscribed", async () => {
    const result = await withStubbedFetch(
      async () => {
        throw new Error("offline");
      },
      async () => requestSubscription("operator@example.com"),
    );

    assert.equal(result.ok, false);
    assert.match(result.message, /network/i);
  });

  it("rejects an unusable address without calling the endpoint", async () => {
    const result = await withStubbedFetch(
      async () => jsonResponse({ ok: true }),
      async (calls) => {
        const outcome = await requestSubscription("not-an-address");
        assert.equal(calls.length, 0, "no request for an address the endpoint would reject");
        return outcome;
      },
    );

    assert.equal(result.ok, false);
  });
});

describe("subscribe surfaces", () => {
  it("routes every subscribe control through the shared request", () => {
    for (const file of ["app/components/SubscribeForm.tsx"]) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      assert.match(source, /requestSubscription/, `${file} uses the shared subscribe request`);
      assert.doesNotMatch(
        source,
        /getSubscriberStore/,
        `${file} does not write subscriptions through the store directly`,
      );
    }
  });

  // The settings panel called getSubscriberStore() in the browser. With no KV binding there,
  // the store fell back to memory, the call resolved, and the panel reported a subscription
  // that was never recorded. Any binding-backed module imported into a client component can
  // fail the same silent way.
  it("keeps binding-backed modules out of client components", () => {
    const bindingBacked = [
      "lib/email/subscriberStore",
      "lib/alert/alertDelivery",
      "lib/runtime/kv",
    ];

    const violations: string[] = [];
    for (const file of sourceFiles(APP_DIR)) {
      const source = readFileSync(file, "utf8");
      if (!/^\s*("use client"|'use client')/.test(source)) continue;
      for (const [, specifier] of source.matchAll(/from\s+"([^"]+)"/g)) {
        const normalized = specifier.replace(/^(\.\.\/)+/, "");
        if (bindingBacked.some((module) => normalized.startsWith(module))) {
          violations.push(`${file.replace(APP_DIR, "app/")} imports ${specifier}`);
        }
      }
    }

    assert.deepEqual(violations, []);
  });
});
