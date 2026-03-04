import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchWithTimeout } from "../lib/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  it("aborts requests that exceed timeout", async () => {
    const fetcher: typeof fetch = (async (_input, init) => {
      await new Promise<void>((resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error("signal missing"));
          return;
        }
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
      return new Response("ok");
    }) as typeof fetch;

    await assert.rejects(
      fetchWithTimeout(fetcher, "https://example.com", undefined, 5),
      /AbortError|aborted/i,
    );
  });

  it("returns fetch response before timeout", async () => {
    const fetcher: typeof fetch = (async () => new Response("ok", { status: 200 })) as typeof fetch;

    const response = await fetchWithTimeout(fetcher, "https://example.com", undefined, 200);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
  });
});
