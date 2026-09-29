import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { runAgentTool } from "../lib/agent/tools";
import { projectRegimeFromPace } from "../lib/report/regimeContext";

/*
 * `get_projection` with no arguments asks the question an agent asks most: "if the current trend
 * continues, when do conditions change?" The function behind it (`getRegimeProjection`) divided the
 * nearest line's distance by the fastest pace whichever way either score was moving, so on the Sep 25
 * read (funding pressure 90 rising, risk appetite 43 falling: both deeper into the regime) it said a
 * crossing was possible within a week and named the regime the scores were already in.
 * `projectRegimeFromPace` steps the scores by their pace and asks the engine's own quadrant table
 * where they land.
 */
describe("projectRegimeFromPace", () => {
  const project = (tightness: number, riskAppetite: number, tightnessPerWeek: number, riskAppetitePerWeek: number) =>
    projectRegimeFromPace({ tightness, riskAppetite, tightnessPerWeek, riskAppetitePerWeek });

  it("does not cross a line the scores are moving away from", () => {
    const deeper = project(90, 43, 7.6, -3.6);

    assert.equal(deeper.sitsIn, "SCARCITY");
    assert.equal(deeper.weeksToFlip, null);
    assert.equal(deeper.projectedRegime, null);
    assert.equal(deeper.velocityLabel, "Moving away from the lines — no change in conditions expected soon.");
  });

  it("names the week and the regime when a score is closing on its line", () => {
    // Funding pressure falls through 70 in the second week: SCARCITY becomes VOLATILE.
    const tightnessFirst = project(74, 40, -3, 0.5);
    assert.deepEqual(
      { weeks: tightnessFirst.weeksToFlip, regime: tightnessFirst.projectedRegime, label: tightnessFirst.velocityLabel },
      { weeks: 2, regime: "VOLATILE", label: "At current pace, threshold crossing possible within 2 weeks." },
    );

    // Risk appetite rises through 50 first: SCARCITY becomes DEFENSIVE.
    const riskFirst = project(90, 48, 0.2, 1.5);
    assert.equal(riskFirst.weeksToFlip, 2);
    assert.equal(riskFirst.projectedRegime, "DEFENSIVE");

    // One week, singular.
    assert.equal(project(72, 40, -3, 0).velocityLabel, "At current pace, threshold crossing possible within 1 week.");
  });

  it("follows both scores across their lines together, from any regime", () => {
    // Both cross in the same week: SCARCITY -> EXPANSION.
    assert.equal(project(72, 48, -3, 3).projectedRegime, "EXPANSION");
    // EXPANSION, funding pressure rising through 70 while risk appetite stays above 50: DEFENSIVE.
    const expansion = project(60, 60, 4, -3);
    assert.equal(expansion.sitsIn, "EXPANSION");
    assert.equal(expansion.weeksToFlip, 3);
    assert.equal(expansion.projectedRegime, "DEFENSIVE");
  });

  it("says stable, slow and slow-trend in the words it always did", () => {
    assert.equal(project(90, 43, 0, 0).velocityLabel, "Stable — no significant movement.");
    assert.equal(project(90, 43, 0.2, -0.1).velocityLabel, "Slow movement — no change in conditions expected soon.");
    // Closing, but not within four weeks.
    const distant = project(95, 10, -1, 1);
    assert.equal(distant.weeksToFlip, null);
    assert.equal(distant.velocityLabel, "Slow trend — no change in conditions expected soon.");
  });
});

describe("get_projection", () => {
  it("with nothing given, projects today's scores at today's pace without inventing a crossing", async () => {
    const projection = await runAgentTool("get_projection", {}, "http");

    // Whatever week the fixture is, a score cannot cross a line it is moving away from.
    const inputs = projection.inputs;
    assert.ok(inputs && typeof inputs === "object" && "tightnessDelta" in inputs);
    if (projection.weeksToFlip !== null) {
      assert.ok(typeof projection.projectedRegime === "string" && projection.projectedRegime.length > 0);
    }
    assert.match(String(projection.velocityLabel), /Stable|Slow|Moving away|At current pace/);
  });

  it("says when the scores sit in another regime than the one given, and projects from the scores", async () => {
    const projection = await runAgentTool("get_projection", { regime: "sunny", tightness: 90, riskAppetite: 43, tightnessDelta: 0, riskAppetiteDelta: 0 }, "http");

    assert.match(String(projection.note), /These scores sit in SCARCITY, not EXPANSION/);
    assert.equal(projection.velocityLabel, "Stable — no significant movement.");

    const matching = await runAgentTool("get_projection", { regime: "scarcity", tightness: 90, riskAppetite: 43, tightnessDelta: -5 }, "http");
    assert.ok(!("note" in matching), "no note when the regime is the scores' own");
    assert.equal(matching.weeksToFlip, 4);
    assert.equal(matching.projectedRegime, "VOLATILE");
  });
});
