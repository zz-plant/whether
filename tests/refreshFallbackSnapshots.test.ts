import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import currentMacroSnapshot from "../data/macro_snapshot.json";
import type { loadMacroSeries } from "../lib/macroSnapshot";
import type { MacroSeriesId, MacroSeriesReading } from "../lib/types";
import {
  buildMacroFallbackPayload,
  mergeLatestHistoryPoint,
  summarizeCarriedForward,
} from "../scripts/refreshFallbackSnapshots";

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

    const refreshedSeries: Awaited<ReturnType<typeof loadMacroSeries>> = previousPayload.series.map((series): MacroSeriesReading => (
      series.id === "VIX_INDEX"
        ? {
            ...series,
            id: series.id as MacroSeriesId,
            value: 25.09,
            record_date: "2026-03-18",
            fetched_at: "2026-03-19T00:00:00.000Z",
            isLive: true,
          } as MacroSeriesReading
        : {
            ...series,
            id: series.id as MacroSeriesId,
            fetched_at: "2026-03-19T00:00:00.000Z",
            isLive: false,
          } as MacroSeriesReading
    ));
    const refreshedPayload = buildMacroFallbackPayload(previousPayload, refreshedSeries);

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

describe("summarizeCarriedForward", () => {
  const now = new Date("2026-08-22T16:00:00.000Z");

  const LIVE_CAPABLE = [
    "CPI_YOY",
    "UNEMPLOYMENT_RATE",
    "BBB_CREDIT_SPREAD",
    "HY_CREDIT_SPREAD",
    "CHICAGO_FCI",
    "VIX_INDEX",
  ];

  const CURATED = [
    "AI_COMPUTE_COST_TREND",
    "EARNINGS_REVISION_INDEX",
    "REGULATORY_RISK_TRACKER",
    "SAAS_VALUATION_MULTIPLE",
    "TECH_LAYOFF_TREND",
    "VC_FUNDING_VELOCITY",
  ];

  const asRefreshed = (liveIds: string[]) =>
    currentMacroSnapshot.series.map((series) => ({
      id: series.id,
      isLive: liveIds.includes(series.id),
    }));

  // Running this script is the obvious response to a stale-source warning. It reports the file
  // as updated with a fresh top-level fetched_at whether or not the stale series moved, so the
  // ones it could not touch have to be named or the run reads as a fix that did not happen.
  it("names every series the run could not refresh", () => {
    const carried = summarizeCarriedForward(currentMacroSnapshot, asRefreshed(LIVE_CAPABLE), now);

    assert.deepEqual(carried.map((entry) => entry.id).sort(), [...CURATED].sort());
  });

  it("reports how old the carried-forward timestamps are, not just that they exist", () => {
    const carried = summarizeCarriedForward(currentMacroSnapshot, asRefreshed(LIVE_CAPABLE), now);

    for (const entry of carried) {
      assert.ok(entry.fetchedAt, `${entry.id} should carry a timestamp`);
      assert.match(entry.age ?? "", /^\d+(d|mo)$/, `${entry.id} should report a day/month age`);
    }
  });

  it("reports nothing when every series refreshed live", () => {
    const carried = summarizeCarriedForward(
      currentMacroSnapshot,
      asRefreshed([...LIVE_CAPABLE, ...CURATED]),
      now,
    );

    assert.deepEqual(carried, []);
  });
});
