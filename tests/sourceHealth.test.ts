import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import {
  buildSourceHealthRows,
  formatSourceFreshnessLabel,
  formatSourceModeLabel,
} from "../lib/report/sourceHealth";

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
  it("groups source health by cadence and input family", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury(),
      macroSeries: [
        buildMacroSeriesReading({ id: "CPI_YOY", fetched_at: "2026-03-01T00:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "UNEMPLOYMENT_RATE", fetched_at: "2026-03-07T00:00:00.000Z", isLive: false }),
        buildMacroSeriesReading({ id: "BBB_CREDIT_SPREAD", fetched_at: "2026-03-10T09:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "HY_CREDIT_SPREAD", fetched_at: "2026-03-10T08:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "CHICAGO_FCI", fetched_at: "2026-03-10T07:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "VIX_INDEX", fetched_at: "2026-03-10T06:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "VC_FUNDING_VELOCITY", fetched_at: "2026-03-02T00:00:00.000Z", isLive: false }),
      ],
      now: new Date("2026-03-11T00:00:00.000Z"),
    });

    const treasury = rows.find((row) => row.sourceName === "Treasury");
    const marketStress = rows.find((row) => row.sourceName === "Market stress");
    const inflation = rows.find((row) => row.sourceName === "Inflation");
    const labor = rows.find((row) => row.sourceName === "Labor");
    const startup = rows.find((row) => row.sourceName === "Startup/private markets");

    assert.equal(treasury?.mode, "live");
    assert.equal(marketStress?.mode, "live");
    assert.equal(marketStress?.lastSuccessfulFetchAt, "2026-03-10T09:00:00.000Z");
    assert.equal(inflation?.mode, "live");
    assert.equal(labor?.mode, "fallback");
    assert.equal(startup?.mode, "snapshot");
    assert.equal(formatSourceModeLabel(startup?.mode ?? "fallback"), "Snapshot-backed");
    assert.equal(formatSourceFreshnessLabel(startup!), "Current · Curated snapshot");
  });

  it("marks incomplete live coverage as fallback instead of pretending the group is fully live", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury(),
      macroSeries: [
        buildMacroSeriesReading({ id: "BBB_CREDIT_SPREAD", fetched_at: "2026-03-10T09:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "HY_CREDIT_SPREAD", fetched_at: "2026-03-08T00:00:00.000Z", isLive: false }),
      ],
      now: new Date("2026-03-11T00:00:00.000Z"),
    });

    const marketStress = rows.find((row) => row.sourceName === "Market stress");

    assert.equal(marketStress?.mode, "fallback");
    assert.match(marketStress?.activeFallbackReason ?? "", /mixing live and cached values/i);
  });
});
