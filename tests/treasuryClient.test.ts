/**
 * Treasury client unit tests for live fetch and snapshot fallback.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchTreasuryData } from "../lib/treasury/treasuryClient";
import type { TreasuryData } from "../lib/types";

const buildCsv = (seriesId: string, values: Array<{ date: string; value: string }>) => {
  const rows = values.map(({ date, value }) => `${date},${value}`).join("\n");
  return `DATE,${seriesId}\n${rows}`;
};

describe("treasury client", () => {
  it("returns live data when fetch succeeds", async () => {
    const requestedUrls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      const url = input.toString();
      requestedUrls.push(url);

      if (url.includes("DGS1MO")) {
        return new Response(
          buildCsv("DGS1MO", [
            { date: "2024-10-01", value: "5.2" },
            { date: "2024-10-02", value: "5.1" },
          ])
        );
      }

      if (url.includes("DGS3MO")) {
        return new Response(
          buildCsv("DGS3MO", [
            { date: "2024-10-01", value: "5.0" },
            { date: "2024-10-02", value: "4.9" },
          ])
        );
      }

      if (url.includes("DGS2")) {
        return new Response(
          buildCsv("DGS2", [
            { date: "2024-10-01", value: "4.8" },
            { date: "2024-10-02", value: "4.7" },
          ])
        );
      }

      return new Response(
        buildCsv("DGS10", [
          { date: "2024-10-01", value: "4.6" },
          { date: "2024-10-02", value: "4.5" },
        ])
      );
    };

    const data = await fetchTreasuryData({ fetcher });
    assert.equal(data.record_date, "2024-10-02");
    assert.equal(data.isLive, true);
    assert.equal(requestedUrls.length, 4);
    assert.ok(requestedUrls.some((url) => url.includes("DGS1MO")));
    assert.ok(requestedUrls.some((url) => url.includes("DGS3MO")));
    assert.ok(requestedUrls.some((url) => url.includes("DGS2")));
    assert.ok(requestedUrls.some((url) => url.includes("DGS10")));
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
        buildCsv("DGS1MO", [
          { date: "2024-10-01", value: "." },
          { date: "2024-10-02", value: "." },
        ])
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

  it("preserves custom endpoint support for live reads", async () => {
    const endpoint = "https://example.com/fredgraph.csv?cosd=2024-01-01&coed=2024-12-31&auth=token";
    const requestedUrls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      requestedUrls.push(input.toString());
      return new Response(
        buildCsv("DGS", [
          { date: "2024-10-01", value: "5.2" },
          { date: "2024-10-02", value: "5.1" },
        ])
      );
    };

    const data = await fetchTreasuryData({
      fetcher,
      endpoint,
    });

    assert.equal(data.source, "https://fred.stlouisfed.org");
    assert.equal(
      requestedUrls.every((url) => {
        const parsed = new URL(url);
        return (
          parsed.searchParams.get("cosd") === "2024-01-01" &&
          parsed.searchParams.get("coed") === "2024-12-31" &&
          parsed.searchParams.get("auth") === "token" &&
          ["DGS1MO", "DGS3MO", "DGS2", "DGS10"].includes(parsed.searchParams.get("id") ?? "")
        );
      }),
      true
    );
    assert.equal(data.fetched_at.length > 0, true);
  });

  it("preserves existing custom endpoint query params when setting series id", async () => {
    const endpoint = "https://example.com/fredgraph.csv?cosd=2024-01-01&coed=2024-12-31&api_key=test";
    const requestedUrls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      requestedUrls.push(input.toString());
      return new Response(
        buildCsv("DGS", [
          { date: "2024-10-01", value: "5.2" },
          { date: "2024-10-02", value: "5.1" },
        ])
      );
    };

    await fetchTreasuryData({
      fetcher,
      endpoint,
    });

    assert.equal(requestedUrls.length, 4);
    for (const requestUrl of requestedUrls) {
      const parsed = new URL(requestUrl);
      assert.equal(parsed.searchParams.get("cosd"), "2024-01-01");
      assert.equal(parsed.searchParams.get("coed"), "2024-12-31");
      assert.equal(parsed.searchParams.get("api_key"), "test");
      assert.ok(["DGS1MO", "DGS3MO", "DGS2", "DGS10"].includes(parsed.searchParams.get("id") ?? ""));
    }
  });
});
