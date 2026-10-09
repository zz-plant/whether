import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { areaLinesFromRules, buildDecisionMovement, describeMovementCause, fitMovementHeadline } from "../lib/report/decisionMovement";
import type { RegimeKey } from "../lib/regimeEngine";
import { REGIME_ORDER } from "../lib/regimePresentation";

/*
 * What the week's move did to the decisions. The archive's w38 and w39 both printed "Pressure
 * increased by +3.0 this week. Slow new commitments until conditions stabilize." beside "freeze
 * new commitments": an invented unit, and an instruction that disagreed with the guidance under
 * it. The fixtures here are those weeks' own scores (from data/published_briefs.json) and the
 * real reading they were both measured against: Aug 31, 63 and 56.
 */
const rulesFor = (regime: RegimeKey, scores: { tightness: number; riskAppetite: number }) =>
  buildCanonicalBoundedDecisionRules({ regime, thresholds: DEFAULT_THRESHOLDS, scores });

const movement = ({
  from,
  to,
  regime,
  label = "Aug 31",
}: {
  from: { tightness: number; riskAppetite: number };
  to: { tightness: number; riskAppetite: number };
  regime: RegimeKey;
  label?: string | null;
}) =>
  buildDecisionMovement({
    scores: to,
    previous: { ...from, comparedWith: label ? { label } : null },
    thresholds: DEFAULT_THRESHOLDS,
    regime,
    areas: areaLinesFromRules(rulesFor(regime, to)),
  });

