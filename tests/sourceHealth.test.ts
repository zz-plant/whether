import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import { buildSourceHealthRows, summarizeSourceFreshness } from "../lib/report/sourceHealth";

const buildTreasury = (overrides: Partial<TreasuryData> = {}): TreasuryData => ({
  yields: {
    oneMonth: 4.6,
    threeMonth: 4.7,
    twoYear: 4.3,
    tenYear: 4.1,
  },
  source: "US Treasury",
  record_date: "2026-03-10",
  fetched_at: "2026-03-10T00:00:00.000Z",
  isLive: true,
  ...overrides,
});

const buildMacroSeriesReading = (overrides: Partial<MacroSeriesReading>): MacroSeriesReading => ({
  id: "CPI_YOY",
  label: "CPI YoY",
  value: 2.8,
  unit: "%",
  explanation: "Consumer inflation",
  sourceLabel: "FRED",
  sourceUrl: "https://fred.stlouisfed.org/",
  formulaUrl: "https://fred.stlouisfed.org/",
  record_date: "2026-03-01",
  fetched_at: "2026-03-10T00:00:00.000Z",
  isLive: true,
  ...overrides,
});

describe("buildSourceHealthRows", () => {
  it("uses the latest parseable macro fetched_at across series", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury(),
      macroSeries: [
        buildMacroSeriesReading({ id: "CPI_YOY", fetched_at: "2026-03-01T00:00:00.000Z", isLive: false }),
        buildMacroSeriesReading({ id: "UNEMPLOYMENT_RATE", fetched_at: "not-a-date" }),
        buildMacroSeriesReading({ id: "BBB_CREDIT_SPREAD", fetched_at: "2026-03-10T09:00:00.000Z" }),
      ],
      now: new Date("2026-03-11T00:00:00.000Z"),
    });

    const macro = rows.find((row) => row.sourceName === "Macro");
    assert.ok(macro, "macro row should be present");
    assert.equal(macro.lastSuccessfulFetchAt, "2026-03-10T09:00:00.000Z");
    assert.equal(macro.freshnessStatus, "fresh");
  });


  it("summarizes oldest successful fetch and degradation across sources", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury({ fetched_at: "2026-03-11T08:00:00.000Z" }),
      macroSeries: [
        buildMacroSeriesReading({ id: "CPI_YOY", fetched_at: "2026-03-10T03:00:00.000Z", isLive: false }),
      ],
      now: new Date("2026-03-11T10:00:00.000Z"),
    });

    const summary = summarizeSourceFreshness(rows);

    assert.equal(summary.oldestSuccessfulFetchAt, "2026-03-10T03:00:00.000Z");
    assert.equal(summary.hasDegradedSources, true);
  });

});
