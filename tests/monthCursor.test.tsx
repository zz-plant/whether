import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  MONTH_EVENT,
  isMonthKey,
  markMonth,
  monthKeyOf,
  monthOfDetail,
  monthsAfter,
  rangeHoldsMonth,
  recordMonthKeys,
  shiftMonthKey,
  stepMonthKey,
  toMonthKey,
} from "../lib/monthCursor";
import { buildRecordCalendar } from "../lib/report/recordCalendar";
import { buildTrackRecord } from "../lib/report/trackRecord";
import { describeSpellLengths } from "../lib/report/lastTimeCallChanged";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import { ConditionsByYear } from "../app/components/history/conditionsByYear";
import { ConfidenceRecordSummary } from "../app/components/history/confidenceRecord";
import { TrackRecordSection } from "../app/components/history/TrackRecordSection";
import { TrackRecordTable } from "../app/components/history/TrackRecord";
import { SpellLengthPlot } from "../app/components/home/SpellLengthPlot";
import { TrustStrip } from "../app/components/trustStrip";
import { MonthReadoutStrip } from "../app/signals/components/monthReadoutStrip";
import { ConditionCellsPreview } from "../app/signals/components/instrumentPreviews";

/*
 * One month at a time, across every drawing on a page (2026-11-18). A mark that stands
 * for a month carries `data-month="YYYY-MM"` (a stretch, `data-month-from`/`-to`); one
 * listener, mounted beside the record band, marks every drawing's month when any of
 * them is read, and `[` and `]` step through the months the page draws. There is no DOM
 * in this suite, so the arithmetic is tested directly, each drawing is rendered and held
 * to its own links (a mark's month is the month it opens), and the wiring is read from
 * source.
 */

const record = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);

/** Every `data-month` an element carries beside the month its `href` opens. */
const monthsWithLinks = (html: string) =>
  [...html.matchAll(/<a\b[^>]*>/g)].flatMap(([tag]) => {
    const month = /data-month="([^"]+)"/.exec(tag)?.[1];
    const href = /href="[^"]*\?month=(\d+)&amp;year=(\d+)/.exec(tag);
    return month && href ? [{ month, opens: toMonthKey(Number(href[2]), Number(href[1])) }] : [];
  });

describe("the month arithmetic", () => {
  it("keys a month by the record date's year and month, and nothing else", () => {
    assert.equal(toMonthKey(2024, 3), "2024-03");
    assert.equal(monthKeyOf("2024-03-31"), "2024-03");
    assert.equal(monthKeyOf("2024-03"), "2024-03");
    assert.equal(monthKeyOf("Mar 2024"), null);
    assert.equal(monthKeyOf("2024-13-01"), null);
    assert.equal(monthKeyOf(undefined), null);
    assert.ok(isMonthKey("2026-11"));
    assert.ok(!isMonthKey("2026-1"));
  });

  it("moves a month across year ends both ways", () => {
    assert.equal(shiftMonthKey("2024-12", 1), "2025-01");
    assert.equal(shiftMonthKey("2025-01", -1), "2024-12");
    assert.equal(shiftMonthKey("2025-03", 12), "2026-03");
    assert.equal(shiftMonthKey("2025-03", -15), "2023-12");
    assert.equal(monthsAfter("2012-01-31", "2012-01"), 0);
    assert.equal(monthsAfter("2012-01-31", "2013-03"), 14);
  });

  it("holds a month inside a stretch, ends included, and a one-ended stretch as one month", () => {
    assert.ok(rangeHoldsMonth("2022-06", "2022-01", "2022-06"));
    assert.ok(rangeHoldsMonth("2022-01", "2022-01", "2022-06"));
    assert.ok(!rangeHoldsMonth("2022-07", "2022-01", "2022-06"));
    assert.ok(rangeHoldsMonth("2022-03", "2022-03", null));
    assert.ok(!rangeHoldsMonth("2022-04", null, "2022-03"));
    assert.equal(markMonth({ month: "2020-02" }), "2020-02");
    assert.equal(markMonth({ monthFrom: "2020-02", monthTo: "2021-01" }), "2020-02", "a stretch stands for its first month, as its link does");
  });

  it("steps from the latest, to neighbours, and stays at the ends", () => {
    const months = ["2024-05", "2023-01", "2024-05", "2025-02"];
    assert.equal(stepMonthKey(months, null, -1), "2025-02");
    assert.equal(stepMonthKey(months, null, 1), "2025-02");
    assert.equal(stepMonthKey(months, "2025-02", -1), "2024-05");
    assert.equal(stepMonthKey(months, "2024-05", 1), "2025-02");
    assert.equal(stepMonthKey(months, "2023-01", -1), "2023-01");
    assert.equal(stepMonthKey(months, "2025-02", 1), "2025-02");
    assert.equal(stepMonthKey(months, "2024-01", 1), "2024-05", "a month the page does not draw steps to its neighbour");
    assert.equal(stepMonthKey(months, "2024-01", -1), "2023-01");
    assert.equal(stepMonthKey([], null, 1), null);
  });

  it("lists the record band's months from its first date and count", () => {
    assert.deepEqual(recordMonthKeys("2011-11-30", 3), ["2011-11", "2011-12", "2012-01"]);
    assert.deepEqual(recordMonthKeys("", 3), []);
  });

  it("reads an announcement's month and nothing malformed", () => {
    assert.equal(MONTH_EVENT, "whether:month");
    assert.equal(monthOfDetail({ month: "2024-03" }), "2024-03");
    assert.equal(monthOfDetail({ month: null }), null);
    assert.equal(monthOfDetail({ month: "March" }), null);
    assert.equal(monthOfDetail(null), null);
  });
});

