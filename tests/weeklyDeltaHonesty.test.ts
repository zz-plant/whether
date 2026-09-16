import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { computeDiagnostics } from "../lib/regimeEngineDiagnostics";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
import { buildWeeklyEmailReadings, readingsText } from "../lib/email/sendWeeklyBrief";

/*
 * Three artifacts published a distance as a weekly move.
 *
 * `RegimeDiagnostics` carried `tightnessDelta` and `riskAppetiteDelta`, and both
 * are `score - threshold`: how far the reading sits from the regime line, with
 * no previous week in the calculation at all. The weekly email, the export
 * brief, and the published brief archive each read one and printed it as "vs
 * last week" — so a week in which nothing moved still reported a move, of
 * whatever size the score happened to sit above the line.
 *
 * `getRegimeProjection` already warned callers, in a comment, not to pass these
 * where a velocity was wanted. Three call sites did it anyway, which is the
 * argument for the rename: `tightnessVsThreshold` cannot be misread the way
 * `tightnessDelta` was.
 */
describe("threshold distance is not a weekly move", () => {
  const thresholds = DEFAULT_THRESHOLDS;

  it("reports the same figure for two identical weeks, which is why it is not a delta", () => {
    const week = computeDiagnostics(79, 53, thresholds);
    const identicalWeek = computeDiagnostics(79, 53, thresholds);

    assert.equal(week.tightnessVsThreshold, identicalWeek.tightnessVsThreshold);
    assert.notEqual(week.tightnessVsThreshold, 0, "a genuine week-over-week delta would be 0 here");
    assert.equal(week.tightnessVsThreshold, 79 - thresholds.tightnessRegime);
    assert.equal(week.riskAppetiteVsThreshold, 53 - thresholds.riskAppetiteRegime);
  });

  it("names the fields for the distance they hold", () => {
    const diagnostics = computeDiagnostics(79, 53, thresholds);
    assert.ok(!("tightnessDelta" in diagnostics), "the old name invites the misreading back");
    assert.ok(!("riskAppetiteDelta" in diagnostics), "the old name invites the misreading back");
  });
});

/*
 * The email reads a snapshot that has no previous week in it, so the honest fix
 * there was the label rather than the number. The archive does have one and now
 * carries the real move; these two must not drift back together.
 */
describe("the weekly email labels what it shows", () => {
  const snapshot = {
    assessment: {
      scores: { tightness: 79, riskAppetite: 53 },
      diagnostics: computeDiagnostics(79, 53, DEFAULT_THRESHOLDS),
    },
  };

  it("carries the distance from the line, not a claim about last week", () => {
    const readings = buildWeeklyEmailReadings(snapshot);
    const funding = readings.find((reading) => reading.label === "Funding pressure");

    assert.equal(funding?.value, "79/100");
    assert.equal(funding?.distance?.label, "9 pts above the line that changes the call");
    assert.equal(funding?.distance?.worse, true, "above the funding line is the tighter side");
  });

  /*
   * The side is read off the model rather than off the sign of a formatted
   * string, because the two lines face opposite ways: 53 above a 50 risk floor
   * is the good side, and 79 above a 70 funding line is not.
   */
  it("knows which side of each line is the worse one", () => {
    const risk = buildWeeklyEmailReadings(snapshot).find((reading) => reading.label === "Risk appetite");

    assert.equal(risk?.distance?.label, "3 pts above the line that changes the call");
    assert.equal(risk?.distance?.worse, false);
  });

  it("renders the distance with a label that is true of it, in the recipient's terms", () => {
    const lines = readingsText(buildWeeklyEmailReadings(snapshot));
    const joined = lines.join(" | ");

    assert.ok(lines.includes("Funding pressure: 79/100 (9 pts above the line that changes the call)"), joined);
    assert.ok(!joined.includes("vs last week"), "the readings block claims a weekly move it cannot compute");
    assert.ok(!/regime line|threshold|delta/i.test(joined), `the readings block speaks the engine's terms: ${joined}`);
  });
});
