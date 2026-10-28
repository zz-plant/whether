import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { describeSpellLengths } from "../lib/report/lastTimeCallChanged";
import { getTimeMachineRegimeSeries, type TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";
import type { RegimeKey } from "../lib/regimeEngine";

const walk = (regimes: readonly RegimeKey[]): TimeMachineRegimeEntry[] =>
  regimes.map((regime, index) => ({
    year: 2020 + Math.floor(index / 12),
    month: (index % 12) + 1,
    recordDate: `${2020 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-28`,
    regime,
    summary: "",
    tightness: 50,
    riskAppetite: 50,
  }));

/** The lead and the rest as the section prints them, one after the other. */
const spellText = (input: Parameters<typeof describeSpellLengths>[0]) => {
  const parts = describeSpellLengths(input);
  return parts ? `${parts.lead} ${parts.rest}` : null;
};

const S = "EXPANSION" as const;
const F = "SCARCITY" as const;
const C = "DEFENSIVE" as const;

describe("how long conditions lasted before", () => {
  it("names the one earlier spell, its months, and the shortest spell on record", () => {
    const series = walk([S, S, S, F, F, F, F, C, C, S, S]);
    assert.equal(
      spellText({ series, currentRegime: F, runwayBand: null }),
      "The only earlier Freezing stretch lasted 4 months, Apr 2020 to Jul 2020. Since 2020, every stretch of conditions has lasted at least 2 months. That's a count of what happened, not a forecast.",
    );
  });

  it("leaves the spell the record ends in out of the earlier ones while it is still running", () => {
    const series = walk([F, F, S, S, S, F, F, F]);
    assert.match(spellText({ series, currentRegime: F, runwayBand: null }) ?? "", /^It's been Freezing for 3 months so far\. The last Freezing stretch lasted 2 months/);
  });

  it("counts several earlier spells without averaging them", () => {
    const series = walk([F, F, S, S, F, F, F, C]);
    assert.match(spellText({ series, currentRegime: F, runwayBand: null }) ?? "", /^There have been 2 earlier Freezing stretches, lasting 2 and 3 months\./);
  });

  it("says when every earlier spell outlasted the top of the reader's runway band", () => {
    const series = walk([...Array(14).fill(F), S, S]);
    assert.match(spellText({ series, currentRegime: F, runwayBand: "tight" }) ?? "", /That stretch lasted longer than 6–12 months of runway, the band you chose\./);
    assert.doesNotMatch(spellText({ series, currentRegime: F, runwayBand: "balanced" }) ?? "", /lasted longer than/);
    assert.doesNotMatch(spellText({ series, currentRegime: F, runwayBand: "abundant" }) ?? "", /lasted longer than/);
  });

  it("says when the record has no earlier spell of these conditions", () => {
    assert.match(spellText({ series: walk([S, S, C, C]), currentRegime: F, runwayBand: null }) ?? "", /^There's no earlier Freezing stretch since 2020\./);
  });

  it("reads the bundled record: one Freezing spell, Sep 2022 to Apr 2025", () => {
    const sentence = spellText({ series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER), currentRegime: F, runwayBand: "balanced" }) ?? "";
    assert.match(sentence, /The only earlier Freezing stretch lasted 32 months, Sep 2022 to Apr 2025\./);
    assert.match(sentence, /That stretch lasted longer than 12–24 months of runway/);
  });

  /* "How long will it last" is what the section is for: the lead sets the spell the
     record ends in beside the earlier ones (2026-10-27). */
  it("leads with how long this spell has run, beside the earlier ones, while it is still running", () => {
    const one = describeSpellLengths({ series: walk([F, F, F, S, S, F, F]), currentRegime: F, runwayBand: null });
    assert.equal(one?.lead, "It's been Freezing for 2 months so far. The last Freezing stretch lasted 3 months, Jan 2020 to Mar 2020.");
    assert.match(one?.rest ?? "", /^Since 2020, every stretch of conditions has lasted at least 2 months\. That's a count of what happened, not a forecast\.$/);
    const first = describeSpellLengths({ series: walk([S, S, F]), currentRegime: F, runwayBand: null });
    assert.equal(first?.lead, "This is the first Freezing stretch since 2020, 1 month so far.");
    const many = describeSpellLengths({ series: walk([F, F, S, F, F, F, C, F]), currentRegime: F, runwayBand: null });
    assert.equal(many?.lead, "It's been Freezing for 1 month so far. The 2 earlier ones lasted 2 and 3 months.");
  });
});
