import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LastTimeCallChangedCard } from "../app/components/home/LastTimeCallChangedCard";
import type { RegimeKey } from "../lib/regimeEngine";
import { describeAgainstToday, findLastTimeCallChanged } from "../lib/report/lastTimeCallChanged";
import { getTimeMachineRegimeSeries, type TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";

/*
 * "By Dec 2022, 3 months on, the scores stood here" is a fact about one month, and it reads as a
 * forecast to anyone who is not told where that month started. On the Sep 25 reading — Sunny to
 * Freezing, funding pressure 90, risk appetite 43 — the month it finds is Sep 2022, which was Stormy
 * to Freezing with risk appetite at 7. The card now sets the two side by side.
 */
const month = (year: number, monthNumber: number, regime: RegimeKey, tightness: number, riskAppetite: number): TimeMachineRegimeEntry => ({
  year,
  month: monthNumber,
  recordDate: `${year}-${String(monthNumber).padStart(2, "0")}-28`,
  regime,
  summary: "",
  tightness,
  riskAppetite,
});

describe("the last time conditions moved this way, against this week", () => {
  it("names how the month it found differed, on the real record for the Sep 25 reading", () => {
    const record = findLastTimeCallChanged({
      series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER),
      currentRegime: "SCARCITY",
      previousRegime: "EXPANSION",
      currentScores: { tightness: 90, riskAppetite: 43 },
    });

    assert.ok(record);
    assert.equal(record.changedAt.year, 2022);
    assert.equal(record.changedAt.month, 9);
    const versus = describeAgainstToday(record);
    assert.equal(versus.alike, false);
    assert.equal(
      versus.text,
      "That change was Stormy to Freezing; this week's is Sunny to Freezing. "
        + "Funding pressure was 79 then and is 90 now; at both readings, money is hard to raise. "
        + "Risk appetite was 7 then (investors are avoiding risk) and is 43 now (investors are selective about risk). "
        + "One earlier outcome, not a forecast.",
    );
  });

  it("does not add the caveat, or the pair, where the same change looks the same", () => {
    const series = [
      month(2021, 1, "EXPANSION", 55, 60),
      month(2021, 2, "EXPANSION", 56, 60),
      month(2021, 3, "SCARCITY", 78, 30),
      month(2021, 4, "SCARCITY", 82, 25),
      month(2021, 5, "SCARCITY", 84, 24),
      month(2021, 6, "SCARCITY", 85, 22),
    ];
    // The change in Mar 2021 was Sunny to Freezing at 78 and 30; this week's is the same change at 80 and 28.
    const record = findLastTimeCallChanged({
      series,
      currentRegime: "SCARCITY",
      previousRegime: "EXPANSION",
      currentScores: { tightness: 80, riskAppetite: 28 },
    });

    assert.ok(record);
    const versus = describeAgainstToday(record);
    assert.equal(versus.alike, true);
    assert.doesNotMatch(versus.text, /That change was|not a forecast/);
    assert.match(versus.text, /^Funding pressure was 78 then and is 80 now; at both readings, money is hard to raise\. Risk appetite was 30 then and is 28 now; at both readings, investors are avoiding risk\.$/);
  });

  it("says the setups differ when the pair matches and a score is far from where it was", () => {
    const series = [
      month(2021, 1, "EXPANSION", 55, 60),
      month(2021, 2, "EXPANSION", 56, 60),
      month(2021, 3, "SCARCITY", 78, 30),
      month(2021, 4, "SCARCITY", 82, 25),
      month(2021, 5, "SCARCITY", 84, 24),
      month(2021, 6, "SCARCITY", 85, 22),
    ];
    const record = findLastTimeCallChanged({
      series,
      currentRegime: "SCARCITY",
      previousRegime: "EXPANSION",
      currentScores: { tightness: 90, riskAppetite: 43 },
    });

    assert.ok(record);
    const versus = describeAgainstToday(record);
    assert.equal(versus.alike, false);
    assert.doesNotMatch(versus.text, /That change was/, "the pair is the same, so it is not restated");
    assert.match(versus.text, /One earlier outcome, not a forecast\.$/);
  });

  it("prints on the card under the two scores, above the way to the comparison", () => {
    const record = findLastTimeCallChanged({
      series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER),
      currentRegime: "SCARCITY",
      previousRegime: "EXPANSION",
      currentScores: { tightness: 90, riskAppetite: 43 },
    });
    assert.ok(record);
    const html = renderToStaticMarkup(<LastTimeCallChangedCard record={record} callChangeLines={{ tightness: 70, riskAppetite: 50 }} />);

    assert.match(html, /data-testid="last-time-versus-today"/);
    assert.match(html, /Against this week:<\/span> That change was Stormy to Freezing/);
    assert.ok(html.indexOf("last-time-versus-today") < html.indexOf("Compare Sep 2022 with Dec 2022"));
  });
});
