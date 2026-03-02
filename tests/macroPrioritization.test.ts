import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MacroSeriesReading } from "../lib/types";
import { buildMacroPriorityScore, rankMacroSignalsByPriority } from "../lib/macroPrioritization";

const baseSignal = (overrides: Partial<MacroSeriesReading>): MacroSeriesReading => ({
  id: "CPI_YOY",
  label: "CPI YoY",
  value: 3,
  unit: "%",
  explanation: "Inflation",
  sourceLabel: "BLS",
  sourceUrl: "https://example.com",
  formulaUrl: "https://example.com/formula",
  record_date: "2026-01-01",
  fetched_at: "2026-01-02T00:00:00.000Z",
  isLive: true,
  history: [],
  ...overrides,
});

describe("buildMacroPriorityScore", () => {
  it("returns lower recency score for older signals", () => {
    const now = Date.parse("2026-02-01T00:00:00.000Z");
    const fresh = buildMacroPriorityScore(baseSignal({ record_date: "2026-01-25" }), now);
    const stale = buildMacroPriorityScore(baseSignal({ record_date: "2025-08-01" }), now);

    assert.ok(fresh.recency > stale.recency);
    assert.ok(fresh.score > stale.score);
  });
});

describe("rankMacroSignalsByPriority", () => {
  it("sorts by impact x recency", () => {
    const now = Date.parse("2026-02-01T00:00:00.000Z");
    const ordered = rankMacroSignalsByPriority(
      [
        baseSignal({ id: "CPI_YOY", record_date: "2026-01-28" }),
        baseSignal({ id: "UNEMPLOYMENT_RATE", record_date: "2026-01-15" }),
        baseSignal({ id: "BBB_CREDIT_SPREAD", record_date: "2026-01-20" }),
        baseSignal({ id: "HY_CREDIT_SPREAD", record_date: "2026-01-16" }),
        baseSignal({ id: "VIX_INDEX", record_date: "2026-01-17" }),
      ],
      now
    );

    assert.deepEqual(ordered.map((item) => item.id), [
      "HY_CREDIT_SPREAD",
      "VIX_INDEX",
      "BBB_CREDIT_SPREAD",
      "CPI_YOY",
      "UNEMPLOYMENT_RATE",
    ]);
  });
});
