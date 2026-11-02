import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { INDEXNOW_ENDPOINT, submitIndexNow } from "../lib/seo/indexNow";
import { siteUrl } from "../lib/siteUrl";

const originalKey = process.env.INDEXNOW_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = originalKey;
});

/** The URL a `fetch` input names, without asserting its shape. */
const inputUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

type IndexNowBody = { host: string; key: string; keyLocation: string; urlList: string[] };

const bodyOf = (body: BodyInit | null | undefined): IndexNowBody =>
  JSON.parse(typeof body === "string" ? body : "{}");

describe("IndexNow", () => {
  it("is a no-op without a key", async () => {
    delete process.env.INDEXNOW_KEY;
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return new Response("", { status: 200 });
    };
    const result = await submitIndexNow([`${siteUrl}/answers/x`], { fetchImpl });
    assert.equal(result.submitted, 0);
    assert.equal(result.skipped, "no INDEXNOW_KEY");
    assert.equal(called, false);
  });

  it("submits same-host URLs with the key and key location", async () => {
    const captured: { url?: string; body?: IndexNowBody } = {};
    const fetchImpl: typeof fetch = async (input, init) => {
      captured.url = inputUrl(input);
      captured.body = bodyOf(init?.body);
      return new Response("", { status: 200 });
    };
    const result = await submitIndexNow(
      [`${siteUrl}/answers/a`, `${siteUrl}/answers/b`, "https://elsewhere.example/x"],
      { key: "abc123", fetchImpl },
    );

    assert.equal(result.submitted, 2);
    assert.equal(result.status, 200);
    assert.equal(captured.url, INDEXNOW_ENDPOINT);
    assert.equal(captured.body?.key, "abc123");
    assert.ok(captured.body?.keyLocation.endsWith("/indexnow/abc123.txt"));
    assert.deepEqual(captured.body?.urlList, [`${siteUrl}/answers/a`, `${siteUrl}/answers/b`]);
  });

  it("does not throw when the ping fails", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("network");
    };
    const result = await submitIndexNow([`${siteUrl}/answers/a`], { key: "abc123", fetchImpl });
    assert.equal(result.submitted, 0);
    assert.equal(result.skipped, "request failed");
  });
});
