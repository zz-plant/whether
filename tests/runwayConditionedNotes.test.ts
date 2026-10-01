import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { RUNWAY_BAND_OPTIONS } from "../lib/report/operatorRunway";
import {
  buildCommitmentImpact, buildRunwayConditionedNotes, describeProfileRunway, resolveRunwayForNotes } from "../lib/report/runwayConditionedNotes";
import { netMonthlyBurnUsd, resolveProfileRunway, resolveProfileRunwayMonths } from "../lib/operatorProfile";

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

  it("computes the burn-cut extension from the operator's own months, and names the dollars", () => {
    const notes = buildRunwayConditionedNotes({
      regime: "SCARCITY",
      runwayMonths: 9,
      netMonthlyBurnUsd: 150_000,
    });
    const burnNote = notes.find((note) => note.area === "burn-discipline");
    assert.ok(burnNote);
    assert.match(burnNote.note, /\$150k\/month of net burn/);
    assert.match(burnNote.note, /10% cut in net burn \(\$15k\/month\) adds about 1\.0 months of cushion/);
  });

  it("does no burn arithmetic when revenue covers spending", () => {
    const notes = buildRunwayConditionedNotes({ regime: "SCARCITY", runwayMonths: 9, netMonthlyBurnUsd: -20_000 });
    assert.doesNotMatch(notes.map((note) => note.note).join(" "), /adds about/);
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
      netMonthlyBurnUsd: 80_000,
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
          netMonthlyBurnUsd: 100_000,
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
    const notes = buildRunwayConditionedNotes({ regime: "SCARCITY", ...band!, netMonthlyBurnUsd: 200_000 });
    const text = notes.map((note) => note.note).join(" ");
    assert.match(text, /With 12–24 months of runway/);
    assert.doesNotMatch(text, /18 months|burn cut adds|cut adds about/);

    const critical = buildRunwayConditionedNotes({ regime: "SCARCITY", ...resolveRunwayForNotes({ band: "critical" })!, netMonthlyBurnUsd: 200_000 });
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

describe("buildCommitmentImpact", () => {
  it("holds cash constant: runway after is runway times net burn over net burn plus cost", () => {
    const impact = buildCommitmentImpact({
      regime: "SCARCITY", area: "hiring", runwayMonths: 13, netMonthlyBurnUsd: 250_000, newMonthlyCostUsd: 40_000,
    });
    assert.ok(impact);
    assert.equal(impact.runwayAfter, 11.2);
    assert.deepEqual(impact.bandChange, { from: "12–24 mo", to: "6–12 mo" });
    assert.match(impact.summary, /from 13 to 11\.2 months/);
  });

  it("counts against spend less revenue, not spend: the 2026-10-01 overstatement", () => {
    /* 12 months, $200k spend, $150k revenue: $600k of cash burning $50k a month.
       A $20k-a-month hire leaves 600 / 70 = 8.6 months. Dividing by spend, as
       the commitment test did, printed 10.9. */
    const profile = { version: 1 as const, runwayMonths: 12, monthlyBurnUsd: 200_000, monthlyRevenueUsd: 150_000 };
    const impact = buildCommitmentImpact({
      regime: "DEFENSIVE",
      area: "hiring",
      runwayMonths: resolveProfileRunwayMonths(profile),
      netMonthlyBurnUsd: netMonthlyBurnUsd(profile),
      newMonthlyCostUsd: 20_000,
    });
    assert.equal(impact?.runwayAfter, 8.6);
  });

  it("quotes the note the guidance already carries at the runway after, for that area", () => {
    const impact = buildCommitmentImpact({
      regime: "SCARCITY", area: "hiring", runwayMonths: 13, netMonthlyBurnUsd: 250_000, newMonthlyCostUsd: 40_000,
    });
    const expected = buildRunwayConditionedNotes({ regime: "SCARCITY", runwayMonths: 11.2, netMonthlyBurnUsd: 290_000 })
      .find((note) => note.area === "hiring")?.note;
    assert.equal(impact?.noteAfter, expected);
  });

  it("names no band change when the runway stays in its band", () => {
    const impact = buildCommitmentImpact({
      regime: "EXPANSION", area: "burn-discipline", runwayMonths: 30, netMonthlyBurnUsd: 100_000, newMonthlyCostUsd: 10_000,
    });
    assert.equal(impact?.bandChange, null);
    assert.doesNotMatch(impact?.summary ?? "", /moves you/);
  });

  it("answers a company whose revenue covers spending from its cash", () => {
    const covered = buildCommitmentImpact({
      regime: "VOLATILE", area: "hiring", netMonthlyBurnUsd: -30_000, cashUsd: 400_000, newMonthlyCostUsd: 20_000,
    });
    assert.equal(covered?.runwayAfter, null);
    assert.match(covered?.summary ?? "", /still covers spending at \$20k more a month: cash keeps growing, by about \$10k a month/);

    const tipped = buildCommitmentImpact({
      regime: "VOLATILE", area: "hiring", netMonthlyBurnUsd: -30_000, cashUsd: 400_000, newMonthlyCostUsd: 50_000,
    });
    assert.equal(tipped?.runwayAfter, 20);
    assert.match(tipped?.summary ?? "", /you would burn \$20k a month, and \$400k of cash lasts about 20 months/);
  });

  it("states figures whose arithmetic adds up, and words a runway past ten years", () => {
    // $1k of surplus and a $1,400 commitment printed "At $1k more a month you would burn $400 a month, and
    // $500k of cash lasts about 1250 months".
    const tipped = buildCommitmentImpact({
      regime: "DEFENSIVE", area: "hiring", netMonthlyBurnUsd: -1_000, cashUsd: 500_000, newMonthlyCostUsd: 1_400,
    });
    assert.equal(
      tipped?.summary,
      "Revenue covers spending today. At $1.4k more a month you would burn $400 a month, and $500k of cash lasts more than 10 years.",
    );
    // A commitment that leaves cents of burn printed "$0 a month" and 1,250,000 months: it holds level.
    const level = buildCommitmentImpact({
      regime: "DEFENSIVE", area: "hiring", netMonthlyBurnUsd: -1_000, cashUsd: 500_000, newMonthlyCostUsd: 1_000.4,
    });
    assert.match(level?.summary ?? "", /with nothing left over: cash holds level/);

    // Cash $5M at $10k of net burn is 500 months.
    const long = buildCommitmentImpact({
      regime: "EXPANSION", area: "burn-discipline", runwayMonths: 500, netMonthlyBurnUsd: 10_000, newMonthlyCostUsd: 5_000,
    });
    assert.equal(long?.summary, "At $5k more a month, runway stays more than 10 years.");
    assert.match(long?.noteAfter ?? "", /^With more than 10 years of runway/);
    const shortened = buildCommitmentImpact({
      regime: "EXPANSION", area: "burn-discipline", runwayMonths: 500, netMonthlyBurnUsd: 10_000, newMonthlyCostUsd: 40_000,
    });
    assert.equal(shortened?.summary, "At $40k more a month, runway goes from more than 10 years to 100 months.");
    assert.equal(
      describeProfileRunway({ basis: "cash", months: 500, cashUsd: 5_000_000, netBurnUsd: 10_000 }, new Date(2026, 9, 1, 12)),
      "Net burn is $10k a month (spend less revenue), so $5M lasts more than 10 years.",
    );
  });

  it("returns nothing rather than a guess when a figure is missing or not positive", () => {
    assert.equal(buildCommitmentImpact({ regime: "SCARCITY", area: "hiring", runwayMonths: 13, netMonthlyBurnUsd: 250_000 }), null);
    assert.equal(buildCommitmentImpact({ regime: "SCARCITY", area: "hiring", runwayMonths: 0, netMonthlyBurnUsd: 250_000, newMonthlyCostUsd: 1 }), null);
    assert.equal(buildCommitmentImpact({ regime: "SCARCITY", area: "hiring", runwayMonths: 13, netMonthlyBurnUsd: Number.NaN, newMonthlyCostUsd: 1 }), null);
    // Revenue covers spending but no cash was given: there is nothing to count.
    assert.equal(buildCommitmentImpact({ regime: "SCARCITY", area: "hiring", netMonthlyBurnUsd: -5_000, newMonthlyCostUsd: 1 }), null);
  });
});

describe("describeProfileRunway: the runway as a finance lead would say it", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("works runway out from cash and net burn, and dates the month it runs out", () => {
    const runway = resolveProfileRunway({ version: 1, cashUsd: 2_100_000, monthlyBurnUsd: 200_000, monthlyRevenueUsd: 50_000 });
    assert.ok(runway);
    assert.equal(
      describeProfileRunway(runway, now),
      "Net burn is $150k a month (spend less revenue), so $2.1M lasts about 14 months: to about Dec 2027.",
    );
  });

  it("dates a typed runway without claiming to know the cash", () => {
    assert.equal(describeProfileRunway({ basis: "entered", months: 9 }, now), "9 months of runway lasts to about Jul 2027.");
  });

  it("says cash is not running down when revenue covers spending", () => {
    const runway = resolveProfileRunway({ version: 1, cashUsd: 300_000, monthlyBurnUsd: 80_000, monthlyRevenueUsd: 95_000 });
    assert.ok(runway);
    assert.equal(
      describeProfileRunway(runway, now),
      "Revenue covers spending, with $15k a month left over: cash is not running down.",
    );
  });

  it("does not date a typed runway that revenue already covers", () => {
    // "14 months of runway lasts to about Dec 2027" printed here, beside a planner that said there was no runway.
    const runway = resolveProfileRunway({ version: 1, runwayMonths: 14, monthlyBurnUsd: 100_000, monthlyRevenueUsd: 120_000 });
    assert.ok(runway);
    assert.equal(
      describeProfileRunway(runway, now),
      "Revenue covers spending, with $20k a month left over: cash is not running down.",
    );
  });
});
