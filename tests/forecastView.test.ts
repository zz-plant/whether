import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildForecastView } from "../lib/report/home/forecastView";
import type { HomeAreaLineSlot, HomeAreaRow } from "../lib/report/home/homeSectionModel";
import type { TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";

/*
 * The forecast concept (`/mockups/forecast`, 2026-11-03): impact first, grouped by cause;
 * a projection no further than the pace projection runs; the quarter as a count from the
 * record, never a probability.
 */
const slot = (overrides: Partial<HomeAreaLineSlot>): HomeAreaLineSlot => ({ line: "", distance: "", points: 10, met: false, metric: "tightness", ...overrides });
const row = (area: HomeAreaRow["area"], held: boolean): HomeAreaRow => ({
  area,
  rule: `Rule for ${area}`,
  pause: held ? slot({ met: true, value: 76, holdsAbove: true }) : slot({ points: 9, value: 44, holdsAbove: false, metric: "riskAppetite" }),
  resume: held ? slot({ points: 24, value: 66, holdsAbove: false }) : undefined,
});
const series: TimeMachineRegimeEntry[] = Array.from({ length: 40 }, (_, index) => ({
  year: 2012 + Math.floor(index / 12),
  month: (index % 12) + 1,
  recordDate: `${2012 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-28`,
  regime: index % 10 < 7 ? "DEFENSIVE" : "SCARCITY",
  summary: "",
  tightness: 60 + (index % 30),
  riskAppetite: 45 + (index % 10),
}));
const base = {
  regime: "DEFENSIVE",
  tightness: 90,
  riskAppetite: 53,
  thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
  series,
  baseRate: { held: 11, months: 11 },
  weeksSincePrevious: 4,
};

describe("the brief as a forecast", () => {
  it("groups areas that share a level and a cause, warnings first", () => {
    const view = buildForecastView({ ...base, rows: [row("product-tempo", false), row("hiring", true), row("burn-discipline", true)], previous: { tightness: 90, riskAppetite: 53 } });
    assert.equal(view.impacts.length, 2);
    assert.equal(view.impacts[0]?.level, "warning");
    assert.deepEqual(view.impacts[0]?.areas.map((entry) => entry.label), ["Hiring", "Spending"]);
    assert.equal(view.impacts[0]?.condition, "Restarts when funding pressure falls below 66.");
    assert.equal(view.impacts[1]?.level, "clear");
  });

  it("projects no further than four weeks, and counts the quarter from the record", () => {
    const view = buildForecastView({ ...base, rows: [row("hiring", true)], previous: { tightness: 90, riskAppetite: 53 } });
    assert.equal(view.periods[1]?.label, "Next 4 weeks");
    assert.equal(view.periods[1]?.basis, "If the pace holds");
    assert.match(view.periods[2]?.basis ?? "", /^Held \d+ of \d+ times from Cloudy before$/);
    assert.equal(view.likelihood, "In past months this close to a change, conditions held 11 of 11 times.");
    assert.doesNotMatch(JSON.stringify(view), /probab|chance|likely/i, "a count, never a probability");
  });

  it("says when there is no pace to project, and names the area it would change", () => {
    assert.equal(buildForecastView({ ...base, rows: [row("hiring", true)], previous: null }).next, "No earlier reading to measure a pace from.");
    const easing = buildForecastView({ ...base, tightness: 70, rows: [row("hiring", true)], previous: { tightness: 78, riskAppetite: 53 } });
    assert.match(easing.next, /^If the pace of the last 4 weeks holds, Hiring could restart in about \d+ weeks?\.$/);
  });
});

describe("the next change", () => {
  it("carries a pace no further than four weeks", () => {
    /* Risk appetite drifting down half a point a week from 53: the change line at 50 is six
       weeks out and Roadmap's pause at 44 eighteen, both past the horizon. */
    const slow = buildForecastView({ ...base, rows: [row("product-tempo", false)], previous: { tightness: 90, riskAppetite: 55 } });
    assert.equal(slow.next, "If the pace of the last 4 weeks holds, nothing changes in the next 4 weeks.");
  });
});
