/**
 * Treasury client unit tests for live fetch and snapshot fallback.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchTreasuryData } from "../lib/treasury/treasuryClient";
import type { TreasuryData } from "../lib/types";

describe("treasury client", () => {
  it("returns live data when fetch succeeds", async () => {
    let requestedUrl = "";
    const fetcher: typeof fetch = async (input) => {
      requestedUrl = input.toString();
      return new Response(
        JSON.stringify({
          data: [
            {
              record_date: "2024-10-01",
              bc_1month: "5.2",
              bc_2year: "4.8",
              bc_10year: "4.6",
            },
          ],
        }),
      );
    };

    const data = await fetchTreasuryData({
      fetcher,
    });
    assert.equal(data.record_date, "2024-10-01");
    assert.equal(data.isLive, true);
    assert.ok(requestedUrl.includes("page%5Bsize%5D=1"));
    assert.equal(requestedUrl.includes("filter="), false);
  });

  it("falls back to snapshot on fetch failure", async () => {
    const fetcher: typeof fetch = async () => new Response("{}", { status: 500 });

    const snapshot: TreasuryData = {
      source: "snapshot",
      record_date: "2024-09-30",
      fetched_at: "2024-10-01T00:00:00Z",
      isLive: false,
      yields: {
        oneMonth: 5.1,
        twoYear: 4.7,
        tenYear: 4.5,
      },
    };

    const data = await fetchTreasuryData({
      fetcher,
      snapshotFallback: snapshot,
    });

    assert.equal(data.record_date, "2024-09-30");
    assert.equal(data.isLive, false);
    assert.equal(data.fallback_reason, "Treasury API error: 500");
    assert.ok(data.fallback_at);
  });


  it("falls back to snapshot when payload shape is invalid", async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: "invalid",
        })
      );

    const snapshot: TreasuryData = {
      source: "snapshot",
      record_date: "2024-09-30",
      fetched_at: "2024-10-01T00:00:00Z",
      isLive: false,
      yields: {
        oneMonth: 5.1,
        twoYear: 4.7,
        tenYear: 4.5,
      },
    };

    const data = await fetchTreasuryData({
      fetcher,
      snapshotFallback: snapshot,
    });

    assert.equal(data.record_date, "2024-09-30");
    assert.equal(data.isLive, false);
    assert.equal(data.fallback_reason, "Treasury API returned no data or invalid payload.");
    assert.ok(data.fallback_at);
  });


  it("returns snapshot fallback with explicit reason for historical cache miss", async () => {
    const snapshot: TreasuryData = {
      source: "snapshot",
      record_date: "2024-08-31",
      fetched_at: "2024-09-01T00:00:00Z",
      isLive: false,
      yields: {
        oneMonth: 5.0,
        twoYear: 4.6,
        tenYear: 4.4,
      },
    };

    const data = await fetchTreasuryData({
      asOf: "2010-01-31",
      snapshotFallback: snapshot,
    });

    assert.equal(data.record_date, "2024-08-31");
    assert.equal(data.isLive, false);
    assert.equal(data.fallback_reason, "Time Machine cache miss for historical selection.");
    assert.ok(data.fallback_at);
  });

  it("preserves request URL as source metadata for live reads", async () => {
    const endpoint = "https://example.com/treasury";
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              record_date: "2024-10-01",
              bc_1month: "5.2",
              bc_2year: "4.8",
              bc_10year: "4.6",
            },
          ],
        }),
      );

    const data = await fetchTreasuryData({
      fetcher,
      endpoint,
    });

    assert.ok(data.source.startsWith(`${endpoint}?`));
    assert.equal(data.source.includes("sort=-record_date"), true);
    assert.equal(data.source.includes("page%5Bsize%5D=1"), true);
    assert.equal(data.fetched_at.length > 0, true);
  });
});
