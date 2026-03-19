import assert from "node:assert/strict";
import { describe, it } from "node:test";
import currentMacroSnapshot from "../data/macro_snapshot.json";
import { buildMacroFallbackPayload, mergeLatestHistoryPoint } from "../scripts/refreshFallbackSnapshots";

describe("refreshFallbackSnapshots", () => {
  it("appends the refreshed point to existing history while preserving window length", () => {
    const previousHistory = [
      { date: "2025-11-01", value: 18.1 },
      { date: "2025-12-01", value: 17.8 },
      { date: "2026-01-01", value: 16.5 },
    ];

    assert.deepEqual(
      mergeLatestHistoryPoint({
        history: previousHistory,
        recordDate: "2026-02-01",
        value: 22.4,
      }),
      [
        { date: "2025-12-01", value: 17.8 },
        { date: "2026-01-01", value: 16.5 },
        { date: "2026-02-01", value: 22.4 },
      ],
    );
  });

  it("replaces an existing point when the refreshed record date is already present", () => {
    assert.deepEqual(
      mergeLatestHistoryPoint({
        history: [
          { date: "2025-12-01", value: 17.8 },
          { date: "2026-01-01", value: 16.5 },
          { date: "2026-02-01", value: 18.9 },
        ],
        recordDate: "2026-02-01",
        value: 22.4,
      }),
      [
        { date: "2025-12-01", value: 17.8 },
        { date: "2026-01-01", value: 16.5 },
        { date: "2026-02-01", value: 22.4 },
      ],
    );
  });

  it("writes refreshed live series with aligned history into the fallback payload", () => {
    const previousPayload = structuredClone(currentMacroSnapshot);
    const priorVix = previousPayload.series.find((series) => series.id === "VIX_INDEX");

    if (!priorVix?.history?.length) {
      throw new Error("Expected VIX snapshot history in fixture");
    }

    const refreshedPayload = buildMacroFallbackPayload(previousPayload, previousPayload.series.map((series) => (
      series.id === "VIX_INDEX"
        ? {
            ...series,
            value: 25.09,
            record_date: "2026-03-18",
            fetched_at: "2026-03-19T00:00:00.000Z",
            isLive: true,
          }
        : {
            ...series,
            fetched_at: "2026-03-19T00:00:00.000Z",
            isLive: false,
          }
    )));

    const refreshedVix = refreshedPayload.series.find((series) => series.id === "VIX_INDEX");
    if (!refreshedVix?.history?.length) {
      throw new Error("Expected refreshed VIX history");
    }

    assert.equal(refreshedVix.history.at(-1)?.date, "2026-03-18");
    assert.equal(refreshedVix.history.at(-1)?.value, 25.09);
    assert.equal(refreshedVix.history.length, priorVix.history.length);
    assert.equal(refreshedVix.isLive, false);
  });
});
