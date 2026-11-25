import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LastTimeCallChangedCard } from "../app/components/home/LastTimeCallChangedCard";
import type { RegimeKey } from "../lib/regimeEngine";
import { describeAgainstToday, findCallChangeComparisons, findLastTimeCallChanged, parseCompareMonth } from "../lib/report/lastTimeCallChanged";
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

const sunnyToFreezingIn2021 = () => [
  month(2021, 1, "EXPANSION", 55, 60),
  month(2021, 2, "EXPANSION", 56, 60),
  month(2021, 3, "SCARCITY", 78, 30),
  month(2021, 4, "SCARCITY", 82, 25),
  month(2021, 5, "SCARCITY", 84, 24),
  month(2021, 6, "SCARCITY", 85, 22),
];

const lastTimeForSep25Reading = () =>
  findLastTimeCallChanged({
    series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER),
    currentRegime: "SCARCITY",
    previousRegime: "EXPANSION",
    currentScores: { tightness: 90, riskAppetite: 43 },
  });

describe("the last time conditions moved this way, against this week", () => {
  it("names how the month it found differed, on the real record for the Sep 25 reading", () => {
    const record = lastTimeForSep25Reading();

    assert.ok(record);
    assert.equal(record.changedAt.year, 2022);
    assert.equal(record.changedAt.month, 9);
    const versus = describeAgainstToday(record);
    assert.equal(versus.alike, false);
    assert.equal(
      versus.text,
      "Tightened both times: Sep 2022 went Stormy to Freezing; this week went Sunny to Freezing. "
        + "Funding pressure was 79 then and is 90 now; at both readings, money is hard to raise. "
        + "Risk appetite was 7 then (investors are avoiding risk) and is 43 now (investors are selective about risk). "
        + "One earlier outcome, not a forecast.",
    );
  });

  it("leads with the same change, and adds no caveat, where the same change looks the same", () => {
    const series = sunnyToFreezingIn2021();
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
    assert.doesNotMatch(versus.text, /not a forecast/);
    assert.equal(
      versus.text,
      "The same change: Mar 2021 also went Sunny to Freezing. "
        + "Funding pressure was 78 then and is 80 now; at both readings, money is hard to raise. "
        + "Risk appetite was 30 then and is 28 now; at both readings, investors are avoiding risk.",
    );
  });

  it("says the setups differ when the pair matches and a score is far from where it was", () => {
    const series = sunnyToFreezingIn2021();
    const record = findLastTimeCallChanged({
      series,
      currentRegime: "SCARCITY",
      previousRegime: "EXPANSION",
      currentScores: { tightness: 90, riskAppetite: 43 },
    });

    assert.ok(record);
    const versus = describeAgainstToday(record);
    assert.equal(versus.alike, false);
    assert.match(versus.text, /^The same change: Mar 2021 also went Sunny to Freezing\./, "the pair is the same, so it is said once");
    assert.match(versus.text, /One earlier outcome, not a forecast\.$/);
  });

  it("prints on the card under the two scores, and sends no reader to the retired compare view", () => {
    const record = lastTimeForSep25Reading();
    assert.ok(record);
    const html = renderToStaticMarkup(<LastTimeCallChangedCard record={record} callChangeLines={{ tightness: 70, riskAppetite: 50 }} />);

    assert.match(html, /data-testid="last-time-versus-today"[^>]*>Tightened both times: Sep 2022 went Stormy to Freezing/);
    assert.ok(html.indexOf("data-follow-through=") !== -1 && html.indexOf("data-follow-through=") < html.indexOf("last-time-versus-today"));
    /* /history/compare redirects to /history; the panels draw the months it compared. */
    assert.doesNotMatch(html, /history\/compare/);
  });
});

/*
 * Compare with any change (2026-11-18). The card names every change in conditions on the
 * record as a row of links, the last one the same way as this week's marked by default,
 * and the panels, the cells and the sentence switch to the one chosen, from one walk.
 */