describe("buildDecisionMovement", () => {
  it("names the lines the month crossed, on the week the pause began", () => {
    // Aug 31 was 63 and 56 (Sunny); Sep 25 is 90 and 43. Both pause lines were crossed.
    const result = movement({ from: { tightness: 63, riskAppetite: 56 }, to: { tightness: 90, riskAppetite: 43 }, regime: "SCARCITY" });

    assert.ok(result);
    assert.deepEqual(result.conditions, { from: "Sunny", to: "Freezing" });
    assert.deepEqual(result.moved.map((entry) => [entry.area, entry.kind]), [
      ["hiring", "paused"],
      ["product-tempo", "paused"],
      ["capital-raising", "paused"],
      ["burn-discipline", "paused"],
      ["expansion-bets", "paused"],
    ]);
    assert.equal(
      result.sentence,
      "Since Aug 31, conditions changed from Sunny to Freezing. The pause now applies to every area, because funding pressure rose through 76 and risk appetite fell through 44.",
    );
    // A link preview and a card have room for the consequence and not the evidence.
    assert.equal(result.headline, "Since Aug 31, conditions changed from Sunny to Freezing and the pause now applies to every area.");
  });

  it("gives each area only the lines its own rule states", () => {
    const result = movement({ from: { tightness: 63, riskAppetite: 56 }, to: { tightness: 90, riskAppetite: 43 }, regime: "SCARCITY" });
    assert.ok(result);
    const byArea = new Map(result.areas.map((entry) => [entry.area, entry]));

    // Spending pauses on funding pressure alone; the roadmap on risk appetite alone.
    assert.equal(byArea.get("burn-discipline")?.text, "Pause now applies: funding pressure rose through 76.");
    assert.equal(byArea.get("product-tempo")?.text, "Pause now applies: risk appetite fell through 44.");
    assert.equal(
      byArea.get("hiring")?.text,
      "Pause now applies: funding pressure rose through 76 and risk appetite fell through 44.",
    );
  });

  it("says nothing crossed on w39: both scores were already past their pause lines", () => {
    // w38 (Sep 15) 77 and 42, then w39 (Sep 22) 85 and 39. The score rose 8 and fell 3, and no
    // area's guidance changed: exactly the week the archive told readers to slow commitments.
    const result = movement({
      from: { tightness: 77, riskAppetite: 42 },
      to: { tightness: 85, riskAppetite: 39 },
      regime: "SCARCITY",
      label: "Sep 15",
    });

    assert.ok(result);
    assert.equal(result.moved.length, 0);
    assert.equal(result.conditions, null);
    assert.equal(
      result.sentence,
      "Conditions held steady since Sep 15; no pause or resume line was crossed. The guidance stands.",
    );
    /* Each area names the side of its lines it held on: printed alone, "No line crossed" sat
       beside "Pause if Funding pressure > 76 · crossed" and read as the row contradicting itself. */
    assert.ok(result.areas.every((entry) => entry.kind === "held" && entry.text === "Pause still applies: no line crossed since Sep 15."));
    assert.equal(result.headline, result.sentence, "a week that crossed nothing has no evidence to leave out");
  });

  it("says only that nothing crossed for an area held between its lines", () => {
    // 70 and 50 sit inside every area's pause and resume lines: nothing is paused or met.
    const result = movement({ from: { tightness: 70, riskAppetite: 50 }, to: { tightness: 72, riskAppetite: 49 }, regime: "DEFENSIVE" });

    assert.ok(result);
    assert.ok(result.areas.every((entry) => entry.kind === "held" && entry.state === "hold"));
    assert.ok(result.areas.every((entry) => entry.text === "No line crossed since Aug 31."));
  });

  it("does not turn a small move across a line into a held week", () => {
    // Funding pressure 76 -> 77 is one point, and the strict pause line at 76 is crossed by it.
    const result = movement({ from: { tightness: 76, riskAppetite: 60 }, to: { tightness: 77, riskAppetite: 60 }, regime: "DEFENSIVE" });

    assert.ok(result);
    assert.deepEqual(result.moved.map((entry) => entry.area), ["hiring", "capital-raising", "burn-discipline", "expansion-bets"]);
    assert.equal(
      result.sentence,
      "Since Aug 31, the pause now applies to Hiring, Fundraising, Spending and New bets, because funding pressure rose through 76.",
    );
    // A reading that only touches the line has not crossed it.
    const touching = movement({ from: { tightness: 70, riskAppetite: 60 }, to: { tightness: 76, riskAppetite: 60 }, regime: "DEFENSIVE" });
    assert.ok(touching);
    assert.equal(touching.moved.length, 0);
  });

  it("says the state changed when no pause or resume line did", () => {
    // 68 to 72 crosses the line where conditions change (70) and neither the resume line (66) nor the pause line (76).
    const result = movement({ from: { tightness: 68, riskAppetite: 60 }, to: { tightness: 72, riskAppetite: 60 }, regime: "DEFENSIVE" });

    assert.ok(result);
    assert.deepEqual(result.conditions, { from: "Sunny", to: "Cloudy" });
    assert.equal(result.moved.length, 0);
    assert.equal(result.sentence, "Conditions changed from Sunny to Cloudy since Aug 31, but no pause or resume line was crossed.");
  });

  it("names the further line on the way out of a pause, and the ones between when it is only lifted", () => {
    // Recovery from the Sep 25 reading to 60 and 60: through the pause lines and past the resume lines.
    const recovered = movement({ from: { tightness: 90, riskAppetite: 43 }, to: { tightness: 60, riskAppetite: 60 }, regime: "EXPANSION" });
    assert.ok(recovered);
    assert.ok(recovered.moved.every((entry) => entry.kind === "resumable"));
    assert.equal(
      recovered.areas.find((entry) => entry.area === "hiring")?.text,
      "Pause lifted, resume line met: funding pressure fell through 66 and risk appetite rose through 54.",
    );
    assert.equal(
      recovered.sentence,
      "Since Aug 31, conditions changed from Freezing to Sunny. The resume line is now met for every area, because funding pressure fell through 66 and risk appetite rose through 54.",
    );

    // Back out of the pause but not to the resume line: 80 to 72 is through 76 and no further.
    const lifted = movement({ from: { tightness: 80, riskAppetite: 60 }, to: { tightness: 72, riskAppetite: 60 }, regime: "DEFENSIVE" });
    assert.ok(lifted);
    assert.deepEqual(lifted.moved.map((entry) => [entry.area, entry.kind]), [
      ["hiring", "lifted"],
      ["capital-raising", "lifted"],
      ["burn-discipline", "lifted"],
      ["expansion-bets", "lifted"],
    ]);
    assert.equal(lifted.areas.find((entry) => entry.area === "burn-discipline")?.text, "Pause lifted: funding pressure fell through 76.");
  });

  it("says when a resume line stops holding, and leaves the areas it does not touch out", () => {
    // Risk appetite 60 to 52 falls back through the resume line at 54 and stops there.
    const result = movement({ from: { tightness: 60, riskAppetite: 60 }, to: { tightness: 60, riskAppetite: 52 }, regime: "EXPANSION" });

    assert.ok(result);
    assert.deepEqual(result.moved.map((entry) => entry.area), ["hiring", "product-tempo", "capital-raising", "expansion-bets"]);
    assert.ok(result.moved.every((entry) => entry.kind === "resumeLost"));
    // Spending resumes on funding pressure alone, so a fall in risk appetite is not its news.
    assert.equal(result.areas.find((entry) => entry.area === "burn-discipline")?.kind, "held");
    assert.equal(
      result.sentence,
      "Since Aug 31, the resume line is no longer met for Hiring, Roadmap, Fundraising and New bets, because risk appetite fell through 54.",
    );
  });

  it("says nothing about the market state when the assessed state is not what the scores classify into", () => {
    // A change waiting on confirmation leaves the assessed state a step behind its own scores.
    // 63 and 56 to 90 and 43 classifies as Freezing; the assessment still says Sunny.
    const behind = movement({ from: { tightness: 63, riskAppetite: 56 }, to: { tightness: 90, riskAppetite: 43 }, regime: "EXPANSION" });

    assert.ok(behind);
    assert.equal(behind.conditions, null);
    assert.doesNotMatch(behind.sentence, /conditions changed/i);
    assert.match(behind.sentence, /^Since Aug 31, the pause now applies to every area, because /);
  });

  it("reads 'this week' where the source did not date the earlier reading", () => {
    const held = movement({
      from: { tightness: 85, riskAppetite: 39 },
      to: { tightness: 85, riskAppetite: 39 },
      regime: "SCARCITY",
      label: null,
    });
    assert.ok(held);
    assert.equal(held.comparedWith, null);
    assert.equal(held.sentence, "Conditions held steady this week; no pause or resume line was crossed. Last week's guidance stands.");

    const crossed = movement({ from: { tightness: 60, riskAppetite: 60 }, to: { tightness: 80, riskAppetite: 60 }, regime: "DEFENSIVE", label: null });
    assert.ok(crossed);
    assert.match(crossed.sentence, /^This week, conditions changed from Sunny to Cloudy\. /);
  });

  it("claims nothing without an earlier reading, or without an area that states a line", () => {
    const scores = { tightness: 90, riskAppetite: 43 };
    const areas = areaLinesFromRules(rulesFor("SCARCITY", scores));

    assert.equal(buildDecisionMovement({ scores, previous: null, thresholds: DEFAULT_THRESHOLDS, regime: "SCARCITY", areas }), null);
    assert.equal(
      buildDecisionMovement({ scores, previous: { tightness: 63, riskAppetite: 56 }, thresholds: DEFAULT_THRESHOLDS, regime: "SCARCITY", areas: [] }),
      null,
    );
  });

  it("does not resume an area whose rule states no numeric resume line", () => {
    const scores = { tightness: 60, riskAppetite: 60 };
    const [hiring] = areaLinesFromRules(rulesFor("EXPANSION", scores));
    assert.ok(hiring);
    const result = buildDecisionMovement({
      scores,
      previous: { tightness: 90, riskAppetite: 60 },
      thresholds: DEFAULT_THRESHOLDS,
      regime: "EXPANSION",
      areas: [{ area: hiring.area, pause: hiring.pause, resume: [] }],
    });

    assert.ok(result);
    assert.equal(result.areas[0]?.kind, "lifted");
    assert.equal(result.areas[0]?.state, "hold");
  });
});

