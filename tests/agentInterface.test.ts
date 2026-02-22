import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pullRecentSiteInfo } from "../lib/agentInterface";

describe("pullRecentSiteInfo", () => {
  it("fetches weekly cadence from the default site URL", async () => {
    let requestedUrl = "";
    const mockFetch: typeof fetch = (async (input) => {
      requestedUrl = String(input);
      return {
        ok: true,
        status: 200,
        json: async () => ({ cadence: "weekly", generatedAt: "2026-01-01T00:00:00.000Z" }),
      } as Response;
    }) as typeof fetch;

    const result = await pullRecentSiteInfo({ fetchImpl: mockFetch });

    assert.equal(requestedUrl, "https://whether.work/api/agent?cadence=weekly");
    assert.equal(result.siteUrl, "https://whether.work");
    assert.equal(result.cadence, "weekly");
    assert.equal(result.payload.cadence, "weekly");
  });

  it("uses provided site URL and cadence", async () => {
    let requestedUrl = "";
    const mockFetch: typeof fetch = (async (input) => {
      requestedUrl = String(input);
      return {
        ok: true,
        status: 200,
        json: async () => ({ cadence: "monthly" }),
      } as Response;
    }) as typeof fetch;

    await pullRecentSiteInfo({
      cadence: "monthly",
      siteBaseUrl: "example.com/path",
      fetchImpl: mockFetch,
    });

    assert.equal(requestedUrl, "https://example.com/api/agent?cadence=monthly");
  });

  it("throws when site response is not ok", async () => {
    const mockFetch: typeof fetch = (async () =>
      ({
        ok: false,
        status: 503,
        json: async () => ({}),
      }) as Response) as typeof fetch;

    await assert.rejects(() => pullRecentSiteInfo({ fetchImpl: mockFetch }), {
      message:
        "Unable to pull recent site info from https://whether.work/api/agent?cadence=weekly (status 503).",
    });
  });
});
