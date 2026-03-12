import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";

const buildSeries = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    recordDate: `2026-01-${String(index + 1).padStart(2, "0")}`,
    regime: index % 2 === 0 ? "EXPANSION" : "MIXED",
    confidenceLabel: "HIGH",
    directionLabel: index % 2 === 0 ? "improving" : "deteriorating",
  }));

mock.module("../lib/report/reportData", () => ({
  loadReportDataSafe: async () => ({
    ok: true,
    data: { regimeSeries: buildSeries(60) },
    fallback: { regimeSeries: buildSeries(60) },
  }),
}));

const { GET: getCliHistoryRoute } = await import("../app/api/cli/history/route");

describe("/api/cli/history", () => {
  it("returns default history window metadata", async () => {
    const response = await getCliHistoryRoute(new Request("http://localhost/api/cli/history"));
    assert.equal(response.status, 200);

    const body = (await response.json()) as {
      history: unknown[];
      requestedWeeks: number | null;
      windowWeeks: number;
      maxWeeks: number;
      wasClamped: boolean;
    };

    assert.equal(body.requestedWeeks, null);
    assert.equal(body.windowWeeks, 12);
    assert.equal(body.maxWeeks, 52);
    assert.equal(body.wasClamped, false);
    assert.equal(body.history.length, 12);
  });

  it("accepts a valid custom history window", async () => {
    const response = await getCliHistoryRoute(new Request("http://localhost/api/cli/history?weeks=5"));
    assert.equal(response.status, 200);

    const body = (await response.json()) as { history: unknown[]; requestedWeeks: number; windowWeeks: number; wasClamped: boolean };
    assert.equal(body.requestedWeeks, 5);
    assert.equal(body.windowWeeks, 5);
    assert.equal(body.wasClamped, false);
    assert.equal(body.history.length, 5);
  });

  it("rejects invalid weeks values", async () => {
    const badValues = ["0", "-1", "foo", "1.5"];

    for (const value of badValues) {
      const response = await getCliHistoryRoute(new Request(`http://localhost/api/cli/history?weeks=${value}`));
      assert.equal(response.status, 400);
      const body = (await response.json()) as { error: string; windowWeeks: number; maxWeeks: number };
      assert.match(body.error, /Invalid weeks query param/);
      assert.equal(body.windowWeeks, 12);
      assert.equal(body.maxWeeks, 52);
    }
  });

  it("clamps weeks above the max bound", async () => {
    const response = await getCliHistoryRoute(new Request("http://localhost/api/cli/history?weeks=999"));
    assert.equal(response.status, 200);

    const body = (await response.json()) as { history: unknown[]; requestedWeeks: number; windowWeeks: number; maxWeeks: number; wasClamped: boolean };
    assert.equal(body.requestedWeeks, 999);
    assert.equal(body.windowWeeks, 52);
    assert.equal(body.maxWeeks, 52);
    assert.equal(body.wasClamped, true);
    assert.equal(body.history.length, 52);
  });
});