/*
 * The share card's "What changed" box holds 140 characters. The reading of Oct 1 (90 and 44,
 * against Aug 31's 63 and 56) changed conditions and moved areas two ways, and its headline
 * ran to 174: the card printed "…Spending and New bets; the…".
 */
describe("fitMovementHeadline", () => {
  it("fits the card whole on the week conditions changed and areas moved two ways", () => {
    const result = movement({ from: { tightness: 63, riskAppetite: 56 }, to: { tightness: 90, riskAppetite: 44 }, regime: "SCARCITY" });
    assert.ok(result);
    assert.equal(
      result.headline,
      "Since Aug 31, conditions changed from Sunny to Freezing and the pause now applies to Hiring, Fundraising, Spending and New bets; the resume line is no longer met for Roadmap.",
    );

    // The card prints the conditions now in its own label, so that clause goes first.
    assert.equal(
      fitMovementHeadline(result, 140),
      "Since Aug 31, the pause now applies to Hiring, Fundraising, Spending and New bets; the resume line is no longer met for Roadmap.",
    );
    // Then the areas go to a count, still a whole sentence.
    assert.equal(
      fitMovementHeadline(result, 110),
      "Since Aug 31, conditions changed from Sunny to Freezing and every area crossed a pause or resume line.",
    );
    // Room for all of it, all of it.
    assert.equal(fitMovementHeadline(result, 210), result.headline);
  });

  it("fits every reading in a card's box as a whole sentence", () => {
    const steps = [0, 20, 40, 44, 50, 54, 60, 70, 76, 80, 100];
    const readings = steps.flatMap((tightness) => steps.map((riskAppetite) => ({ tightness, riskAppetite })));
    let checked = 0;

    for (const regime of REGIME_ORDER) {
      for (const from of readings) {
        for (const to of [readings[0], readings[60], readings[120]]) {
          if (!to) continue;
          for (const label of ["Aug 31", null]) {
            const result = movement({ from, to, regime, label });
            if (!result) continue;
            const fitted = fitMovementHeadline(result, 140);
            assert.ok(fitted.length <= 140, `${fitted.length} characters: ${fitted}`);
            assert.match(fitted, /\.$/, `not a whole sentence: ${fitted}`);
            assert.ok(result.headlines.includes(fitted));
            assert.equal(result.headlines[0], result.headline);
            checked += 1;
          }
        }
      }
    }

    assert.ok(checked > 1000);
  });
});

/* The homepage verdict's one line on why (site review, 2026-10-09): the lines the
   scores crossed, never the consequences, which "What changed this week" states. */
describe("describeMovementCause", () => {
  it("names the crossings, and only the crossings", () => {
    const moved = movement({ from: { tightness: 63, riskAppetite: 56 }, to: { tightness: 90, riskAppetite: 43 }, regime: "SCARCITY" });
    assert.ok(moved);
    const cause = describeMovementCause(moved);
    assert.match(cause, /^Funding pressure rose through \d+/);
    assert.match(cause, /risk appetite fell through \d+\.$/);
    assert.doesNotMatch(cause, /Pause now applies|Resume line/);
  });

  it("says no line was crossed, dated by the comparison, on a week that held", () => {
    const held = movement({ from: { tightness: 90, riskAppetite: 43 }, to: { tightness: 90, riskAppetite: 43 }, regime: "SCARCITY" });
    assert.ok(held);
    assert.equal(describeMovementCause(held), "No score crossed a pause or resume line since Aug 31.");
  });
});
