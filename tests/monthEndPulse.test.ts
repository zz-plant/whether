import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateMonthEndPulse } from "../lib/alert/monthEndPulse";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import type { TreasuryData } from "../lib/types";
import type { MonthlyRegimeHistoryEntry } from "../lib/summary/monthlyRegimeHistory";

const mockTreasury = (yields: TreasuryData["yields"], recordDate: string): TreasuryData => ({
  record_date: recordDate,
  fetched_at: `${recordDate}T09:00:00Z`,
  source: "US Treasury",
  isLive: true,
  yields,
});

const history: MonthlyRegimeHistoryEntry[] = [
  { record_date: "2026-07-31", regime: "EXPANSION", tightness: 20, riskAppetite: 70 },
  { record_date: "2026-08-31", regime: "EXPANSION", tightness: 22, riskAppetite: 68 },
];

describe("evaluateMonthEndPulse", () => {
  it("fires a changed month with a headline naming the move", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury(
        { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.1 },
        "2026-09-02",
      ),
      macroSeries: [],
    });

    const verdict = evaluateMonthEndPulse({
      assessment: snapshot.assessment,
      recordDate: snapshot.recordDate,
      monthlyHistory: history,
    });

    assert.equal(verdict.monthKey, "2026-09");
    assert.equal(verdict.changed, true);
    assert.ok(verdict.headline.includes("Call moved vs last month"));
  });

  it("stays silent when the month-end reading matches the prior one", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury(
        { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.1 },
        "2026-09-02",
      ),
      macroSeries: [],
    });
    const identical: MonthlyRegimeHistoryEntry[] = [
      {
        record_date: "2026-08-31",
        regime: snapshot.assessment.regime,
        tightness: snapshot.assessment.scores.tightness,
        riskAppetite: snapshot.assessment.scores.riskAppetite,
      },
    ];

    const verdict = evaluateMonthEndPulse({
      assessment: snapshot.assessment,
      recordDate: "2026-09-02",
      monthlyHistory: identical,
    });

    assert.equal(verdict.changed, false);
    assert.match(verdict.headline, /unchanged/i);
  });

  it("cannot fire without a prior month-end to compare against", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury(
        { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.1 },
        "2026-09-02",
      ),
      macroSeries: [],
    });

    const verdict = evaluateMonthEndPulse({
      assessment: snapshot.assessment,
      recordDate: "2026-09-02",
      monthlyHistory: [],
    });

    assert.equal(verdict.changed, false);
    assert.match(verdict.headline, /No prior month-end/);
  });

  it("uses the same score-change cut as the investor update's own wording", () => {
    // A sub-0.5-point move reads "unchanged" in the investor update; the pulse
    // must not contradict it by firing on a move the block describes as unchanged.
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury(
        { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.1 },
        "2026-09-02",
      ),
      macroSeries: [],
    });
    const withinCut: MonthlyRegimeHistoryEntry[] = [
      {
        record_date: "2026-08-31",
        regime: snapshot.assessment.regime,
        tightness: snapshot.assessment.scores.tightness + 0.2,
        riskAppetite: snapshot.assessment.scores.riskAppetite - 0.2,
      },
    ];

    const verdict = evaluateMonthEndPulse({
      assessment: snapshot.assessment,
      recordDate: "2026-09-02",
      monthlyHistory: withinCut,
    });

    assert.equal(verdict.changed, false);
  });
});