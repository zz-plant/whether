import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { RUNWAY_BAND_OPTIONS } from "../lib/report/operatorRunway";
import { buildRunwayConditionedNotes, resolveRunwayForNotes } from "../lib/report/runwayConditionedNotes";

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
    assert.match(notes[0].note, /With 5 months of runway/);
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

  it("branches on the runway bands' own boundaries, so a band lands on the note its label names", () => {
    /* The notes branched at 6 / 12 / 18 and the bands at 6 / 12 / 24, so
       "12–24 mo — Follow the guidance" produced "runway is not what limits you". */
    const firstNote = (band: (typeof RUNWAY_BAND_OPTIONS)[number]["key"]) => {
      const runway = resolveRunwayForNotes({ band });
      assert.ok(runway);
      return buildRunwayConditionedNotes({ regime: "VOLATILE", ...runway })[0]?.note ?? "";
    };
    assert.match(firstNote("critical"), /cash is what limits you/);
    assert.match(firstNote("tight"), /raise planning has the least slack/);
    assert.match(firstNote("balanced"), /act on the printed guidance/);
    assert.match(firstNote("abundant"), /runway is not what limits you/);
    for (const option of RUNWAY_BAND_OPTIONS) {
      const runway = resolveRunwayForNotes({ band: option.key });
      const notes = buildRunwayConditionedNotes({ regime: "DEFENSIVE", ...runway! });
      assert.ok(notes.length > 0, `band ${option.label} produces no note`);
    }
  });

  it("states a band as its range and never invents a figure or burn arithmetic for it", () => {
    const band = resolveRunwayForNotes({ band: "balanced" });
    assert.deepEqual(band, { runwayMonths: 18, runwayPhrase: "12–24 months", runwayIsExact: false });
    const notes = buildRunwayConditionedNotes({ regime: "SCARCITY", ...band!, monthlyBurnUsd: 200_000 });
    const text = notes.map((note) => note.note).join(" ");
    assert.match(text, /With 12–24 months of runway/);
    assert.doesNotMatch(text, /18 months|burn cut adds|cut adds about/);

    const critical = buildRunwayConditionedNotes({ regime: "SCARCITY", ...resolveRunwayForNotes({ band: "critical" })!, monthlyBurnUsd: 200_000 });
    assert.doesNotMatch(critical.map((note) => note.note).join(" "), /adds about/, "burn math needs a real figure");
  });

  it("prefers an entered figure over the band, and reads nothing from the default", () => {
    assert.deepEqual(resolveRunwayForNotes({ exactMonths: 14, band: "abundant" }), {
      runwayMonths: 14,
      runwayPhrase: "14 months",
      runwayIsExact: true,
    });
    assert.equal(resolveRunwayForNotes({ band: null }), null);
    assert.equal(resolveRunwayForNotes({ exactMonths: 0, band: null }), null);
  });
});
