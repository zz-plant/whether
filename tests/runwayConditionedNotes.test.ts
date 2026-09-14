import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildRunwayConditionedNotes } from "../lib/report/runwayConditionedNotes";

describe("runway-conditioned notes", () => {
  it("renders nothing when no runway is given", () => {
    assert.deepEqual(buildRunwayConditionedNotes({ regime: "DEFENSIVE" }), []);
    assert.deepEqual(buildRunwayConditionedNotes({ regime: "DEFENSIVE", runwayMonths: 0 }), []);
    assert.deepEqual(
      buildRunwayConditionedNotes({ regime: "DEFENSIVE", runwayMonths: Number.NaN }),
      [],
    );
  });

  it("prioritizes burn, raise, and hiring at critical runway", () => {
    const notes = buildRunwayConditionedNotes({ regime: "DEFENSIVE", runwayMonths: 5 });
    assert.deepEqual(
      notes.map((note) => note.area),
      ["burn-discipline", "capital-raising", "hiring"],
    );
    assert.match(notes[0].note, /At 5 months of runway/);
  });

  it("computes the burn-cut extension from the operator's own months", () => {
    const notes = buildRunwayConditionedNotes({
      regime: "SCARCITY",
      runwayMonths: 9,
      monthlyBurnUsd: 150_000,
    });
    const burnNote = notes.find((note) => note.area === "burn-discipline");
    assert.ok(burnNote);
    assert.match(burnNote.note, /\$150K\/month/);
    assert.match(burnNote.note, /adds about 1\.0 months of cushion/);
  });

  it("adds the favorable-window clause to the raise note only in EXPANSION", () => {
    const expansion = buildRunwayConditionedNotes({ regime: "EXPANSION", runwayMonths: 9 });
    const defensive = buildRunwayConditionedNotes({ regime: "DEFENSIVE", runwayMonths: 9 });
    const expansionRaise = expansion.find((note) => note.area === "capital-raising");
    const defensiveRaise = defensive.find((note) => note.area === "capital-raising");
    assert.ok(expansionRaise);
    assert.ok(defensiveRaise);
    assert.match(expansionRaise.note, /favorable window argues for starting it early/);
    assert.doesNotMatch(defensiveRaise.note, /favorable window/);
  });

  it("keeps adequate runway canonical: act on the call as printed", () => {
    const notes = buildRunwayConditionedNotes({ regime: "VOLATILE", runwayMonths: 14 });
    assert.equal(notes.length, 1);
    assert.match(notes[0].note, /act on the call as printed/);
    assert.doesNotMatch(notes[0].note, /pause is what protects|raise planning belongs|binding constraint/);
  });

  it("marks long runway as non-binding and preserves raise discipline in tightening regimes", () => {
    const defensive = buildRunwayConditionedNotes({ regime: "SCARCITY", runwayMonths: 24 });
    assert.match(defensive[0].note, /not this week's binding constraint/);
    assert.ok(defensive.some((note) => note.area === "capital-raising"));

    const expansion = buildRunwayConditionedNotes({ regime: "EXPANSION", runwayMonths: 24 });
    assert.ok(!expansion.some((note) => note.area === "capital-raising"));
  });

  it("caps output at three notes for one-screen discipline", () => {
    const notes = buildRunwayConditionedNotes({
      regime: "SCARCITY",
      runwayMonths: 4,
      monthlyBurnUsd: 80_000,
    });
    assert.ok(notes.length <= 3);
  });
});
