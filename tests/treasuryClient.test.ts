/**
 * Treasury client unit tests for live fetch and snapshot fallback.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { fetchTreasuryData } from "../lib/treasury/treasuryClient";
import { fetchFredCsv, getFredCircuitBreakerState, resetFredCircuitBreaker } from "../lib/fred";
import type { TreasuryData } from "../lib/types";

/** The URL a fetch stub was asked for, whichever form the caller passed. */
const requestUrl = (input: RequestInfo | URL) =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

const buildCsv = (seriesId: string, values: Array<{ date: string; value: string }>) => {
  const rows = values.map(({ date, value }) => `${date},${value}`).join("\n");
  return `DATE,${seriesId}\n${rows}`;
};

describe("treasury client", () => {
  it("returns live data when fetch succeeds", async () => {
    const requestedUrls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      requestedUrls.push(url);

      if (url.includes("DGS1MO")) {
        return new Response(
          buildCsv("DGS1MO", [
            { date: "2026-02-01", value: "5.2" },
            { date: "2026-02-02", value: "5.1" },
          ])
        );
      }

      if (url.includes("DGS3MO")) {
        return new Response(
          buildCsv("DGS3MO", [
            { date: "2026-02-01", value: "5.0" },
            { date: "2026-02-02", value: "4.9" },
          ])
        );
      }

      if (url.includes("DGS2")) {
        return new Response(
          buildCsv("DGS2", [
            { date: "2026-02-01", value: "4.8" },
            { date: "2026-02-02", value: "4.7" },
          ])
        );
      }

      return new Response(
        buildCsv("DGS10", [
          { date: "2026-02-01", value: "4.6" },
          { date: "2026-02-02", value: "4.5" },
        ])
      );
    };

    const data = await fetchTreasuryData({ fetcher });
    assert.equal(data.record_date, "2026-02-02");
    assert.equal(data.isLive, true);
    assert.equal(requestedUrls.length, 4);
    assert.ok(requestedUrls.some((url) => url.includes("DGS1MO")));
    assert.ok(requestedUrls.some((url) => url.includes("DGS3MO")));
    assert.ok(requestedUrls.some((url) => url.includes("DGS2")));
    assert.ok(requestedUrls.some((url) => url.includes("DGS10")));
  });

  it("falls back to snapshot on fetch failure", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      if (url.includes("home.treasury.gov")) {
        return new Response("{}", { status: 500 });
      }

      return new Response("{}", { status: 500 });
    };

    const snapshot: TreasuryData = {
      source: "snapshot",
      record_date: "2024-09-30",
      fetched_at: "2026-02-01T00:00:00Z",
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
    assert.equal(data.fallback_reason, "FRED Treasury fetch error: 500");
    assert.ok(data.fallback_at);
  });

  it("falls back to snapshot when payload shape is invalid", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      if (url.includes("home.treasury.gov")) {
        return new Response("{}", { status: 500 });
      }

      return new Response(
        buildCsv("DGS1MO", [
          { date: "2026-02-01", value: "." },
          { date: "2026-02-02", value: "." },
        ])
      );
    };

    const snapshot: TreasuryData = {
      source: "snapshot",
      record_date: "2024-09-30",
      fetched_at: "2026-02-01T00:00:00Z",
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
    assert.equal(data.fallback_reason, "FRED Treasury series returned no data or invalid payload.");
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
      requestedUrls.push(requestUrl(input));
      return new Response(
        buildCsv("DGS", [
          { date: "2026-02-01", value: "5.2" },
          { date: "2026-02-02", value: "5.1" },
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
      requestedUrls.push(requestUrl(input));
      return new Response(
        buildCsv("DGS", [
          { date: "2026-02-01", value: "5.2" },
          { date: "2026-02-02", value: "5.1" },
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

  it("retries once when series requests abort", async () => {
    const attempts = new Map<string, number>();
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      const count = attempts.get(url) ?? 0;
      attempts.set(url, count + 1);

      if (count === 0) {
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        throw error;
      }

      return new Response(
        buildCsv("DGS", [
          { date: "2026-02-01", value: "5.2" },
          { date: "2026-02-02", value: "5.1" },
        ])
      );
    };

    const data = await fetchTreasuryData({ fetcher });
    assert.equal(data.isLive, true);
    for (const count of attempts.values()) {
      assert.equal(count, 2);
    }
  });

  it("retries series requests after transient 520 responses", async () => {
    const attempts = new Map<string, number>();
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      const count = attempts.get(url) ?? 0;
      attempts.set(url, count + 1);

      if (count === 0) {
        return new Response("upstream unavailable", { status: 520 });
      }

      if (url.includes("DGS1MO")) {
        return new Response(
          buildCsv("DGS1MO", [
            { date: "2026-02-01", value: "5.2" },
            { date: "2026-02-02", value: "5.1" },
          ])
        );
      }
      if (url.includes("DGS3MO")) {
        return new Response(
          buildCsv("DGS3MO", [
            { date: "2026-02-01", value: "5.0" },
            { date: "2026-02-02", value: "4.9" },
          ])
        );
      }
      if (url.includes("DGS2")) {
        return new Response(
          buildCsv("DGS2", [
            { date: "2026-02-01", value: "4.8" },
            { date: "2026-02-02", value: "4.7" },
          ])
        );
      }

      return new Response(
        buildCsv("DGS10", [
          { date: "2026-02-01", value: "4.6" },
          { date: "2026-02-02", value: "4.5" },
        ])
      );
    };

    const data = await fetchTreasuryData({ fetcher });
    assert.equal(data.isLive, true);
    assert.equal(data.record_date, "2026-02-02");
    for (const count of attempts.values()) {
      assert.equal(count, 2);
    }
  });

  it("surfaces a clearer fallback reason when 520 persists across retries", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);

      if (url.includes("fredgraph.csv?id=")) {
        return new Response("upstream unavailable", { status: 520 });
      }

      return new Response("{}", { status: 500 });
    };

    const snapshot: TreasuryData = {
      source: "snapshot",
      record_date: "2024-09-30",
      fetched_at: "2026-02-01T00:00:00Z",
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

    assert.equal(
      data.fallback_reason,
      "FRED Treasury upstream unavailable (HTTP 520) after 2 attempts."
    );
  });

  it("uses a clearer fallback reason after repeated timeout aborts", async () => {
    const fetcher: typeof fetch = async () => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      throw error;
    };

    const snapshot: TreasuryData = {
      source: "snapshot",
      record_date: "2024-09-30",
      fetched_at: "2026-02-01T00:00:00Z",
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

    assert.equal(
      data.fallback_reason,
      "Treasury live fetch timed out after 1.5s (retried once)."
    );
  });

  it("uses Treasury daily rates CSV as a live backup when FRED is unavailable", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      if (url.includes("home.treasury.gov")) {
        return new Response(["Date,1 Mo,3 Mo,2 Yr,10 Yr", "01/09/2026,4.12,4.23,4.31,4.56"].join("\n"));
      }

      return new Response("{}", { status: 500 });
    };

    const data = await fetchTreasuryData({ fetcher });
    assert.equal(data.isLive, true);
    assert.equal(data.record_date, "2026-01-09");
    assert.equal(data.source, "https://home.treasury.gov");
    assert.deepEqual(data.yields, {
      oneMonth: 4.12,
      threeMonth: 4.23,
      twoYear: 4.31,
      tenYear: 4.56,
    });
  });

  it("uses the next newest Treasury CSV row when the latest row has placeholder tenor values", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      if (url.includes("home.treasury.gov")) {
        return new Response(
          [
            "Date,1 Mo,3 Mo,2 Yr,10 Yr",
            "01/10/2026,.,4.25,4.34,4.58",
            "01/09/2026,4.12,4.23,4.31,4.56",
          ].join("\n")
        );
      }

      return new Response("{}", { status: 500 });
    };

    const data = await fetchTreasuryData({ fetcher });
    assert.equal(data.isLive, true);
    assert.equal(data.record_date, "2026-01-09");
    assert.equal(data.source, "https://home.treasury.gov");
    assert.deepEqual(data.yields, {
      oneMonth: 4.12,
      threeMonth: 4.23,
      twoYear: 4.31,
      tenYear: 4.56,
    });
  });

  it("chooses the latest valid Treasury CSV row regardless of response ordering", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      if (url.includes("home.treasury.gov")) {
        return new Response(
          [
            "Date,1 Mo,3 Mo,2 Yr,10 Yr",
            "01/08/2026,4.10,4.20,4.30,4.50",
            "01/09/2026,4.12,4.23,4.31,4.56",
            "01/10/2026,4.14,4.25,4.34,4.58",
          ].join("\n")
        );
      }

      return new Response("{}", { status: 500 });
    };

    const data = await fetchTreasuryData({ fetcher });
    assert.equal(data.isLive, true);
    assert.equal(data.record_date, "2026-01-10");
    assert.equal(data.source, "https://home.treasury.gov");
    assert.deepEqual(data.yields, {
      oneMonth: 4.14,
      threeMonth: 4.25,
      twoYear: 4.34,
      tenYear: 4.58,
    });
  });
  it("requests the year-scoped daily rates file, not the empty /current/all path", async () => {
    const requested: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      requested.push(url);
      if (url.includes("home.treasury.gov")) {
        return new Response(["Date,1 Mo,3 Mo,2 Yr,10 Yr", "08/21/2026,3.80,3.88,4.24,4.74"].join("\n"));
      }

      return new Response("{}", { status: 500 });
    };

    const data = await fetchTreasuryData({ fetcher });
    const treasuryUrl = requested.find((url) => url.includes("home.treasury.gov")) ?? "";
    const currentYear = new Date().getUTCFullYear();

    // /current/all answers 200 with a zero-byte body, which reads as a successful
    // fetch of nothing -- production fell through to FRED and served a snapshot
    // two months old. The year file is the same data, served normally.
    assert.ok(!treasuryUrl.includes("/current/all"), `still requesting /current/all: ${treasuryUrl}`);
    assert.ok(treasuryUrl.includes(`/${currentYear}/all`), `expected the ${currentYear} file: ${treasuryUrl}`);
    assert.equal(data.isLive, true);
    assert.equal(data.record_date, "2026-08-21");
  });

  it("falls back to the previous year's file when the current year's is empty", async () => {
    const currentYear = new Date().getUTCFullYear();
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      if (url.includes(`/${currentYear}/all`)) {
        // Early January: the new file exists but carries no sessions yet.
        return new Response("");
      }

      if (url.includes(`/${currentYear - 1}/all`)) {
        return new Response(["Date,1 Mo,3 Mo,2 Yr,10 Yr", "12/31/2025,4.02,4.11,4.20,4.51"].join("\n"));
      }

      return new Response("{}", { status: 500 });
    };

    const data = await fetchTreasuryData({ fetcher });

    assert.equal(data.isLive, true);
    assert.equal(data.record_date, "2025-12-31");
    assert.equal(data.source, "https://home.treasury.gov");
  });

  /* The client parsed FRED's CSV with its own reader, which caught "" and "." but read a
     whitespace-only field as Number(" ") = 0, a finite zero print. It reads through
     lib/fred.ts's parser now, where isMissingFredValue trims first. */
  it("reads a whitespace-only FRED field as missing, not as a zero print", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = requestUrl(input);
      const latest = url.includes("DGS10") ? " " : "4.1";
      return new Response(
        buildCsv("DGS", [
          { date: "2026-02-01", value: "4.0" },
          { date: "2026-02-02", value: latest },
        ])
      );
    };

    const data = await fetchTreasuryData({ fetcher });
    assert.equal(data.record_date, "2026-02-01", "the latest common date skips the blank ten-year field");
    assert.equal(data.yields.tenYear, 4.0);
    assert.deepEqual(
      data.oneMonthHistory?.map((point) => point.date),
      ["2026-02-01", "2026-02-02"],
      "a missing value keeps its date in the series",
    );
  });

  /* The yield-curve read goes to FRED's CSV export but stays outside lib/fred.ts's breaker:
     it has Treasury's own file and the snapshot behind it, so its failures are not FRED's
     to count, and an open breaker left by unrelated reads does not skip it. */
  it("neither counts against nor waits on the FRED circuit breaker", async () => {
    resetFredCircuitBreaker();
    try {
      await fetchTreasuryData({
        fetcher: async () => new Response("{}", { status: 503 }),
        snapshotFallback: {
          source: "snapshot",
          record_date: "2024-09-30",
          fetched_at: "2026-02-01T00:00:00Z",
          isLive: false,
          yields: { oneMonth: 5.1, twoYear: 4.7, tenYear: 4.5 },
        },
      });
      assert.equal(getFredCircuitBreakerState().consecutiveFailures, 0);

      for (let i = 0; i < 3; i += 1) {
        await assert.rejects(fetchFredCsv(async () => new Response("down", { status: 503 }), "DGS10", { backoffMs: 0 }));
      }
      assert.equal(getFredCircuitBreakerState().open, true);

      const data = await fetchTreasuryData({
        fetcher: async () => new Response(buildCsv("DGS", [{ date: "2026-02-02", value: "4.2" }])),
      });
      assert.equal(data.source, "https://fred.stlouisfed.org");
      assert.equal(data.isLive, true);
    } finally {
      resetFredCircuitBreaker();
    }
  });
});
