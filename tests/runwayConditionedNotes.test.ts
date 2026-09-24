import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCommitmentImpact,
  buildRunwayConditionedNotes,
} from "../lib/report/runwayConditionedNotes";
import { RUNWAY_BAND_OPTIONS, runwayBandForMonths } from "../lib/report/operatorRunway";

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
    assert.match(expansionRaise.note, /favorable window widens it/);
    assert.doesNotMatch(defensiveRaise.note, /favorable window/);
  });

  it("keeps adequate runway canonical: act on the printed guidance", () => {
    const notes = buildRunwayConditionedNotes({ regime: "VOLATILE", runwayMonths: 14 });
    assert.equal(notes.length, 1);
    assert.match(notes[0].note, /act on the printed guidance/);
    assert.doesNotMatch(notes[0].note, /pause is what protects|raise planning belongs|binding constraint/);
  });

  it("marks long runway as non-binding and preserves raise discipline in tightening regimes", () => {
    const defensive = buildRunwayConditionedNotes({ regime: "SCARCITY", runwayMonths: 24 });
    assert.match(defensive[0].note, /not what limits you this week/);
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

  it("states consequences only: no directives and no alternate re-open conditions", () => {
    // The CR contract: notes add the operator's cash position, not a second
    // corridor. A note that directs ("check it first") or conditions ("until
    // runway clears a year") replaces canonical action/threshold semantics.
    const directivePatterns =
      /act on first|check it first|belongs on|until runway clears|keep raise discipline|spend attention|is the window to spend/i;
    for (const regime of ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const) {
      for (const runwayMonths of [4, 9, 14, 24]) {
        const notes = buildRunwayConditionedNotes({
          regime,
          runwayMonths,
          monthlyBurnUsd: 100_000,
        });
        for (const note of notes) {
          assert.doesNotMatch(
            note.note,
            directivePatterns,
            `${regime} @ ${runwayMonths}mo (${note.area}) directs instead of explaining: ${note.note}`,
          );
        }
      }
    }
  });

  it("bands on the same ladder as the runway selector and the server", () => {
    // One ladder: the note a figure gets is the note for the band the selector
    // and the rules put it in. This module used to split at 18 months where
    // the selector splits at 24, so 20 months read two different ways.
    for (const option of RUNWAY_BAND_OPTIONS) {
      const notes = buildRunwayConditionedNotes({ regime: "DEFENSIVE", runwayMonths: option.months });
      assert.ok(notes.length > 0, `band "${option.label}" produces no note`);
    }
    const at = (months: number) =>
      buildRunwayConditionedNotes({ regime: "DEFENSIVE", runwayMonths: months }).find((note) => note.area === "burn-discipline")?.note ?? "";
    assert.match(at(20), /act on the printed guidance/);
    assert.equal(runwayBandForMonths(20), "balanced");
    assert.match(at(24), /runway is not what limits you/);
    assert.equal(runwayBandForMonths(24), "abundant");
  });
});

describe("buildCommitmentImpact", () => {
  it("holds cash constant: runway after is runway times burn over burn plus cost", () => {
    const impact = buildCommitmentImpact({
      regime: "SCARCITY", area: "hiring", runwayMonths: 13, monthlyBurnUsd: 250_000, newMonthlyCostUsd: 40_000,
    });
    assert.ok(impact);
    assert.equal(impact.runwayAfter, 11.2);
    assert.deepEqual(impact.bandChange, { from: "12–24 mo", to: "6–12 mo" });
    assert.match(impact.summary, /from 13 to 11\.2 months/);
  });

  it("quotes the note the guidance already carries at the runway after, for that area", () => {
    const impact = buildCommitmentImpact({
      regime: "SCARCITY", area: "hiring", runwayMonths: 13, monthlyBurnUsd: 250_000, newMonthlyCostUsd: 40_000,
    });
    const expected = buildRunwayConditionedNotes({ regime: "SCARCITY", runwayMonths: 11.2, monthlyBurnUsd: 290_000 })
      .find((note) => note.area === "hiring")?.note;
    assert.equal(impact?.noteAfter, expected);
  });

  it("names no band change when the runway stays in its band", () => {
    const impact = buildCommitmentImpact({
      regime: "EXPANSION", area: "burn-discipline", runwayMonths: 30, monthlyBurnUsd: 100_000, newMonthlyCostUsd: 10_000,
    });
    assert.equal(impact?.bandChange, null);
    assert.doesNotMatch(impact?.summary ?? "", /moves you/);
  });

  it("returns nothing rather than a guess when a figure is missing or not positive", () => {
    assert.equal(buildCommitmentImpact({ regime: "SCARCITY", area: "hiring", runwayMonths: 13, monthlyBurnUsd: 250_000 }), null);
    assert.equal(buildCommitmentImpact({ regime: "SCARCITY", area: "hiring", runwayMonths: 0, monthlyBurnUsd: 250_000, newMonthlyCostUsd: 1 }), null);
    assert.equal(buildCommitmentImpact({ regime: "SCARCITY", area: "hiring", runwayMonths: 13, monthlyBurnUsd: Number.NaN, newMonthlyCostUsd: 1 }), null);
  });
});
