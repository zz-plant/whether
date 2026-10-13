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

const S = "EXPANSION" as const;
const F = "SCARCITY" as const;
const C = "DEFENSIVE" as const;

describe("how long conditions lasted before", () => {
  it("names the one earlier spell, its months, and the shortest spell on record", () => {
    const series = walk([S, S, S, F, F, F, F, C, C, S, S]);
    assert.equal(
      describeSpellLengths({ series, currentRegime: F, runwayBand: null }),
      "The one earlier Freezing spell on record ran 4 month-ends, Apr 2020 to Jul 2020. No conditions since 2020 lasted under 2 month-ends. A count from the record, not a forecast.",
    );
  });

  it("leaves the spell the record ends in out of the earlier ones while it is still running", () => {
    const series = walk([F, F, S, S, S, F, F, F]);
    assert.match(describeSpellLengths({ series, currentRegime: F, runwayBand: null }) ?? "", /^The one earlier Freezing spell on record ran 2 month-ends/);
  });

  it("counts several earlier spells without averaging them", () => {
    const series = walk([F, F, S, S, F, F, F, C]);
    assert.match(describeSpellLengths({ series, currentRegime: F, runwayBand: null }) ?? "", /^The record has 2 earlier Freezing spells: 2 and 3 month-ends long\./);
  });

  it("says when every earlier spell outlasted the top of the reader's runway band", () => {
    const series = walk([...Array(14).fill(F), S, S]);
    assert.match(describeSpellLengths({ series, currentRegime: F, runwayBand: "tight" }) ?? "", /That spell outlasted 6–12 months of runway, the band you chose\./);
    assert.doesNotMatch(describeSpellLengths({ series, currentRegime: F, runwayBand: "balanced" }) ?? "", /outlasted/);
    assert.doesNotMatch(describeSpellLengths({ series, currentRegime: F, runwayBand: "abundant" }) ?? "", /outlasted/);
  });

  it("says when the record has no earlier spell of these conditions", () => {
    assert.match(describeSpellLengths({ series: walk([S, S, C, C]), currentRegime: F, runwayBand: null }) ?? "", /^The record since 2020 has no earlier Freezing spell\./);
  });

  it("reads the bundled record: one Freezing spell, Sep 2022 to Apr 2025", () => {
    const sentence = describeSpellLengths({ series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER), currentRegime: F, runwayBand: "balanced" }) ?? "";
    assert.match(sentence, /The one earlier Freezing spell on record ran 32 month-ends, Sep 2022 to Apr 2025\./);
    assert.match(sentence, /That spell outlasted 12–24 months of runway/);
  });
});
