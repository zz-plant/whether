import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { buildRecordCalendar, describeMonthReading } from "../lib/report/recordCalendar";
import {
  CHANGE_APPROACH_SCALE_PTS,
  buildAdvanceWarningMarks,
  buildChangeApproach,
  describeAdvanceWarning,
  describeChangeApproach,
} from "../lib/report/advanceWarning";
import { buildLatitudeChart } from "../lib/report/latitudeChart";
import { buildTrackRecord } from "../lib/report/trackRecord";
import { describeLatitudeAgainstConditions, latitudeConditionLine } from "../lib/report/trackRecordCopy";
import { buildRegimeTrackRecord } from "../lib/summary/regimeTrackRecord";
import { getTimeMachineRegimeSeries, type TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";
import { REGIME_LABELS, isRegimeKey } from "../lib/regimePresentation";
import { ConditionsByYear } from "../app/components/history/conditionsByYear";
import { ConfidenceRecordSummary } from "../app/components/history/confidenceRecord";
import { TrackRecordSection } from "../app/components/history/TrackRecordSection";
import { TrackRecordTable } from "../app/components/history/TrackRecord";

/*
 * /history's four record drawings (2026-11-18): the month grid, the advance-warning
 * marks, the approach drawings beside the grading table, and the room-to-move chart.
 * Each is held to the words beside it: the same model, the same counts, the same links.
 * Observations are handwritten where a number is checked, so every expected value is
 * checkable by eye; the bundled record is used where the page's own agreement is.
 */
type Regime = TimeMachineRegimeEntry["regime"];
const entry = (recordDate: string, regime: Regime, tightness: number, riskAppetite: number, shock?: boolean): TimeMachineRegimeEntry => ({
  year: Number(recordDate.slice(0, 4)),
  month: Number(recordDate.slice(5, 7)),
  recordDate,
  regime,
  summary: "",
  tightness,
  riskAppetite,
  ...(shock ? { shock } : {}),
});

const record = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
const textOf = (html: string) => html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("the month grid reads the record by calendar", () => {
  const series = [
    entry("2024-11-29", "SCARCITY", 90, 42),
    entry("2024-12-31", "SCARCITY", 90, 53),
    entry("2025-01-31", "SCARCITY", 90, 54),
    entry("2025-02-28", "DEFENSIVE", 90, 61),
    entry("2025-03-31", "DEFENSIVE", 90, 60),
    entry("2025-04-30", "EXPANSION", 43, 68),
  ];

  it("lays a row per year, newest first, with a slot per month and none invented", () => {
    const calendar = buildRecordCalendar(series);
    assert.ok(calendar);
    assert.deepEqual(calendar.years.map((row) => row.year), [2025, 2024]);
    for (const row of calendar.years) assert.equal(row.months.length, 12);
    const [y2025, y2024] = calendar.years;
    assert.deepEqual(y2025?.months.map((cell) => cell?.regime ?? null).slice(0, 5), ["SCARCITY", "DEFENSIVE", "DEFENSIVE", "EXPANSION", null]);
    assert.equal(y2024?.months.filter(Boolean).length, 2, "only the two months on record in 2024");
    assert.equal(calendar.rangeLabel, "Nov 2024 – Apr 2025");
  });

  it("marks where a stretch starts within its row, so the glyph names each row", () => {
    const calendar = buildRecordCalendar(series);
    const y2025 = calendar?.years[0]?.months ?? [];
    assert.deepEqual(y2025.slice(0, 4).map((cell) => cell?.runStart), [true, true, false, true], "a new row restarts the stretch");
  });

  it("names each month with both scores and opens it in the time machine", () => {
    const cell = buildRecordCalendar(series)?.years[0]?.months[1];
    assert.equal(cell?.label, "Feb 2025 · Cloudy · funding pressure 90, risk appetite 61");
    assert.equal(cell?.label, describeMonthReading(series[3]!));
    assert.equal(cell?.href, "/?month=2&year=2025");
  });

  it("counts the months under each condition, mildest first", () => {
    assert.deepEqual(buildRecordCalendar(series)?.totals, [
      { regime: "EXPANSION", months: 1 },
      { regime: "DEFENSIVE", months: 2 },
      { regime: "SCARCITY", months: 3 },
    ]);
  });

  it("draws every month on the record as a link, with one stop in the tab order", () => {
    const calendar = buildRecordCalendar(record);
    assert.ok(calendar);
    const html = renderToStaticMarkup(<ConditionsByYear calendar={calendar} yearHref={(year) => `/history/${year}`} />);
    const cells = [...html.matchAll(/<a href="(\/\?month=\d+&amp;year=\d+)" aria-label="([^"]+)" data-readout-text="([^"]+)"[^>]*tabindex="(-?\d)"/g)];
    assert.equal(cells.length, record.length, "a link per month-end");
    assert.ok(cells.every(([, , label, readout]) => label === readout), "the readout prints the link's own name");
    assert.equal(cells.filter(([, , , , tab]) => tab === "0").length, 1);
    const latest = record.at(-1);
    assert.ok(latest);
    assert.match(html, new RegExp(`data-date="${latest.recordDate}"[^>]*tabindex="0"`), "the newest month is the stop");
    /* Each condition in a cell carries its fill and pattern from the published weeks' class. */
    assert.equal((html.match(/class="record-week-cell flex h-\[1\.875rem\]/g) ?? []).length, record.length);
    for (const { regime, months } of calendar.totals) {
      assert.equal(record.filter((month) => month.regime === regime).length, months);
    }
    /* A glyph only where a stretch starts in its row, and every glyph drawn is named in the key. */
    const runStarts = calendar.years.flatMap((row) => row.months).filter((cell) => cell?.runStart);
    const glyphs = [...html.matchAll(/<svg[^>]*data-regime="([A-Z]+)"[^>]*data-calendar-run-glyph=""/g)];
    assert.equal(glyphs.length, runStarts.length);
    const key = html.slice(html.indexOf('aria-label="Months under each condition"'));
    for (const [, regime = ""] of glyphs) {
      assert.ok(isRegimeKey(regime));
      assert.match(key, new RegExp(`data-condition-word=""[^>]*>${REGIME_LABELS[regime]}<`));
    }
  });
});

describe("advance warning comes from one grading", () => {
  it("words a warned change, a shock and a plain miss as the table always did", () => {
    assert.equal(describeAdvanceWarning({ signaled: true, leadMonths: 2 }, 5, false), "within 5 pts of its line 2 mo before");
    assert.equal(describeAdvanceWarning({ signaled: false, leadMonths: 0 }, 5, true), "none: it crossed from 5+ pts away in one month");
    assert.equal(describeAdvanceWarning({ signaled: false, leadMonths: 0 }, 5, false), "none");
  });

  it("gives the summary's count and its marks from the same object", () => {
    const marks = buildAdvanceWarningMarks(record);
    const graded = buildRegimeTrackRecord(record);
    assert.equal(marks.total, graded.transitions.length);
    assert.equal(marks.warned, graded.signaledCount);
    assert.equal(marks.marks.filter((mark) => mark.signaled).length, marks.warned);
    const dates = marks.marks.map((mark) => mark.atDate);
    assert.deepEqual(dates, [...dates].sort(), "oldest first");
  });

  it("labels a mark with its month, its change and the table's words, and links its month", () => {
    const { marks } = buildAdvanceWarningMarks([
      entry("2026-01-30", "EXPANSION", 60, 62),
      entry("2026-02-27", "EXPANSION", 66, 61),
      entry("2026-03-31", "DEFENSIVE", 73, 58),
    ]);
    assert.equal(marks[0]?.label, "Mar 2026 · Sunny → Cloudy · within 5 pts of its line 1 mo before");
    assert.equal(marks[0]?.href, "/?month=3&year=2026");
  });

  it("renders the sentence and one mark per change, filled where warned", () => {
    const html = renderToStaticMarkup(<ConfidenceRecordSummary />);
    const { total, warned, marks } = buildAdvanceWarningMarks(record);
    assert.match(textOf(html), new RegExp(`${warned} of ${total} changes had advance warning`));
    const links = [...html.matchAll(/<a href="([^"]+)" aria-label="([^"]+)" data-readout-text="([^"]+)"( data-warned="")?/g)];
    assert.equal(links.length, total);
    assert.equal(links.filter((link) => link[4]).length, warned);
    assert.deepEqual(links.map((link) => link[2]), marks.map((mark) => mark.label.replace(/&/g, "&amp;")));
    assert.ok(links.every(([, href]) => /^\/\?month=\d+&amp;year=\d+$/.test(href ?? "")), "each mark opens its month in the time machine");
  });
});

describe("each graded change draws how its score came to the line", () => {
  /* Funding pressure walks into the band and over its line at 70: up is the side it left. */
  const walk = [
    entry("2025-01-31", "EXPANSION", 40, 60),
    entry("2025-02-28", "EXPANSION", 50, 60),
    entry("2025-03-31", "EXPANSION", 60, 60),
    entry("2025-04-30", "EXPANSION", 66, 60),
    entry("2025-05-30", "EXPANSION", 68, 60),
    entry("2025-06-30", "EXPANSION", 72, 60),
    entry("2025-07-31", "EXPANSION", 74, 60),
    entry("2025-08-29", "DEFENSIVE", 80, 60),
  ];
  const [transition] = buildRegimeTrackRecord(walk).transitions;

  it("orients the distance so the side it left is up, over six months and the change", () => {
    assert.ok(transition);
    const approach = buildChangeApproach(walk, transition, { nearBandPts: 5 });
    assert.ok(approach);
    assert.equal(approach.axis, "tightness");
    assert.equal(approach.line, 70);
    assert.deepEqual(approach.points.map((point) => point.distance), [20, 10, 4, 2, -2, -4, -10]);
    assert.equal(approach.points.at(-1)?.recordDate, transition.atDate);
    assert.equal(
      describeChangeApproach(approach),
      "Funding pressure, in points from its line at 70 on the side it left, Feb 2025 to Jul 2025: +20, +10, +4, +2, −2, −4; at the change, Aug 2025: −10.",
    );
  });

  it("flips the sign for a score that crossed upward, so every drawing reads the same way up", () => {
    const easing = [entry("2026-01-30", "SCARCITY", 90, 44), entry("2026-02-27", "SCARCITY", 90, 48), entry("2026-03-31", "DEFENSIVE", 90, 58)];
    const [change] = buildRegimeTrackRecord(easing).transitions;
    assert.ok(change);
    assert.deepEqual(buildChangeApproach(easing, change, { nearBandPts: 5 })?.points.map((point) => point.distance), [6, 2, -8]);
  });

  it("is null for a change it cannot find on the series it is given", () => {
    assert.ok(transition);
    assert.equal(buildChangeApproach(walk.slice(0, 3), transition, { nearBandPts: 5 }), null);
  });

  it("puts a drawing in every row, beside the row's own words, on one stated scale", () => {
    const window = record.slice(-60);
    const html = renderToStaticMarkup(<TrackRecordSection series={window} history={record} />);
    const rows = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    const rowCount = (rows.match(/<tr/g) ?? []).length;
    assert.ok(rowCount > 0);
    assert.equal((rows.match(/data-change-approach/g) ?? []).length, rowCount, "a drawing per row");
    assert.match(textOf(html), new RegExp(`runs ${CHANGE_APPROACH_SCALE_PTS} pts either side of the line`), "the scale is stated");
    const graded = buildRegimeTrackRecord(window);
    const shock = new Map(window.map((month) => [month.recordDate, month.shock === true]));
    for (const change of graded.transitions) {
      assert.ok(textOf(rows).includes(describeAdvanceWarning(change, graded.nearBandPts, shock.get(change.atDate) === true)));
    }
  });
});

describe("room to move is drawn from the rows the table prints", () => {
  it("names the line the paragraph names", () => {
    assert.equal(latitudeConditionLine(), 44);
    assert.ok(describeLatitudeAgainstConditions().includes(`always ${latitudeConditionLine()} or higher`));
  });

  it("puts every row on the chart, oldest first, with its month's link and conditions", () => {
    const track = buildTrackRecord(record);
    assert.ok(track);
    const chart = buildLatitudeChart(track.allRows);
    assert.ok(chart);
    assert.equal(chart.points.length, track.allRows.length);
    assert.deepEqual(chart.points.map((point) => point.value), [...track.allRows].reverse().map((row) => row.boldness));
    assert.equal(chart.line, latitudeConditionLine());
    assert.equal(chart.runs.reduce((sum, run) => sum + run.length, 0), chart.points.length, "the strip covers every month once");
    assert.equal(chart.years[0]?.index, 0);
    const first = chart.points[0];
    assert.equal(first?.href, `/?month=${Number(first?.recordDate.slice(5, 7))}&year=${first?.recordDate.slice(0, 4)}`);
    assert.match(first?.readout ?? "", /^\w{3} \d{4} · Room to move \d+ · (Sunny|Cloudy|Stormy|Freezing)$/);
  });

  it("draws the chart above the folded table, its months as links, its domain stated", () => {
    const track = buildTrackRecord(record);
    assert.ok(track);
    const html = renderToStaticMarkup(<TrackRecordTable record={track} />);
    assert.ok(html.indexOf("data-latitude-chart") < html.indexOf("<details"), "the chart, then the fold");
    assert.equal((html.match(/<a href="\/\?month=\d+&amp;year=\d+" tabindex="-1" aria-label="[^"]+" data-index=/g) ?? []).length, track.allRows.length);
    assert.match(html, /data-latitude-line="44"/);
    assert.match(textOf(html), /Room to move at each month-end, Jan 2012 – \w{3} \d{4}, on its 0–100 scale\. The dashed line is 44/);
  });
});
