/**
 * Treasury client unit tests for live fetch and snapshot fallback.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchTreasuryData } from "../lib/treasuryClient";
import type { TreasuryData } from "../lib/types";

describe("treasury client", () => {
  it("returns live data when fetch succeeds", async () => {
    let requestedUrl = "";
    const fetcher = async (input: RequestInfo | URL) => {
      requestedUrl = input.toString();
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              record_date: "2024-10-01",
              bc_1month: "5.2",
              bc_2year: "4.8",
              bc_10year: "4.6",
            },
          ],
        }),
      };
    };

    const data = await fetchTreasuryData({
      fetcher: fetcher as typeof fetch,
      asOf: "2024-10-01",
    });
    assert.equal(data.record_date, "2024-10-01");
    assert.equal(data.isLive, true);
    assert.ok(requestedUrl.includes("record_date%3Alte%3A2024-10-01"));
  });

  it("falls back to snapshot on fetch failure", async () => {
    const fetcher = async () => {
      return {
        ok: false,
        status: 500,
        json: async () => ({}),
      };
    };

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
      fetcher: fetcher as typeof fetch,
      snapshotFallback: snapshot,
    });

    assert.equal(data.record_date, "2024-09-30");
    assert.equal(data.isLive, false);
  });
});
