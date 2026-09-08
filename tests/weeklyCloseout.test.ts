import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  countClosedWeeks,
  formatDriftLabel,
  reopenCloseout,
  selectPreviousCloseout,
  type CloseoutStore,
} from "../lib/report/weeklyCloseout";

const record = (recordDate: string, closedAt: string, changed: string[], watching: string[] = []) => ({
  recordDate,
  closedAt,
  changed,
  watching,
  conditions: { tightness: 55, riskAppetite: 60 },
});

const store: CloseoutStore = {
  "2026-08-24": record("2026-08-24", "2026-08-24T10:00:00Z", ["Hiring"]),
  "2026-08-31": record("2026-08-31", "2026-08-31T10:00:00Z", ["Hiring", "Burn discipline"], [
    "Funding pressure < 66",
  ]),
};

describe("weekly closeout", () => {
  it("reopens the most recent earlier record, not the current week's", () => {
    const withCurrent: CloseoutStore = {
      ...store,
      "2026-09-07": record("2026-09-07", "2026-09-07T10:00:00Z", ["Expansion bets"]),
    };
    assert.equal(selectPreviousCloseout(withCurrent, "2026-09-07")?.recordDate, "2026-08-31");
  });

  it("returns nothing when this is the first week closed", () => {
    assert.equal(selectPreviousCloseout({}, "2026-09-07"), null);
    assert.equal(
      reopenCloseout({ record: null, revisitAreas: ["Hiring"], conditions: undefined }),
      null,
    );
  });

  it("separates decisions the week queued again from ones that held", () => {
    // The point of the record: an area changed last week and queued again is a
    // decision that is not holding, and a weekly ritual is the only place that
    // shows up.
    const reopened = reopenCloseout({
      record: store["2026-08-31"],
      revisitAreas: ["Hiring", "Capital raising"],
      conditions: { tightness: 64, riskAppetite: 57 },
    });

    assert.ok(reopened);
    assert.deepEqual(reopened.flaggedAgain, ["Hiring"]);
    assert.deepEqual(reopened.settled, ["Burn discipline"]);
  });

  it("reports how far conditions moved since the record was written", () => {
    const reopened = reopenCloseout({
      record: store["2026-08-31"],
      revisitAreas: [],
      conditions: { tightness: 64, riskAppetite: 57 },
    });

    assert.deepEqual(reopened?.drift, [
      { label: "Funding pressure", delta: 9 },
      { label: "Risk appetite", delta: -3 },
    ]);
    assert.equal(
      formatDriftLabel({ label: "Funding pressure", delta: 9 }),
      "Funding pressure +9.0 since",
    );
    assert.equal(
      formatDriftLabel({ label: "Risk appetite", delta: -3 }),
      "Risk appetite −3.0 since",
    );
  });

  it("omits a condition that has not moved rather than reporting a zero", () => {
    const reopened = reopenCloseout({
      record: store["2026-08-31"],
      revisitAreas: [],
      conditions: { tightness: 55, riskAppetite: 57 },
    });
    assert.deepEqual(reopened?.drift, [{ label: "Risk appetite", delta: -3 }]);
  });

  it("reports no drift when the record predates stored conditions", () => {
    const legacy = { recordDate: "2026-08-31", closedAt: "2026-08-31T10:00:00Z", changed: [], watching: [] };
    const reopened = reopenCloseout({
      record: legacy,
      revisitAreas: [],
      conditions: { tightness: 64 },
    });
    assert.deepEqual(reopened?.drift, []);
  });

  it("counts coverage over the given weeks, not a streak", () => {
    // A streak breaks on one missed week and then measures nothing. Coverage
    // over a fixed window keeps meaning something after a holiday.
    assert.equal(countClosedWeeks(store, ["2026-08-17", "2026-08-24", "2026-08-31"]), 2);
    assert.equal(countClosedWeeks(store, []), 0);
  });
});