describe("each drawing's marks name the month they open", () => {
  it("the year grid on /history: a cell per month-end, keyed by its month", () => {
    const calendar = buildRecordCalendar(record);
    assert.ok(calendar);
    const html = renderToStaticMarkup(<ConditionsByYear calendar={calendar} yearHref={(year) => `/history/${year}`} />);
    const marks = monthsWithLinks(html);
    assert.equal(marks.length, record.length);
    assert.ok(marks.every(({ month, opens }) => month === opens));
    assert.deepEqual(new Set(marks.map(({ month }) => month)), new Set(record.map((entry) => entry.recordDate.slice(0, 7))));
  });

  it("the advance-warning marks and the graded rows: each change's month", () => {
    const summary = monthsWithLinks(renderToStaticMarkup(<ConfidenceRecordSummary />));
    assert.ok(summary.length > 0);
    assert.ok(summary.every(({ month, opens }) => month === opens));
    const section = renderToStaticMarkup(<TrackRecordSection series={record.slice(-60)} history={record} />);
    const rows = monthsWithLinks(section);
    assert.ok(rows.length > 0);
    assert.ok(rows.every(({ month, opens }) => month === opens));
    /* The drawing's last dot is the change month: the row's month is drawn in its row. */
    for (const { month } of rows) assert.match(section, new RegExp(`<circle[^>]*data-month="${month}"`));
  });

  it("the room-to-move chart: a month per column", () => {
    const track = buildTrackRecord(record);
    assert.ok(track);
    const marks = monthsWithLinks(renderToStaticMarkup(<TrackRecordTable record={track} />));
    assert.equal(marks.length, track.allRows.length);
    assert.ok(marks.every(({ month, opens }) => month === opens));
  });

  it("the stretch plot on the brief: a stretch from its first month to its last", () => {
    const described = describeSpellLengths({ series: record, currentRegime: record.at(-1)?.regime ?? "DEFENSIVE", runwayBand: null });
    assert.ok(described?.plot);
    const html = renderToStaticMarkup(<SpellLengthPlot plot={described.plot} />);
    const stretches = [...html.matchAll(/<a\b[^>]*href="[^"]*\?month=(\d+)&amp;year=(\d+)"[^>]*data-month-from="([^"]+)" data-month-to="([^"]+)"/g)];
    assert.equal(stretches.length, described.plot.rows.reduce((sum, row) => sum + row.stretches.length, 0));
    /* Laid end to end, the stretches cover the record once, so each one's last month is the month before the next one's first. */
    const ordered = stretches.map(([, month, year, from, to]) => ({ opens: toMonthKey(Number(year), Number(month)), from, to })).sort((a, b) => (a.from ?? "").localeCompare(b.from ?? ""));
    ordered.forEach(({ opens, from, to }, index) => {
      assert.equal(from, opens);
      const next = ordered[index + 1];
      if (next?.from && to) assert.equal(shiftMonthKey(to, 1), next.from);
    });
    assert.equal(ordered.at(-1)?.to, record.at(-1)?.recordDate.slice(0, 7));
  });

  it("the base-rate squares on /trust", () => {
    const marks = [
      { asOf: "2019-02-28", held: true, label: "Feb 2019: Stormy, held the next month", href: "/?month=2&year=2019" },
      { asOf: "2022-08-31", held: false, label: "Aug 2022: Stormy, changed to Freezing the next month", href: "/?month=8&year=2022" },
    ];
    const html = renderToStaticMarkup(
      <TrustStrip
        recordDateLabel="Nov 16, 2026"
        sourcesLive
        sourcesLabel="Live"
        confidenceLabel="MED"
        margin={{ signal: "riskAppetite", points: 7 }}
        couldChangeNextWeek={false}
        baseRate={{ held: 1, months: 2, marks }}
        basis={{ key: "record", value: "The same data we used for past months", warning: null }}
      />,
    );
    assert.deepEqual(monthsWithLinks(html), [
      { month: "2019-02", opens: "2019-02" },
      { month: "2022-08", opens: "2022-08" },
    ]);
  });

  it("the month rows and previews on /signals, whatever the row is keyed by", () => {
    const html = renderToStaticMarkup(
      <MonthReadoutStrip
        label="Months"
        caption="caption"
        months={[
          { key: "2026-03", label: "Mar 2026", shortLabel: "Mar", yearLabel: "2026", readout: "a", href: "/signals?month=3&year=2026" },
          { key: "2026-04-30", label: "Apr 2026", shortLabel: "Apr", yearLabel: null, readout: "b", href: "/signals?month=4&year=2026" },
          { key: "May 2026", label: "May 2026", shortLabel: "May", yearLabel: null, readout: "c", href: "/signals?month=5&year=2026" },
          { key: "Jun 2026", label: "Jun 2026", shortLabel: "Jun", yearLabel: null, readout: "d", href: null },
        ]}
      />,
    );
    assert.deepEqual(monthsWithLinks(html).map(({ month, opens }) => [month, opens]), [
      ["2026-03", "2026-03"],
      ["2026-04", "2026-04"],
      ["2026-05", "2026-05"],
    ]);
    assert.match(html, /<span data-month="2026-06"/, "a month with no link still stands for its month");
    const cells = renderToStaticMarkup(<ConditionCellsPreview series={[{ year: 2026, month: 9, regime: "DEFENSIVE" }]} />);
    assert.match(cells, /data-month="2026-09"/);
  });
});

describe("one listener, two keys, one stylesheet", () => {
  const source = (path: string) => readFileSync(path, "utf8");

  it("is mounted once, beside the record band, under the header", () => {
    const layout = source("app/layout.tsx");
    assert.match(layout, /<RecordBand \/>[\s\S]{0,200}<MonthCursor \/>/);
    assert.equal(layout.match(/<MonthCursor \/>/g)?.length, 1);
  });

  it("binds [ and ] to step and Escape to let go, and lists them in plain words", () => {
    const shortcuts = source("app/components/KeyboardShortcuts.tsx");
    assert.match(shortcuts, /e\.key === "\[" \|\| e\.key === "\]"/);
    assert.match(shortcuts, /stepPageMonth\(/);
    assert.match(shortcuts, /e\.key === "Escape"[\s\S]{0,120}clearPageMonth\(\)/);
    assert.match(source("app/components/home/HelpModal.tsx"), /\["\[ \]", "Step through the months on this page"\]/);
  });

  it("keeps the client pieces off the data modules", () => {
    for (const path of ["app/components/monthCursor.tsx", "app/components/history/historyReadout.tsx", "app/components/history/latitudeChartReadout.tsx"]) {
      assert.doesNotMatch(source(path), /timeMachineCache|publishedBriefs|report\/recordBand"|regimeHistory/);
    }
    assert.doesNotMatch(source("lib/monthCursor.ts"), /^import /m, "the arithmetic imports nothing");
  });

  it("marks the month in ink, with no motion and no layout", () => {
    const css = source("app/styles/month-active.css");
    assert.match(source("app/styles/components.css"), /@import '\.\/month-active\.css';/);
    const declarations = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([a-z-]+):\s*([^;]+);/g)];
    assert.ok(declarations.length > 0);
    for (const [, property, value] of declarations) {
      assert.match(property ?? "", /^(outline|outline-offset|stroke|stroke-width|color|background-color)$/, `${property} moves or reflows`);
      assert.doesNotMatch(value ?? "", /#|rgb|hsl|oklch/, `${property}: a literal colour`);
    }
  });
});
