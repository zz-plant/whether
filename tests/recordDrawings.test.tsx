import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustStrip } from "../app/components/trustStrip";
import { SpellLengthPlot } from "../app/components/home/SpellLengthPlot";
import { RecordSection } from "../app/components/home/RecordSection";
import { LastTimeCallChangedCard } from "../app/components/home/LastTimeCallChangedCard";
import { AreaGroups } from "../app/components/home/AreaGroups";
import { ScoreMoveBars } from "../app/components/home/ScoreMoveBars";
import { confidenceCalibration } from "../lib/report/confidenceCalibration";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { describeSpellLengths, findLastTimeCallChanged } from "../lib/report/lastTimeCallChanged";
import { describeScoreMoveBand, describeScoreMoveHistogram } from "../lib/report/marketMoveScale";
import { buildAreaGroups, type HomeAreaLineSlot, type HomeAreaRow } from "../lib/report/home/homeSectionModel";
import { getTimeMachineRegimeSeries, type TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";
import type { RegimeKey } from "../lib/regimeEngine";

/*
 * The four drawings of 2026-11-18 beside sentences the brief already printed: the base
 * rate's squares, every stretch by its length, the last change against this one, and how
 * big a one-month move is. Each is read off the model its sentence comes from, so these
 * pin the shared read (the drawing's counts are the sentence's counts) and the drawing's
 * contract (one tab stop, marks that link to the months they stand for, nothing a button).
 */

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

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

describe("the base rate's squares", () => {
  it("are the months each band counts, in date order, and held where the next month kept the conditions", () => {
    for (const band of confidenceCalibration()) {
      assert.equal(band.entries.length, band.months, `band from ${band.from}`);
      assert.equal(band.entries.filter((entry) => entry.next === entry.regime).length, band.held, `band from ${band.from}`);
      const dates = band.entries.map((entry) => entry.asOf);
      assert.deepEqual(dates, [...dates].sort(), "oldest first");
    }
  });

  it("carry through the trust strip's props as the count's own months, each named and linked", () => {
    const props = buildTrustStripProps({
      recordDateLabel: "Nov 16, 2026",
      isFallback: false,
      confidenceLabel: "MED",
      assessment: {
        diagnostics: { transitionWatch: false },
        scores: { tightness: 60, riskAppetite: 57 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
    });
    const baseRate = props.baseRate;
    assert.ok(baseRate?.marks, "a live reading at a distance the record holds draws its months");
    assert.equal(baseRate.marks.length, baseRate.months);
    assert.equal(baseRate.marks.filter((mark) => mark.held).length, baseRate.held);
    for (const mark of baseRate.marks) {
      assert.match(mark.label, /^[A-Z][a-z]{2} \d{4}: (Sunny|Cloudy|Stormy|Freezing), (held the next month|changed to (Sunny|Cloudy|Stormy|Freezing) the next month)$/);
      const [year, month] = mark.asOf.split("-").map(Number);
      assert.equal(mark.href, `/?month=${month}&year=${year}`);
    }
  });

  it("draw one link per month beside the count, filled where conditions held, as one tab stop", () => {
    const marks = [
      { asOf: "2019-02-28", held: true, label: "Feb 2019: Stormy, held the next month", href: "/?month=2&year=2019" },
      { asOf: "2022-08-31", held: false, label: "Aug 2022: Stormy, changed to Freezing the next month", href: "/?month=8&year=2022" },
      { asOf: "2025-06-30", held: true, label: "Jun 2025: Cloudy, held the next month", href: "/?month=6&year=2025" },
    ];
    const html = renderToStaticMarkup(
      <TrustStrip
        recordDateLabel="Nov 16, 2026"
        sourcesLive
        sourcesLabel="Live"
        confidenceLabel="MED"
        margin={{ signal: "riskAppetite", points: 7 }}
        couldChangeNextWeek={false}
        baseRate={{ held: 2, months: 3, marks }}
        basis={{ key: "record", value: "The same data we used for past months", warning: null }}
      />,
    );
    assert.equal(count(html, /data-base-rate-mark="held"/g), 2);
    assert.equal(count(html, /data-base-rate-mark="changed"/g), 1);
    assert.match(html, /href="\/\?month=8&amp;year=2022"[^>]*aria-label="Aug 2022: Stormy, changed to Freezing the next month"/);
    assert.equal(count(html, /data-base-rate-mark="[a-z]+"[^>]*/g), 3);
    assert.equal(count(html, /tabindex="0"[^>]*data-mark=/g), 1, "the squares are one stop for the keyboard");
    const text = html.replace(/<[^>]*>/g, "");
    assert.match(text, /Past conditions held 2 of 3 months at this distance/, "the sentence stays whole");
  });

  it("draws nothing beside a count whose months it was not given", () => {
    const html = renderToStaticMarkup(
      <TrustStrip
        recordDateLabel="Nov 16, 2026"
        sourcesLive
        sourcesLabel="Live"
        confidenceLabel="MED"
        margin={{ signal: "riskAppetite", points: 7 }}
        couldChangeNextWeek={false}
        baseRate={{ held: 2, months: 3 }}
        basis={{ key: "record", value: "The same data we used for past months", warning: null }}
      />,
    );
    assert.doesNotMatch(html, /data-base-rate-mark/);
    assert.match(html, /Past conditions held 2 of 3 months at this distance/);
  });
});

describe("every stretch by how long it lasted", () => {
  it("plots the walk the sentences count, with the same shortest stretch", () => {
    const spells = describeSpellLengths({ series: walk([S, S, S, F, F, F, F, C, C, S, S]), currentRegime: F, runwayBand: null });
    const plot = spells?.plot;
    assert.ok(spells && plot);
    assert.match(spells.rest, /at least 2 months/);
    assert.equal(plot.shortest, 2, "the rule is the sentence's shortest");
    assert.deepEqual(plot.rows.map((row) => row.label), ["Sunny", "Cloudy", "Freezing"], "mildest first, only the conditions on record");
    assert.deepEqual(plot.rows.map((row) => row.total), ["5 months in all", "2 months in all", "4 months in all"]);
    const sunny = plot.rows[0];
    assert.deepEqual(sunny?.stretches.map((stretch) => [stretch.months, stretch.latest]), [[3, false], [2, true]]);
    assert.equal(sunny?.stretches[1]?.label, "Sunny since Oct 2020: 2 months by Nov 2020, the latest month-end");
    assert.equal(plot.rows[2]?.stretches[0]?.label, "Freezing, Apr 2020 to Jul 2020: 4 months");
    assert.equal(plot.axisMax, 12);
    assert.equal(plot.range, "Jan 2020 to Nov 2020");
    assert.equal(plot.latestKey, "latest, to Nov 2020");
  });

  it("calls the open mark this stretch while the week's conditions are the record's last", () => {
    const plot = describeSpellLengths({ series: walk([F, F, S, S, S, F, F, F]), currentRegime: F, runwayBand: null })?.plot;
    const latest = plot?.rows.flatMap((row) => row.stretches).find((stretch) => stretch.latest);
    assert.equal(latest?.label, "Freezing since Jun 2020: 3 months so far");
    assert.equal(plot?.latestKey, "this one, so far");
  });

  it("matches the real record's spells: every one drawn, each total the months under it", () => {
    const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
    const plot = describeSpellLengths({ series, currentRegime: "SCARCITY", runwayBand: null })?.plot;
    assert.ok(plot);
    const drawn = plot.rows.reduce((sum, row) => sum + row.stretches.reduce((inner, stretch) => inner + stretch.months, 0), 0);
    assert.equal(drawn, series.length, "every month-end is in exactly one stretch");
    for (const row of plot.rows) {
      const months = series.filter((entry) => entry.regime === row.regime).length;
      assert.equal(row.total, `${months} months in all`);
    }
    assert.ok(plot.axisMax >= Math.max(...plot.rows.flatMap((row) => row.stretches.map((stretch) => stretch.months))));
  });

  it("draws a link per stretch to its first month, one tab stop, and the shortest as a rule on every row", () => {
    const plot = describeSpellLengths({ series: walk([S, S, S, F, F, F, F, C, C, S, S]), currentRegime: F, runwayBand: null })?.plot;
    assert.ok(plot);
    const html = renderToStaticMarkup(<SpellLengthPlot plot={plot} />);
    assert.equal(count(html, /data-spell-plot-mark="ended"/g), 3);
    assert.equal(count(html, /data-spell-plot-mark="latest"/g), 1);
    assert.match(html, /href="\/\?month=4&amp;year=2020"[^>]*aria-label="Freezing, Apr 2020 to Jul 2020: 4 months"/);
    assert.equal(count(html, /tabindex="0"/g), 1);
    assert.equal(count(html, /data-spell-plot-shortest/g), 3, "the rule crosses each row");
    assert.match(html.replace(/<\/?time[^>]*>/g, ""), /Months each stretch lasted, Jan 2020 to Nov 2020/, "the domain is stated");
    assert.match(html, /<time datetime="2020-01">Jan 2020<\/time>/i, "in months a machine can read");
  });

  it("takes the place of the record's key in the section, which printed the same totals", () => {
    const spells = describeSpellLengths({ series: walk([S, S, S, F, F, F, F, C, C, S, S]), currentRegime: F, runwayBand: null });
    assert.ok(spells);
    const record = walk([S, S, S, F, F, F, F, C, C, S, S]);
    const html = renderToStaticMarkup(
      <RecordSection lastTime={null} callChangeLines={{ tightness: 70, riskAppetite: 50 }} turningPoints={[]} spellLengths={spells} record={record} />,
    );
    assert.match(html, /data-spell-plot/);
    assert.doesNotMatch(html, /data-month-strip/);
    assert.ok(html.indexOf("data-spell-plot") < html.indexOf("That&#x27;s a count, not a forecast."), "the drawing, then the sentences that count it");
  });
});

describe("the last change against this one", () => {
  const record = findLastTimeCallChanged({
    series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER),
    currentRegime: "SCARCITY",
    previousRegime: "DEFENSIVE",
    currentScores: { tightness: 90, riskAppetite: 44 },
  });

  it("walks the month-ends from the change to the month the cells read, both ends included", () => {
    assert.ok(record);
    assert.equal(record.path.length, record.monthsLater + 1);
    assert.deepEqual(record.path.map((month) => month.monthsSince), [0, 1, 2, 3]);
    assert.equal(record.path[0]?.recordDate, record.changedAt.recordDate);
    assert.equal(record.path.at(-1)?.recordDate, record.after.recordDate);
    assert.equal(record.path[0]?.tightness, record.tightness.atChange);
    assert.equal(record.path.at(-1)?.tightness, record.tightness.later);
    assert.equal(record.path[0]?.riskAppetite, record.riskAppetite.atChange);
    assert.equal(record.path.at(-1)?.riskAppetite, record.riskAppetite.later);
  });

  it("draws both scores' panels under their cells, each earlier month a link, this week one mark", () => {
    assert.ok(record);
    const html = renderToStaticMarkup(<LastTimeCallChangedCard record={record} callChangeLines={{ tightness: 70, riskAppetite: 50 }} />);
    assert.equal(count(html, /data-follow-through="(tightness|riskAppetite)"/g), 2);
    assert.equal(count(html, /data-follow-through-month=/g), 2 * record.path.length);
    assert.equal(count(html, /data-follow-through-today/g), 2);
    const first = record.path[0];
    assert.ok(first);
    assert.match(html, new RegExp(`href="/\\?month=${first.month}&amp;year=${first.year}"`));
    assert.match(html, /This week: funding pressure 90/);
    assert.equal(count(html, /tabindex="0"/g), 1, "the months are one stop for the keyboard");
    assert.ok(html.indexOf("data-change-follow-through") < html.indexOf("last-time-versus-today"), "the drawing sits above the sentence it shows");
  });
});

describe("how big a one-month move is", () => {
  it("counts every month-to-month change once, and the bars past the mark are the band's count", () => {
    for (const [score, points] of [["tightness", 24], ["riskAppetite", 8], ["riskAppetite", 2]] as const) {
      const move = describeScoreMoveHistogram(score, points);
      assert.ok(move);
      assert.equal(move.bins.reduce((sum, bin) => sum + bin.count, 0), move.changes);
      assert.equal(move.bins.filter((bin) => bin.size >= points).reduce((sum, bin) => sum + bin.count, 0), move.atLeast);
      assert.equal(describeScoreMoveBand(score, points), `${move.band} move`, "the word is read off the same count");
      assert.equal(move.caption, `${move.changes} one-month moves since ${move.since}`);
      for (const bin of move.bins) {
        assert.equal(bin.latest === null, bin.size === 0 || bin.count === 0, `${score} ${bin.size}`);
      }
    }
  });

  it("sizes no move at the line", () => {
    assert.equal(describeScoreMoveHistogram("tightness", 0), null);
  });

  it("gives the group the record its sentence's band came from", () => {
    const slot = (overrides: Partial<HomeAreaLineSlot>): HomeAreaLineSlot => ({ line: "", distance: "", points: 10, met: false, metric: "tightness", ...overrides });
    const rows: HomeAreaRow[] = [
      { area: "hiring", rule: "Hold", pause: slot({ met: true, points: 14, value: 76, holdsAbove: true }), resume: slot({ points: 24, value: 66, holdsAbove: false }) },
      { area: "product-tempo", rule: "Ship", pause: slot({ points: 8, value: 44, holdsAbove: false, metric: "riskAppetite" }) },
    ];
    const groups = buildAreaGroups(rows, { tightness: 90, riskAppetite: 52 });
    const [held, clear] = groups;
    assert.ok(held?.move && clear?.move);
    assert.equal(held.move.points, 24);
    assert.match(held.distance ?? "", new RegExp(`24 points away, ${held.move.band} one-month move`));
    assert.match(clear.distance ?? "", new RegExp(`8 points away, ${clear.move.band} one-month move`));

    const html = renderToStaticMarkup(<AreaGroups groups={groups} />);
    assert.equal(count(html, /data-score-move-bars/g), 1, "drawn once, beside the first group that sizes a move");
    assert.ok(html.indexOf("data-score-move-bars") < html.indexOf("<span>Clear</span>"), "under the held group, ahead of the clear one");
  });

  it("draws bars that link to the latest month of their size, marks the move, and adds no buttons", () => {
    const move = describeScoreMoveHistogram("tightness", 24);
    assert.ok(move);
    const html = renderToStaticMarkup(<ScoreMoveBars move={move} />);
    assert.doesNotMatch(html, /<button/, "the homepage's control budget holds");
    const linked = move.bins.filter((bin) => bin.latest);
    assert.equal(count(html, /<a [^>]*data-score-move-bin=/g), linked.length);
    assert.equal(count(html, /tabindex="0"/g), 1);
    const last = linked.at(-1);
    assert.ok(last?.latest);
    const [year, month] = last.latest.split("-").map(Number);
    assert.match(html, new RegExp(`href="/\\?month=${month}&amp;year=${year}"[^>]*aria-label="${last.label}"`));
    assert.match(html, /data-score-move-mark/);
    assert.match(html, />24 points</);
    assert.match(html, new RegExp(move.caption));
  });
});
