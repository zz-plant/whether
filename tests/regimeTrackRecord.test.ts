import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { buildRegimeTrackRecord } from "../lib/summary/regimeTrackRecord";

/* Thresholds mirror the engine defaults: tightness line 70, risk-appetite line 50,
   near band 5. Observations are handwritten so every expected number is checkable
   by eye — the grading itself must never be model output. */
const obs = (recordDate: string, regime: string, tightness: number, riskAppetite: number) => ({
  recordDate,
  regime,
  tightness,
  riskAppetite,
});

describe("regime track record", () => {
  it("grades a walk into the near band as signaled with the right lead", () => {
    const record = buildRegimeTrackRecord([
      obs("2026-01-31", "EXPANSION", 60, 62),
      obs("2026-02-28", "EXPANSION", 66, 61), // in band (|66-70| ≤ 5), old side
      obs("2026-03-31", "EXPANSION", 68, 60), // in band
      obs("2026-04-30", "DEFENSIVE", 73, 58), // crosses the tightness line
    ]);

    assert.equal(record.transitions.length, 1);
    const [transition] = record.transitions;
    assert.deepEqual(transition.flippedAxes, ["tightness"]);
    assert.equal(transition.leadMonths, 2);
    assert.equal(transition.signaled, true);
    assert.equal(record.signaledCount, 1);
  });

  it("grades a jump from far outside the band as unsignaled", () => {
    const record = buildRegimeTrackRecord([
      obs("2026-01-31", "EXPANSION", 50, 60),
      obs("2026-02-28", "EXPANSION", 52, 61),
      obs("2026-03-31", "DEFENSIVE", 80, 58),
    ]);

    assert.equal(record.transitions.length, 1);
    assert.equal(record.transitions[0].leadMonths, 0);
    assert.equal(record.transitions[0].signaled, false);
  });

  it("detects which axis flipped, including the risk-appetite line", () => {
    const record = buildRegimeTrackRecord([
      obs("2026-01-31", "EXPANSION", 40, 60),
      obs("2026-02-28", "VOLATILE", 41, 46), // riskAppetite crosses 50 downward
    ]);

    assert.deepEqual(record.transitions[0].flippedAxes, ["riskAppetite"]);
  });

  it("counts one-month spells as whipsaws and keeps the ongoing spell out of stats", () => {
    const record = buildRegimeTrackRecord([
      obs("2026-01-31", "EXPANSION", 60, 60),
      obs("2026-02-28", "EXPANSION", 61, 61),
      obs("2026-03-31", "DEFENSIVE", 72, 58), // one-month spell
      obs("2026-04-30", "EXPANSION", 60, 62), // ongoing
    ]);

    assert.equal(record.whipsawCount, 1);
    assert.equal(record.medianHoldMonths, 1.5); // completed spells: 2 and 1
    const ongoing = record.spells[record.spells.length - 1];
    assert.equal(ongoing.completed, false);
  });

  it("handles a window with no transitions honestly", () => {
    const record = buildRegimeTrackRecord([
      obs("2026-01-31", "EXPANSION", 60, 60),
      obs("2026-02-28", "EXPANSION", 61, 61),
    ]);

    assert.equal(record.transitions.length, 0);
    assert.equal(record.medianHoldMonths, null);
    assert.equal(record.spells.length, 1);
    assert.equal(record.spells[0].months, 2);
  });

  it("lead counting stops at the previous regime boundary", () => {
    /* The band months belong to a different prior regime, so they must not count. */
    const record = buildRegimeTrackRecord([
      obs("2026-01-31", "VOLATILE", 68, 45), // in band for tightness, but VOLATILE
      obs("2026-02-28", "EXPANSION", 66, 60), // EXPANSION spell starts, in band
      obs("2026-03-31", "DEFENSIVE", 74, 58),
    ]);

    const transition = record.transitions.find((entry) => entry.to === "DEFENSIVE");
    assert.ok(transition);
    assert.equal(transition.leadMonths, 1);
  });
});
