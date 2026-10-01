import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { TRACK_RECORD_MIN_MONTHS, buildTrackRecord } from "../lib/report/trackRecord";
import type { TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";

const entry = (
  recordDate: string,
  regime: TimeMachineRegimeEntry["regime"],
  tightness = 40,
  riskAppetite = 60,
): TimeMachineRegimeEntry => {
  const [year, month] = recordDate.split("-").map(Number);
  return { year, month, recordDate, regime, summary: "", tightness, riskAppetite };
};

const series = (regimes: TimeMachineRegimeEntry["regime"][]) =>
  regimes.map((regime, index) => entry(`2026-${String(index + 1).padStart(2, "0")}-28`, regime));

describe("track record", () => {
  it("counts the months a pause or resume line was crossed, which the conditions alone undercount", () => {
    /* One regime throughout, so `regimeChanges` is 0, while risk appetite walks
       through the 54 resume line (month 2), back under it (month 4), and through
       the 44 pause line (month 5). Funding pressure stays between 66 and 76,
       where neither of its lines holds. A move that stays above the line
       (month 3) is not a crossing. */
    const months = [52, 56, 55, 50, 40, 40].map((riskAppetite, index) =>
      entry(`2026-${String(index + 1).padStart(2, "0")}-28`, "EXPANSION", 68, riskAppetite),
    );
    const record = buildTrackRecord(months);

    assert.equal(record?.regimeChanges, 0);
    assert.equal(record?.lineCrossingMonths, 3);
  });

  it("withholds the record while the window is too short to characterize", () => {
    assert.equal(buildTrackRecord(series(Array(TRACK_RECORD_MIN_MONTHS - 1).fill("EXPANSION"))), null);
    assert.ok(buildTrackRecord(series(Array(TRACK_RECORD_MIN_MONTHS).fill("EXPANSION"))));
  });

  it("counts how long the current call has stood", () => {
    const record = buildTrackRecord(series([
      "SCARCITY", "SCARCITY", "DEFENSIVE", "EXPANSION", "EXPANSION", "EXPANSION", "EXPANSION",
    ]));

    assert.equal(record?.currentHoldMonths, 4);
    assert.equal(record?.currentRegime, "EXPANSION");
  });

  it("counts every regime change across the window, not just the last one", () => {
    const record = buildTrackRecord(series([
      "SCARCITY", "DEFENSIVE", "DEFENSIVE", "VOLATILE", "EXPANSION", "EXPANSION",
    ]));

    assert.equal(record?.regimeChanges, 3);
    assert.equal(record?.monthsCovered, 6);
  });

  it("holds at one month when the regime changed on the latest reading", () => {
    const record = buildTrackRecord(series([
      "EXPANSION", "EXPANSION", "EXPANSION", "EXPANSION", "EXPANSION", "SCARCITY",
    ]));

    assert.equal(record?.currentHoldMonths, 1);
    assert.equal(record?.rows[0].changed, true);
  });

  it("orders rows newest first and leaves the oldest delta unclaimed", () => {
    const record = buildTrackRecord(series(Array(8).fill("EXPANSION")), 8);

    assert.equal(record?.rows.length, 8);
    assert.equal(record?.rows[0].recordDate, "2026-08-28");
    assert.equal(record?.rows.at(-1)?.boldnessDelta, null);
  });

  it("tracks boldness movement between adjacent months", () => {
    const record = buildTrackRecord([
      entry("2026-01-31", "EXPANSION", 50, 50),
      entry("2026-02-28", "EXPANSION", 50, 50),
      entry("2026-03-31", "EXPANSION", 50, 50),
      entry("2026-04-30", "EXPANSION", 50, 50),
      entry("2026-05-31", "EXPANSION", 50, 50),
      entry("2026-06-30", "EXPANSION", 50, 60),
    ]);

    // Boldness weights risk appetite at 0.7, so +10 of appetite is +7 of boldness.
    assert.equal(record?.rows[0].boldnessDelta, 7);
  });

  it("sorts an out-of-order series before reading a streak off it", () => {
    const unordered = [
      entry("2026-06-30", "EXPANSION"),
      entry("2026-01-31", "SCARCITY"),
      entry("2026-04-30", "EXPANSION"),
      entry("2026-02-28", "SCARCITY"),
      entry("2026-05-31", "EXPANSION"),
      entry("2026-03-31", "EXPANSION"),
    ];

    const record = buildTrackRecord(unordered);
    assert.equal(record?.currentHoldMonths, 4);
    assert.equal(record?.regimeChanges, 1);
    assert.equal(record?.firstRecordDate, "2026-01-31");
    assert.equal(record?.latestRecordDate, "2026-06-30");
  });
});

describe("current hold start date", () => {
  it("names the month the current call began, independent of the row cap", () => {
    // Ten months of one regime with a two-row window: the streak start is older
    // than anything `rows` carries, so it cannot be read off the rows.
    const record = buildTrackRecord(series(Array(10).fill("EXPANSION")), 2);

    assert.equal(record?.currentHoldMonths, 10);
    assert.equal(record?.rows.length, 2);
    assert.equal(record?.currentHoldStartDate, "2026-01-28");
  });

  it("points at the latest month when the regime just changed", () => {
    const record = buildTrackRecord(series([
      "EXPANSION", "EXPANSION", "EXPANSION", "EXPANSION", "EXPANSION", "SCARCITY",
    ]));

    assert.equal(record?.currentHoldStartDate, "2026-06-28");
    assert.equal(record?.currentHoldStartDate, record?.latestRecordDate);
  });
});