describe("comparing this week with any change on the record", () => {
  const args = {
    series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER),
    currentRegime: "SCARCITY" as const,
    previousRegime: "EXPANSION" as const,
    currentScores: { tightness: 90, riskAppetite: 43 },
  };

  it("offers every change since 2012 that has a month-end after it, oldest first, the last one the same way by default", () => {
    const record = findLastTimeCallChanged(args);
    assert.ok(record);
    assert.deepEqual(
      record.choices.map((choice) => `${choice.month} · ${choice.change}`),
      [
        "Dec 2018 · Sunny to Stormy",
        "Mar 2021 · Stormy to Sunny",
        "Mar 2022 · Sunny to Stormy",
        "Sep 2022 · Stormy to Freezing",
        "May 2025 · Freezing to Cloudy",
        "Dec 2025 · Cloudy to Sunny",
        "Sep 2026 · Sunny to Cloudy",
      ],
    );
    assert.deepEqual(record.choices.filter((choice) => choice.current).map((choice) => choice.key), ["2022-09"]);
    assert.deepEqual(record.choices.filter((choice) => choice.lastSameWay).map((choice) => choice.key), ["2022-09"]);
  });

  it("draws the change `?compare=` names from the same walk, and ignores a month with no change", () => {
    const chosen = findLastTimeCallChanged({ ...args, compare: "2022-03" });
    assert.ok(chosen);
    assert.equal(chosen.changedAt.recordDate.slice(0, 7), "2022-03");
    assert.equal(chosen.path[0]?.tightness, chosen.tightness.atChange, "the cells read the walk's first month");
    assert.equal(chosen.path.at(-1)?.riskAppetite, chosen.riskAppetite.later, "and its last");
    assert.deepEqual(chosen.choices.filter((choice) => choice.current).map((choice) => choice.key), ["2022-03"]);
    assert.equal(findLastTimeCallChanged({ ...args, compare: "2023-01" })?.changedAt.recordDate.slice(0, 7), "2022-09");
    assert.equal(parseCompareMonth("2022-09"), "2022-09");
    assert.equal(parseCompareMonth("2022-13"), undefined);
    assert.equal(parseCompareMonth("Sep 2022"), undefined);
  });

  it("says so first when the chosen change went the other way", () => {
    const easing = findLastTimeCallChanged({ ...args, compare: "2021-03" });
    assert.ok(easing);
    assert.equal(easing.direction, "easing");
    assert.match(describeAgainstToday(easing).text, /^The other way: Mar 2021 eased from Stormy to Sunny; this week tightened from Sunny to Freezing\. /);
  });

  it("draws a change the record has run past for fewer than three months as far as it goes", () => {
    const recent = findLastTimeCallChanged({ ...args, compare: "2026-09" });
    assert.ok(recent);
    assert.ok(recent.monthsLater >= 1 && recent.monthsLater < 3);
    assert.equal(recent.path.length, recent.monthsLater + 1);
    const html = renderToStaticMarkup(<LastTimeCallChangedCard record={recent} callChangeLines={{ tightness: 70, riskAppetite: 50 }} />);
    assert.match(html, recent.monthsLater === 1 ? />1 month on</ : new RegExp(`>${recent.monthsLater} months on<`));
  });

  it("builds every change's card once, keyed by its month", () => {
    const comparisons = findCallChangeComparisons(args);
    assert.ok(comparisons);
    assert.equal(comparisons.defaultKey, "2022-09");
    assert.equal(Object.keys(comparisons.byKey).length, 7);
    for (const [key, record] of Object.entries(comparisons.byKey)) {
      assert.equal(record.changedAt.recordDate.slice(0, 7), key);
    }
  });

  it("prints the row as links to views of the page, the change drawn marked current, each month a date", () => {
    const comparisons = findCallChangeComparisons(args);
    const record = comparisons?.byKey["2021-03"];
    assert.ok(comparisons && record);
    const html = renderToStaticMarkup(
      <LastTimeCallChangedCard record={record} comparisons={comparisons} callChangeLines={{ tightness: 70, riskAppetite: 50 }} query={{ decision: "hiring" }} />,
    );
    assert.match(html, /<p id="last-change-question"[^>]*>Like which time\?<\/p>/);
    assert.equal(count(html, /data-view-choice=/g), 7);
    const chosen = tagWith(html, 'data-view-choice="2021-03"');
    assert.match(chosen, /href="\/\?decision=hiring&amp;compare=2021-03#last-change"/, "a link to the view, the rest of the query kept");
    assert.match(chosen, /aria-current="page"/);
    assert.match(chosen, /aria-label="Compare this week with Mar 2021, Stormy to Sunny"/);
    const fallback = tagWith(html, 'data-view-choice=""');
    assert.match(fallback, /href="\/\?decision=hiring#last-change"/, "the default carries no key");
    assert.match(fallback, /aria-label="Compare this week with Sep 2022, Stormy to Freezing"/);
    assert.doesNotMatch(fallback, /aria-current/);
    assert.match(html, /<time dateTime="2022-09">Sep 2022<\/time>/);
    assert.equal(count(html, /data-testid="last-time-versus-today"/g), 1, "only the change drawn is in the page");
    assert.match(html, /data-compare-view="2021-03"/);
    assert.doesNotMatch(html, /The last time conditions|Against this week/, "the row took the eyebrow's place, and the sentence leads with its answer");
  });

  it("marks each earlier month with the month it is, for the page's month contract", () => {
    const record = findLastTimeCallChanged(args);
    assert.ok(record);
    const html = renderToStaticMarkup(<LastTimeCallChangedCard record={record} callChangeLines={{ tightness: 70, riskAppetite: 50 }} />);
    for (const month of record.path) assert.match(html, new RegExp(`data-month="${month.recordDate.slice(0, 7)}"`));
  });
});

const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length;

/* The whole opening tag that carries `attribute`, whatever order React wrote its attributes in. */
const tagWith = (html: string, attribute: string) => {
  const at = html.indexOf(attribute);
  return at === -1 ? "" : html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
};
